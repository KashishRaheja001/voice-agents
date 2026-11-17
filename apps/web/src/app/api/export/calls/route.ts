import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { billableSeconds, pricePerMin } from "@/lib/billing";

// CSV of this workspace's calls with billable time, for invoicing and audits.
// RLS scopes the query to the signed-in user's organization.

const MAX_ROWS = 5000;

// Quote fields and neutralise spreadsheet formulas (=, +, -, @ at the start).
function cell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: calls, error } = await supabase
    .from("calls")
    .select("created_at, call_status, duration, summary, leads ( name, phone )")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) {
    console.error("export calls failed", error);
    return NextResponse.json({ error: "Could not export calls." }, { status: 500 });
  }

  const price = pricePerMin();
  const header = ["Date (UTC)", "Lead", "Phone", "Status", "Duration (s)", "Billable (s)", "Billable (min)", "Amount (INR)", "Summary"];
  const lines = [header.map(cell).join(",")];

  for (const c of calls ?? []) {
    const lead = (Array.isArray(c.leads) ? c.leads[0] : c.leads) as { name?: string; phone?: string } | null;
    const billable = billableSeconds(c.duration);
    const minutes = billable / 60;
    lines.push(
      [
        c.created_at,
        lead?.name,
        lead?.phone,
        c.call_status,
        c.duration ?? 0,
        billable,
        minutes.toFixed(2),
        (minutes * price).toFixed(2),
        (c.summary ?? "").split("\n")[0],
      ]
        .map(cell)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calls-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
