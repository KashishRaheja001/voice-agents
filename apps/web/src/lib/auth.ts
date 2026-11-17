import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Org = {
  id: string;
  name: string;
  agent_name: string;
  language: string;
  dograh_trigger_uuid: string | null;
};

// Returns the signed-in user, their organization and an RLS-scoped client,
// or redirects to /login. Call this at the top of every protected page/action.
export async function requireOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organizations ( id, name, agent_name, language, dograh_trigger_uuid )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const org = (membership?.organizations ?? null) as unknown as Org | null;
  if (!org) redirect("/login?error=no-workspace");

  return { supabase, user, org, role: membership!.role as string };
}
