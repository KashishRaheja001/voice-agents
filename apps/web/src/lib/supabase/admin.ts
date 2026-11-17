import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses Row Level Security. Use ONLY in trusted server
// code that has already authenticated the caller (webhook, signup bootstrap).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
