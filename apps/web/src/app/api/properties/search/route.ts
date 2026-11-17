import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanValue, hasValidWebhookSecret } from "@/lib/dograh";

// Tool endpoint the voice agent calls mid-call to look up the customer's projects.
// Authenticated with the shared secret; scoped to the org id passed by the agent.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const describe = (p: {
  project_name: string;
  builder: string | null;
  location: string;
  configurations: string | null;
  price_range: string | null;
}) =>
  `- ${p.project_name}${p.builder ? ` by ${p.builder}` : ""} in ${p.location} (${p.configurations ?? "configurations not listed"}, price: ${p.price_range ?? "not listed"})`;

export async function POST(req: Request) {
  if (!hasValidWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orgId = cleanValue(body.org_id);
  if (!orgId || !UUID.test(orgId)) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const location = cleanValue(body.location);
  const configuration = cleanValue(body.configuration);
  const bhk = configuration?.match(/\d/)?.[0];

  const admin = createAdminClient();
  let query = admin.from("properties").select("*").eq("org_id", orgId).limit(3);
  // Strip LIKE wildcards from caller-provided text.
  if (location) query = query.ilike("location", `%${location.replace(/[%_]/g, "")}%`);
  if (bhk) query = query.ilike("configurations", `%${bhk}%BHK%`);

  const { data, error } = await query;
  if (error) {
    console.error("property search failed", error);
    return NextResponse.json({ result: "Property search is unavailable right now. Offer a callback from the manager." });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      result:
        "No matching project found. Do not invent one. Say you will have the manager call back with options, and ask for a good time.",
    });
  }

  return NextResponse.json({
    result: `Matching projects (quote only these facts, nothing else):\n${data.map(describe).join("\n")}`,
  });
}
