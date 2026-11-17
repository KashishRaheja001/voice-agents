import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanValue, hasValidWebhookSecret } from "@/lib/dograh";
import { classify } from "@/lib/classify";
import { nextCallAt } from "@/lib/retry";

// Receives the Dograh webhook node POST after each call. The payload template to
// configure in Dograh is documented in docs/dograh-integration.md.

const truthy = (v: string | null) => v !== null && /^(true|yes|1)$/i.test(v);

async function fetchTranscript(url: string | null) {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!hasValidWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const runId = cleanValue(payload.run_id);
  const leadId = cleanValue(payload.lead_id);
  if (!runId || !leadId) {
    return NextResponse.json({ error: "run_id and lead_id are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // The org is taken from the lead row, never from the payload.
  const { data: lead } = await admin.from("leads").select("id, org_id").eq("id", leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Unknown lead" }, { status: 404 });

  const interest = cleanValue(payload.interest);
  const visitSlot = cleanValue(payload.visit_slot);
  const doNotCall = truthy(cleanValue(payload.do_not_call));
  const duration = Number.parseInt(cleanValue(payload.duration) ?? "", 10);
  const durationSeconds = Number.isFinite(duration) ? duration : null;
  const classification = classify(interest, visitSlot, doNotCall, durationSeconds);
  const transcript = (await fetchTranscript(cleanValue(payload.transcript_url))) ?? cleanValue(payload.transcript);

  const extracted = {
    interest,
    budget: cleanValue(payload.budget),
    configuration: cleanValue(payload.configuration),
    location: cleanValue(payload.location),
    timeline: cleanValue(payload.timeline),
    purpose: cleanValue(payload.purpose),
    visit_slot: visitSlot,
    do_not_call: doNotCall,
  };

  let summary = cleanValue(payload.summary) ?? "Call completed.";
  const lines = Object.entries(extracted)
    .filter(([k, v]) => v !== null && v !== false && k !== "do_not_call")
    .map(([k, v]) => `- ${k.replace("_", " ")}: ${v}`);
  if (lines.length) summary += `\n\nEXTRACTED:\n${lines.join("\n")}`;

  const { error: callError } = await admin.from("calls").upsert(
    {
      org_id: lead.org_id,
      lead_id: lead.id,
      dograh_run_id: runId,
      call_status: classification.status === "No Answer" ? "No Answer" : "Completed",
      summary,
      transcript,
      recording_url: cleanValue(payload.recording),
      duration: Number.isFinite(duration) ? duration : null,
      extracted,
    },
    { onConflict: "org_id,dograh_run_id" }
  );
  if (callError) {
    console.error("webhook: call upsert failed", callError);
    return NextResponse.json({ error: "Could not store call" }, { status: 500 });
  }

  const leadUpdate: Record<string, unknown> = { ...classification };
  if (doNotCall) leadUpdate.do_not_call = true;
  if (extracted.budget) leadUpdate.budget = extracted.budget;
  if (extracted.configuration) leadUpdate.property_type = extracted.configuration;
  if (extracted.location) leadUpdate.preferred_location = extracted.location;
  if (extracted.timeline) leadUpdate.timeline = extracted.timeline;
  if (extracted.purpose) leadUpdate.purpose = extracted.purpose;

  // Suggest when to retry. next_call_at exists only after supabase/003_retry_scheduling.sql,
  // so fall back to a plain update if the column is missing (Postgres error 42703).
  const retryAt = nextCallAt(classification.status);
  let { error: leadError } = await admin
    .from("leads")
    .update({ ...leadUpdate, next_call_at: retryAt ? retryAt.toISOString() : null })
    .eq("id", lead.id)
    .eq("org_id", lead.org_id);
  if (leadError?.code === "42703") {
    ({ error: leadError } = await admin.from("leads").update(leadUpdate).eq("id", lead.id).eq("org_id", lead.org_id));
  }
  if (leadError) {
    console.error("webhook: lead update failed", leadError);
    return NextResponse.json({ error: "Could not update lead" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
