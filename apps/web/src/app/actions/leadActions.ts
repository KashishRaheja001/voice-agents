"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";
import { normalizeIndianPhone } from "@/lib/phone";
import { csvToLeadRows } from "@/lib/csv";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim() || null;

export async function addLead(formData: FormData) {
  const { supabase, org } = await requireOrg();

  const name = text(formData, "name");
  const rawPhone = text(formData, "phone");
  if (!name || !rawPhone) return { error: "Name and Phone are required." };

  const phone = normalizeIndianPhone(rawPhone);
  if (!phone) return { error: "Enter a valid 10-digit Indian mobile number." };

  const { data, error } = await supabase
    .from("leads")
    .insert({
      org_id: org.id,
      name,
      phone,
      email: text(formData, "email"),
      budget: text(formData, "budget"),
      property_type: text(formData, "property_type"),
      preferred_location: text(formData, "preferred_location"),
      timeline: text(formData, "timeline"),
      purpose: text(formData, "purpose"),
      consent_source: "added manually in dashboard",
      status: "New",
      interest_level: "Pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "A lead with this phone number already exists." };
    console.error("Error adding lead:", error);
    return { error: "Could not save the lead." };
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true, lead: data };
}

const MAX_IMPORT_ROWS = 1000;

// Bulk import from CSV text. The user must confirm the leads gave consent; the
// consent source is stored on every lead (see docs/compliance.md).
export async function importLeads(formData: FormData) {
  const { supabase, org } = await requireOrg();

  if (formData.get("consent") !== "on") {
    return { error: "Confirm that these leads gave consent to be called." };
  }
  const consentSource = text(formData, "consent_source");
  if (!consentSource) return { error: "Say where these leads came from (e.g. 99acres enquiries)." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 2_000_000) return { error: "File is too large (max 2 MB)." };

  const rows = csvToLeadRows(await file.text());
  if (rows.length === 0) return { error: "No rows found. The first row must be a header with Name and Phone." };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Too many rows (max ${MAX_IMPORT_ROWS} per import).` };

  const seen = new Set<string>();
  const valid: Record<string, unknown>[] = [];
  const invalid: string[] = [];
  let duplicatesInFile = 0;

  rows.forEach((r, idx) => {
    const phone = r.phone ? normalizeIndianPhone(r.phone) : null;
    if (!r.name || !phone) {
      invalid.push(`Row ${idx + 2}: ${!r.name ? "missing name" : "invalid phone"}`);
      return;
    }
    if (seen.has(phone)) {
      duplicatesInFile++;
      return;
    }
    seen.add(phone);
    valid.push({
      org_id: org.id,
      name: r.name,
      phone,
      email: r.email ?? null,
      budget: r.budget ?? null,
      property_type: r.property_type ?? null,
      preferred_location: r.preferred_location ?? null,
      timeline: r.timeline ?? null,
      purpose: r.purpose ?? null,
      consent_source: `import: ${consentSource}`,
      status: "New",
      interest_level: "Pending",
    });
  });

  let inserted = 0;
  if (valid.length) {
    // ignoreDuplicates skips numbers already in this workspace instead of failing.
    const { data, error } = await supabase
      .from("leads")
      .upsert(valid, { onConflict: "org_id,phone", ignoreDuplicates: true })
      .select("id");
    if (error) {
      console.error("Error importing leads:", error);
      return { error: "Could not import the leads." };
    }
    inserted = data?.length ?? 0;
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return {
    success: true,
    inserted,
    alreadyExisted: valid.length - inserted,
    duplicatesInFile,
    invalid: invalid.slice(0, 10),
    invalidCount: invalid.length,
  };
}

// Manual opt-out (or undo). RLS limits this to the signed-in user's own leads.
export async function setDoNotCall(id: string, value: boolean) {
  const { supabase } = await requireOrg();
  const { error } = await supabase.from("leads").update({ do_not_call: value }).eq("id", id);
  if (error) return { error: "Could not update the lead." };
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  return { success: true };
}

export async function deleteLead(id: string) {
  const { supabase } = await requireOrg();

  // Calls cascade-delete with the lead (see supabase/001_multitenant.sql).
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { error: "Could not delete the lead." };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}
