"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthState = { error?: string; message?: string } | undefined;

// Only allow same-site relative paths after login.
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect email or password." };

  redirect(safeNext(formData.get("next")));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const company = String(formData.get("company") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!company || !email || !password) return { error: "All fields are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  const user = data.user;
  if (!user) return { error: "Could not create the account. Try again." };

  // Supabase returns a user with no identities when the email is already registered.
  if (user.identities && user.identities.length === 0) {
    return { error: "An account with this email already exists. Log in instead." };
  }

  // Create the workspace and owner membership with the service role.
  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: company })
    .select("id")
    .single();
  if (orgError || !org) {
    console.error("signup: org create failed", orgError);
    return { error: "Could not set up your workspace. Contact support." };
  }
  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" });
  if (memberError) {
    console.error("signup: membership failed", memberError);
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: "Could not set up your workspace. Contact support." };
  }

  // With email confirmation on, there is no session yet.
  if (!data.session) {
    return { message: "Check your email to confirm your account, then log in." };
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
