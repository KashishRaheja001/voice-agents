import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOGRAH_API_URL } from "@/lib/dograh";
import { normalizeIndianPhone } from "@/lib/phone";
import {
  defaultMonthlyMinutesLimit,
  maxAttemptsPerLead,
  startOfMonthIst,
  totalBillableMinutes,
} from "@/lib/billing";
import { callingHoursMessage, isWithinCallingHours } from "@/lib/calling-hours";

// A call stuck in "Calling..." longer than this is treated as lost and may be retried.
const IN_FLIGHT_WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { leadId } = await req.json().catch(() => ({}));
  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
  }

  const apiKey = process.env.DOGRAH_API_KEY;
  if (!apiKey) {
    console.error("DOGRAH_API_KEY is not set");
    return NextResponse.json({ error: "Calling is not configured on the server." }, { status: 500 });
  }

  // RLS: these reads only succeed for the signed-in user's own organization.
  const { data: membership } = await supabase
    .from("org_members")
    .select("organizations ( id, name, agent_name, dograh_trigger_uuid )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const org = membership?.organizations as unknown as
    | { id: string; name: string; agent_name: string; dograh_trigger_uuid: string | null }
    | null;
  if (!org) return NextResponse.json({ error: "No workspace found" }, { status: 403 });
  if (!org.dograh_trigger_uuid) {
    return NextResponse.json(
      { error: "Calling agent is not set up yet. Add the agent trigger ID in Settings." },
      { status: 400 }
    );
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, name, phone, budget, property_type, preferred_location, timeline, do_not_call")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.do_not_call) {
    return NextResponse.json({ error: "This lead asked not to be called." }, { status: 409 });
  }

  if (!isWithinCallingHours()) {
    return NextResponse.json({ error: callingHoursMessage() }, { status: 403 });
  }

  const phone = normalizeIndianPhone(lead.phone);
  if (!phone) {
    return NextResponse.json({ error: "This lead's phone number is not a valid Indian number." }, { status: 400 });
  }

  // Don't start a second call while one is still in flight (double click, retry).
  const since = new Date(Date.now() - IN_FLIGHT_WINDOW_MS).toISOString();
  const { data: inFlight } = await supabase
    .from("calls")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("call_status", "Calling...")
    .gte("created_at", since)
    .limit(1);
  if (inFlight && inFlight.length > 0) {
    return NextResponse.json({ error: "A call to this lead is already in progress." }, { status: 409 });
  }

  // Cost controls: stop re-calling the same lead forever, and cap monthly minutes.
  const maxAttempts = maxAttemptsPerLead();
  if (maxAttempts > 0) {
    const { count: attempts } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id);
    if ((attempts ?? 0) >= maxAttempts) {
      return NextResponse.json(
        { error: `This lead has already been called ${maxAttempts} times.` },
        { status: 409 }
      );
    }
  }

  // monthly_minutes_limit only exists after supabase/002_usage_limits.sql; tolerate its absence.
  const { data: limitRow } = await supabase
    .from("organizations")
    .select("monthly_minutes_limit")
    .eq("id", org.id)
    .maybeSingle();
  const monthlyLimit =
    (limitRow as { monthly_minutes_limit: number | null } | null)?.monthly_minutes_limit ??
    defaultMonthlyMinutesLimit();
  if (monthlyLimit > 0) {
    const { data: monthCalls } = await supabase
      .from("calls")
      .select("duration")
      .eq("org_id", org.id)
      .gte("created_at", startOfMonthIst());
    const used = totalBillableMinutes((monthCalls ?? []).map((c) => c.duration));
    if (used >= monthlyLimit) {
      return NextResponse.json(
        { error: "Monthly calling limit reached. Contact support to raise it." },
        { status: 402 }
      );
    }
  }

  let dograhRes: Response;
  try {
    dograhRes = await fetch(`${DOGRAH_API_URL}/public/agent/${org.dograh_trigger_uuid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
      phone_number: phone,
      initial_context: {
        org_id: org.id,
        lead_id: lead.id,
        lead_name: lead.name,
        company_name: org.name,
        agent_name: org.agent_name,
        budget: lead.budget ?? "",
        property_type: lead.property_type ?? "",
        preferred_location: lead.preferred_location ?? "",
        timeline: lead.timeline ?? "",
      },
      }),
    });
  } catch (err) {
    console.error("Dograh call request failed", err);
    return NextResponse.json({ error: "Calling service did not respond. Please try again." }, { status: 504 });
  }

  if (!dograhRes.ok) {
    const detail = await dograhRes.text().catch(() => "");
    console.error("Dograh call error", dograhRes.status, detail);
    const message =
      dograhRes.status === 402
        ? "Calling credits exhausted. Contact support."
        : "Could not start the call. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const data = await dograhRes.json();
  const runId = data.workflow_run_id != null ? String(data.workflow_run_id) : null;

  await supabase.from("leads").update({ status: "Calling..." }).eq("id", lead.id);
  if (runId) {
    await supabase.from("calls").upsert(
      {
        org_id: org.id,
        lead_id: lead.id,
        dograh_run_id: runId,
        call_status: "Calling...",
        summary: "Call in progress...",
      },
      { onConflict: "org_id,dograh_run_id" }
    );
  }

  return NextResponse.json({ success: true, runId });
}
