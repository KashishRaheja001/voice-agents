// End-to-end check against a LOCAL Supabase and a running dev server, with a mock
// Dograh API. Never touches real Supabase, Dograh or phone numbers.
//
// Required env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, APP_URL
// Optional env: MOCK_PORT (4010), DOGRAH_WEBHOOK_SECRET (localtest), DOGRAH_API_KEY (testkey)
//
// The dev server must run with:
//   DOGRAH_API_URL=http://localhost:4010/api/v1 DOGRAH_API_KEY=testkey
//   DOGRAH_WEBHOOK_SECRET=localtest CALLING_HOURS_ENFORCED=false MAX_ATTEMPTS_PER_LEAD=2
// Pass --hours-blocked when the dev server runs with CALLING_HOURS_START=5 CALLING_HOURS_END=5
// to check the calling-hours guard instead.

import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const env = (k, d) => process.env[k] ?? d;
const SUPABASE_URL = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const SERVICE = env("SUPABASE_SERVICE_KEY");
const APP = env("APP_URL", "http://localhost:3100");
const MOCK_PORT = Number(env("MOCK_PORT", "4010"));
const SECRET = env("DOGRAH_WEBHOOK_SECRET", "localtest");
const API_KEY = env("DOGRAH_API_KEY", "testkey");
const HOURS_MODE = process.argv.includes("--hours-blocked");
if (!SUPABASE_URL || !ANON || !SERVICE) throw new Error("Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY");

// ---- tiny test runner
let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
}
function eq(actual, expected, what = "value") {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function ok(cond, what) {
  if (!cond) throw new Error(what);
}

// ---- mock Dograh
const mockCalls = [];
let nextRun = 1001;
const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const m = req.url.match(/^\/api\/v1\/public\/agent\/([\w-]+)$/);
    if (req.method === "POST" && m) {
      const parsed = JSON.parse(body || "{}");
      mockCalls.push({ uuid: m[1], key: req.headers["x-api-key"], body: parsed });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ workflow_run_id: nextRun++ }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
});
await new Promise((r) => mock.listen(MOCK_PORT, r));

// ---- supabase helpers
const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
const stamp = Date.now();

async function makeOrg(label, triggerUuid) {
  const email = `${label}-${stamp}@example.test`;
  const password = "Passw0rd!test";
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (ue) throw ue;
  const { data: org, error: oe } = await admin
    .from("organizations")
    .insert({ name: `${label} Realty`, dograh_trigger_uuid: triggerUuid })
    .select("id, name")
    .single();
  if (oe) throw oe;
  const { error: me } = await admin.from("org_members").insert({ org_id: org.id, user_id: u.user.id, role: "owner" });
  if (me) throw me;
  return { email, password, org, userId: u.user.id };
}

// Signs in the same way the app does and returns a Cookie header plus a user client.
async function signIn({ email, password }) {
  const jar = new Map();
  const client = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
  return { client, cookie };
}

async function addLead(orgId, fields) {
  const { data, error } = await admin
    .from("leads")
    .insert({ org_id: orgId, consent_source: "e2e", ...fields })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

const api = (path, { method = "GET", cookie, json, headers = {} } = {}) =>
  fetch(APP + path, {
    method,
    redirect: "manual",
    headers: { ...(cookie ? { cookie } : {}), ...(json ? { "content-type": "application/json" } : {}), ...headers },
    body: json ? JSON.stringify(json) : undefined,
  });

const callLead = (cookie, leadId) => api("/api/call", { method: "POST", cookie, json: { leadId } });
const webhook = (payload, secret = SECRET) =>
  api("/api/webhook/dograh", { method: "POST", json: payload, headers: secret ? { "x-webhook-secret": secret } : {} });
const getLead = async (id) => (await admin.from("leads").select("*").eq("id", id).single()).data;
const getCallByRun = async (run) => (await admin.from("calls").select("*").eq("dograh_run_id", String(run))).data;

// ---- scenario
const TRIGGER = "11111111-2222-3333-4444-555555555555";
const o1 = await makeOrg("alpha", TRIGGER);
const s1 = await signIn(o1);

if (HOURS_MODE) {
  const lead = await addLead(o1.org.id, { name: "Hours Test", phone: "+919876500001" });
  await test("calling-hours guard blocks the call with a clear message", async () => {
    const res = await callLead(s1.cookie, lead.id);
    eq(res.status, 403, "status");
    const j = await res.json();
    ok(/only allowed between/.test(j.error), `message was ${j.error}`);
    eq(mockCalls.length, 0, "dograh calls made");
  });
  finish();
}

const A = await addLead(o1.org.id, { name: "Rohan Mehta", phone: "+919876543210", budget: "75 lakh", property_type: "3 BHK", preferred_location: "Gurgaon" });
const B = await addLead(o1.org.id, { name: "Do Not Call Dev", phone: "+919876543211", do_not_call: true });
const C = await addLead(o1.org.id, { name: "No Answer Nina", phone: "+919876543212" });
const D = await addLead(o1.org.id, { name: "Opt Out Om", phone: "+919876543213" });
const E = await addLead(o1.org.id, { name: "Limit Lata", phone: "+919876543214" });
await addLead(o1.org.id, { name: "Due Dinesh", phone: "+919876543215", status: "No Answer", next_call_at: new Date(Date.now() - 3600_000).toISOString() });
const INJ = await addLead(o1.org.id, { name: '=HYPERLINK("http://evil.test","x")', phone: "+919876543216" });

await test("unauthenticated /api/call is rejected", async () => {
  eq((await callLead(null, A.id)).status, 401, "status");
});

await test("call: sends the right payload to Dograh and marks the lead Calling", async () => {
  const res = await callLead(s1.cookie, A.id);
  eq(res.status, 200, "status");
  const j = await res.json();
  eq(j.runId, "1001", "runId");
  const m = mockCalls.at(-1);
  eq(m.uuid, TRIGGER, "trigger uuid");
  eq(m.key, API_KEY, "api key header");
  eq(m.body.phone_number, "+919876543210", "phone");
  eq(m.body.initial_context.lead_name, "Rohan Mehta", "lead_name");
  eq(m.body.initial_context.company_name, "alpha Realty", "company_name");
  eq(m.body.initial_context.org_id, o1.org.id, "org_id");
  eq(m.body.initial_context.lead_id, A.id, "lead_id");
  eq((await getLead(A.id)).status, "Calling...", "lead status");
  eq((await getCallByRun(1001)).length, 1, "call rows");
});

await test("double call while in flight is blocked (409)", async () => {
  const before = mockCalls.length;
  eq((await callLead(s1.cookie, A.id)).status, 409, "status");
  eq(mockCalls.length, before, "dograh calls made");
});

await test("do-not-call lead is blocked and Dograh is not called", async () => {
  const before = mockCalls.length;
  eq((await callLead(s1.cookie, B.id)).status, 409, "status");
  eq(mockCalls.length, before, "dograh calls made");
});

await test("webhook rejects missing and wrong secrets", async () => {
  eq((await webhook({ run_id: "1001", lead_id: A.id }, null)).status, 401, "no secret");
  eq((await webhook({ run_id: "1001", lead_id: A.id }, "wrong")).status, 401, "wrong secret");
});

await test("webhook validates ids and unknown leads", async () => {
  eq((await webhook({ run_id: "{{workflow_run_id}}", lead_id: "{{initial_context.lead_id}}" })).status, 400, "unresolved template");
  eq((await webhook({ run_id: "9", lead_id: "00000000-0000-0000-0000-000000000000" })).status, 404, "unknown lead");
});

await test("webhook: site visit booked -> Site Visit / High, details saved, billable stored", async () => {
  const res = await webhook({
    run_id: "1001", lead_id: A.id, interest: "yes", visit_slot: "Saturday 4pm", budget: "80 lakh",
    configuration: "3 BHK", location: "Sohna Road", timeline: "3 months", purpose: "end use",
    do_not_call: "false", recording: "https://example.test/rec.mp3", duration: "125",
  });
  eq(res.status, 200, "status");
  const lead = await getLead(A.id);
  eq(lead.status, "Site Visit", "status");
  eq(lead.interest_level, "High", "interest");
  eq(lead.budget, "80 lakh", "budget");
  eq(lead.preferred_location, "Sohna Road", "location");
  eq(lead.next_call_at, null, "next_call_at");
  const [call] = await getCallByRun(1001);
  eq(call.call_status, "Completed", "call status");
  eq(call.duration, 125, "duration");
  eq(call.recording_url, "https://example.test/rec.mp3", "recording");
  eq(call.extracted.visit_slot, "Saturday 4pm", "extracted");
});

await test("webhook is idempotent (same run twice = one call row)", async () => {
  const res = await webhook({ run_id: "1001", lead_id: A.id, interest: "yes", visit_slot: "Saturday 4pm", duration: "125" });
  eq(res.status, 200, "status");
  eq((await getCallByRun(1001)).length, 1, "call rows");
});

await test("second attempt works, 'call later' -> Follow Up with a retry time inside 9-21 IST", async () => {
  const res = await callLead(s1.cookie, A.id);
  eq(res.status, 200, "second call status");
  const run = (await res.json()).runId;
  eq((await webhook({ run_id: run, lead_id: A.id, interest: "call later", duration: "40" })).status, 200, "webhook");
  const lead = await getLead(A.id);
  eq(lead.status, "Follow Up", "status");
  ok(lead.next_call_at, "next_call_at should be set");
  const istHour = new Date(new Date(lead.next_call_at).getTime() + 330 * 60_000).getUTCHours();
  ok(istHour >= 9 && istHour < 21, `retry hour ${istHour} IST outside 9-21`);
  ok(new Date(lead.next_call_at) > new Date(), "retry time should be in the future");
});

await test("attempt cap: third call to the same lead is blocked (MAX_ATTEMPTS_PER_LEAD=2)", async () => {
  const before = mockCalls.length;
  const res = await callLead(s1.cookie, A.id);
  eq(res.status, 409, "status");
  ok(/already been called/.test((await res.json()).error), "message");
  eq(mockCalls.length, before, "dograh calls made");
});

await test("short empty call -> No Answer with a retry suggestion", async () => {
  const res = await callLead(s1.cookie, C.id);
  eq(res.status, 200, "call");
  const run = (await res.json()).runId;
  eq((await webhook({ run_id: run, lead_id: C.id, duration: "3" })).status, 200, "webhook");
  const lead = await getLead(C.id);
  eq(lead.status, "No Answer", "status");
  ok(lead.next_call_at, "next_call_at");
  eq((await getCallByRun(run))[0].call_status, "No Answer", "call status");
});

await test("opt-out on the call: do_not_call flows through and blocks further calls", async () => {
  const res = await callLead(s1.cookie, D.id);
  eq(res.status, 200, "call");
  const run = (await res.json()).runId;
  eq((await webhook({ run_id: run, lead_id: D.id, do_not_call: "true", duration: "20" })).status, 200, "webhook");
  const lead = await getLead(D.id);
  eq(lead.do_not_call, true, "do_not_call");
  eq(lead.status, "Not Interested", "status");
  eq((await callLead(s1.cookie, D.id)).status, 409, "further call");
});

await test("monthly minute limit blocks calls with 402, and lifts when raised", async () => {
  await admin.from("organizations").update({ monthly_minutes_limit: 1 }).eq("id", o1.org.id);
  const before = mockCalls.length;
  eq((await callLead(s1.cookie, E.id)).status, 402, "status when over limit");
  eq(mockCalls.length, before, "dograh calls made");
  await admin.from("organizations").update({ monthly_minutes_limit: 10000 }).eq("id", o1.org.id);
  eq((await callLead(s1.cookie, E.id)).status, 200, "status after raising the limit");
});

await test("CSV export: billable rounding, amount, and formula-injection escaping", async () => {
  await admin.from("calls").insert({
    org_id: o1.org.id, lead_id: INJ.id, dograh_run_id: "inj-1", call_status: "Completed", duration: 31, summary: "=1+1",
  });
  const res = await api("/api/export/calls", { cookie: s1.cookie });
  eq(res.status, 200, "status");
  ok((res.headers.get("content-type") ?? "").startsWith("text/csv"), "content type");
  const text = await res.text();
  ok(text.startsWith('"Date (UTC)"'), "header row");
  ok(text.includes('"Rohan Mehta"') && text.includes('"125","150","2.50","7.50"'), "125s bills as 150s = 2.5 min = INR 7.50");
  ok(text.includes(`"'=HYPERLINK(`), "lead name formula is neutralised");
  ok(text.includes('"31","60","1.00","3.00"'), "31s bills as 60s");
  ok(!/(^|,)"=/.test(text), "no cell starts with =");
});

await test("pages render for a signed-in user (dashboard, leads, lead detail)", async () => {
  const dash = await api("/dashboard", { cookie: s1.cookie });
  eq(dash.status, 200, "dashboard status");
  const html = await dash.text();
  ok(html.includes("Billable minutes"), "usage card");
  ok(html.includes("Download calls as CSV"), "csv link");
  ok(html.includes("Due for a retry") && html.includes("Due Dinesh"), "retry list shows the overdue lead");
  eq((await api("/leads", { cookie: s1.cookie })).status, 200, "leads status");
  const detail = await api(`/leads/${A.id}`, { cookie: s1.cookie });
  eq(detail.status, 200, "detail status");
  const dh = await detail.text();
  ok(dh.includes("Call with AI") && dh.includes("Mark Do Not Call"), "lead action buttons");
  eq((await api("/dashboard")).status, 307, "unauthenticated redirect");
});

await test("Site Visits page lists booked visits with the slot; leads page has search and bulk controls", async () => {
  const G = await addLead(o1.org.id, { name: "Visit Vandana", phone: "+919876543217", budget: "1.2 crore" });
  const res = await callLead(s1.cookie, G.id);
  eq(res.status, 200, "call");
  const run = (await res.json()).runId;
  eq((await webhook({ run_id: run, lead_id: G.id, interest: "yes", visit_slot: "Sunday 11am", duration: "95" })).status, 200, "webhook");
  const visits = await api("/visits", { cookie: s1.cookie });
  eq(visits.status, 200, "visits status");
  const vh = await visits.text();
  ok(vh.includes("Visit Vandana") && vh.includes("Sunday 11am") && vh.includes("1.2 crore"), "visit card content");
  ok(vh.includes(`tel:${G.phone}`), "tap-to-call link");
  ok(!vh.includes("Opt Out Om"), "non-visit leads are not listed");
  const leadsHtml = await (await api("/leads", { cookie: s1.cookie })).text();
  ok(leadsHtml.includes("Search by name or phone") && leadsHtml.includes("Filter by status"), "search and filter controls");
});

await test("CSV import semantics: duplicates are skipped, only new rows are returned", async () => {
  const { data, error } = await s1.client
    .from("leads")
    .upsert(
      [
        { org_id: o1.org.id, name: "Dup", phone: "+919876543210", consent_source: "import: e2e" },
        { org_id: o1.org.id, name: "Fresh", phone: "+919876549999", consent_source: "import: e2e" },
      ],
      { onConflict: "org_id,phone", ignoreDuplicates: true }
    )
    .select("id");
  ok(!error, `upsert error ${error?.message}`);
  eq(data.length, 1, "inserted rows");
  eq((await getLead(A.id)).name, "Rohan Mehta", "existing lead untouched");
});

// ---- tenant isolation
const o2 = await makeOrg("beta", "99999999-2222-3333-4444-555555555555");
const s2 = await signIn(o2);
await addLead(o2.org.id, { name: "Beta Only Lead", phone: "+919000000001" });

await test("RLS: another workspace cannot read, update or call our leads", async () => {
  const { data: seen } = await s2.client.from("leads").select("id, name");
  ok(seen.every((l) => l.name === "Beta Only Lead"), "user 2 sees only their own leads");
  const { data: upd } = await s2.client.from("leads").update({ do_not_call: true }).eq("id", A.id).select();
  eq(upd.length, 0, "rows updated across tenants");
  const before = mockCalls.length;
  eq((await callLead(s2.cookie, A.id)).status, 404, "cross-tenant call");
  eq(mockCalls.length, before, "dograh calls made");
  const csv = await (await api("/api/export/calls", { cookie: s2.cookie })).text();
  ok(!csv.includes("Rohan Mehta"), "csv leaks another tenant's data");
  const otherVisits = await (await api("/visits", { cookie: s2.cookie })).text();
  ok(!otherVisits.includes("Visit Vandana"), "site visits leak across workspaces");
});

finish();

function finish() {
  console.log(`\n${passed} passed, ${failed} failed`);
  mock.close();
  process.exit(failed ? 1 : 0);
}
