"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";

export type SettingsState = { error?: string; saved?: boolean } | undefined;

const LANGUAGES = ["hinglish", "hindi", "english"];
const TRIGGER_UUID = /^[0-9a-zA-Z-]{8,64}$/;

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, org, role } = await requireOrg();
  if (role !== "owner") return { error: "Only the workspace owner can change settings." };

  const name = String(formData.get("name") ?? "").trim();
  const agent_name = String(formData.get("agent_name") ?? "").trim();
  const language = String(formData.get("language") ?? "hinglish");
  const trigger = String(formData.get("dograh_trigger_uuid") ?? "").trim();

  if (!name || !agent_name) return { error: "Company name and agent name are required." };
  if (!LANGUAGES.includes(language)) return { error: "Choose a valid language." };
  if (trigger && !TRIGGER_UUID.test(trigger)) return { error: "The agent trigger ID looks invalid." };

  const { error } = await supabase
    .from("organizations")
    .update({ name, agent_name, language, dograh_trigger_uuid: trigger || null })
    .eq("id", org.id);
  if (error) return { error: "Could not save settings." };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { saved: true };
}
