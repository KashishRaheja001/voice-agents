"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim() || null;

export async function addProperty(formData: FormData) {
  const { supabase, org } = await requireOrg();

  const project_name = text(formData, "project_name");
  const location = text(formData, "location");
  if (!project_name || !location) return { error: "Project Name and Location are required." };

  const { data, error } = await supabase
    .from("properties")
    .insert({
      org_id: org.id,
      project_name,
      location,
      builder: text(formData, "builder"),
      description: text(formData, "description"),
      price_range: text(formData, "price_range"),
      configurations: text(formData, "configurations"),
      amenities: text(formData, "amenities"),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding property:", error);
    return { error: "Could not save the property." };
  }

  revalidatePath("/properties");
  return { success: true, property: data };
}

export async function deleteProperty(id: string) {
  const { supabase } = await requireOrg();

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { error: "Could not delete the property." };

  revalidatePath("/properties");
  return { success: true };
}

export async function updateProperty(id: string, formData: FormData) {
  const { supabase } = await requireOrg();

  const project_name = text(formData, "project_name");
  const location = text(formData, "location");
  if (!project_name || !location) return { error: "Project name and location are required" };

  const { error } = await supabase
    .from("properties")
    .update({
      project_name,
      location,
      builder: text(formData, "builder"),
      description: text(formData, "description"),
      price_range: text(formData, "price_range"),
      configurations: text(formData, "configurations"),
    })
    .eq("id", id);

  if (error) return { error: "Could not update the property." };
  revalidatePath("/properties");
  return { success: true };
}

