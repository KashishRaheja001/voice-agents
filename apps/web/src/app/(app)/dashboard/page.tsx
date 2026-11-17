import { requireOrg } from "@/lib/auth";
import Link from "next/link";
import { format } from "date-fns";
import { pricePerMin, startOfMonthIst, totalBillableMinutes } from "@/lib/billing";

export default async function DashboardPage() {
  const { supabase } = await requireOrg();
  // Fetch stats from Supabase
  const { count: totalCalls } = await supabase.from("calls").select("*", { count: "exact", head: true });
  
  // For 'today', we'll get the start of the day in ISO
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const { count: todaysCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());

  const { count: interestedLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .or('interest_level.eq.High,status.eq.Interested');

  const { count: lostLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("interest_level", "Lost");

  const { count: followupLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "Follow Up");

  // Fetch recent calls to display a small list with detailed lead info
  const { data: recentCalls } = await supabase
    .from("calls")
    .select(`
      id,
      created_at,
      call_status,
      duration,
      summary,
      leads ( id, name, phone, interest_level, status )
    `)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: monthCalls } = await supabase
    .from("calls")
    .select("duration")
    .gte("created_at", startOfMonthIst());
  const usedMinutes = totalBillableMinutes((monthCalls ?? []).map((c) => c.duration));
  const avgSeconds =
    (monthCalls ?? []).reduce((s, c) => s + (Number(c.duration) || 0), 0) / Math.max(monthCalls?.length ?? 0, 1);

  // Leads whose suggested retry time has passed. Needs supabase/003_retry_scheduling.sql;
  // if the column is missing the query errors and the card simply stays hidden.
  const { data: dueLeads } = await supabase
    .from("leads")
    .select("id, name, phone, status, next_call_at")
    .lte("next_call_at", new Date().toISOString())
    .eq("do_not_call", false)
    .in("status", ["No Answer", "Follow Up"])
    .order("next_call_at", { ascending: true })
    .limit(6);

  const totalContacted = (interestedLeads || 0) + (lostLeads || 0) + (followupLeads || 0);
  const conversionRate = totalContacted > 0 ? Math.round(((interestedLeads || 0) / totalContacted) * 100) : 0;

  return (
    <div className="space-y-12 py-8">
      <div>
        <h1 className="text-5xl font-serif text-on-surface tracking-tighter mb-4">
          Command Center
        </h1>
        <p className="text-on-surface-muted text-lg max-w-2xl font-serif leading-relaxed">
          Monitor your AI voice agent&apos;s real-time performance. High-level metrics to track conversions and call volume at a glance.
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Calls Today" value={todaysCalls || 0} highlight />
        <StatCard title="Total Calls" value={totalCalls || 0} />
        <StatCard title="Interested Leads" value={interestedLeads || 0} />
        <StatCard title="Follow-up Required" value={followupLeads || 0} />
      </div>

      {/* Usage and cost, billed per 30 s pulse */}
      <section className="bg-surface border border-border/50 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-serif text-on-surface tracking-tight">This month&apos;s usage</h2>
        <p className="text-on-surface-muted text-sm mt-1 mb-6">Billed per 30-second pulse, calendar month (IST).</p>
        <div className="mb-4">
          <a href="/api/export/calls" className="text-sm font-semibold text-primary hover:underline">
            Download calls as CSV
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard title="Billable minutes" value={usedMinutes.toFixed(1)} />
          <StatCard title="Billed (₹)" value={Math.round(usedMinutes * pricePerMin())} />
          <StatCard title="Avg call (s)" value={monthCalls?.length ? Math.round(avgSeconds) : 0} />
          <StatCard title="Calls" value={monthCalls?.length ?? 0} />
        </div>
      </section>

      {dueLeads && dueLeads.length > 0 && (
        <section className="bg-surface border border-border/50 rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-serif text-on-surface tracking-tight">Due for a retry</h2>
          <p className="text-on-surface-muted text-sm mt-1 mb-4">
            No answer or asked for a follow-up. Open the lead to call again (within 9am to 9pm IST).
          </p>
          <ul className="divide-y divide-border/30">
            {dueLeads.map((l) => (
              <li key={l.id} className="py-3 flex justify-between items-center text-sm">
                <Link href={`/leads/${l.id}`} className="font-semibold text-on-surface hover:text-primary">
                  {l.name}
                </Link>
                <span className="text-on-surface-muted">
                  {l.status} · {l.phone}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Conversion Bar */}
      <section className="bg-surface border border-border/50 rounded-2xl p-8 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-serif text-on-surface tracking-tight">Conversion Rate</h2>
            <p className="text-on-surface-muted text-sm mt-1">Percentage of contacted leads showing high interest.</p>
          </div>
          <div className="text-4xl font-serif text-primary">{conversionRate}%</div>
        </div>
        <div className="w-full bg-neutral h-4 rounded-full overflow-hidden flex">
          <div className="bg-primary h-full transition-all duration-1000 ease-out" style={{ width: `${conversionRate}%` }}></div>
          <div className="bg-amber-400 h-full transition-all duration-1000 ease-out" style={{ width: `${totalContacted > 0 ? ((followupLeads || 0) / totalContacted) * 100 : 0}%` }}></div>
          <div className="bg-red-400 h-full transition-all duration-1000 ease-out" style={{ width: `${totalContacted > 0 ? ((lostLeads || 0) / totalContacted) * 100 : 0}%` }}></div>
        </div>
        <div className="flex gap-6 mt-4 text-sm font-medium">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary"></span> Interested</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Follow Up</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400"></span> Not Interested</div>
        </div>
      </section>

      {/* Recent Calls List */}
      <section className="bg-surface border border-border/50 rounded-2xl p-8 shadow-sm">
        <h2 className="text-2xl font-serif text-on-surface mb-6 tracking-tight">Recent AI Calls</h2>
        
        {recentCalls && recentCalls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {recentCalls.map((call: any) => (
              <a href={`/leads/${call.leads?.id}`} key={call.id} className="block group">
                <div className="border border-border/30 rounded-xl p-5 hover:bg-tertiary/30 hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-on-surface text-lg group-hover:text-primary transition-colors">{call.leads?.name || "Unknown"}</h3>
                      <p className="text-on-surface-muted text-sm">{call.leads?.phone}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      call.leads?.interest_level === 'High' ? 'bg-green-100 text-green-800 border-green-200' :
                      call.leads?.interest_level === 'Low' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {call.leads?.interest_level || 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-muted line-clamp-2 mb-4">
                    {call.summary || "No summary provided."}
                  </p>
                  <div className="flex justify-between items-center text-xs text-on-surface-muted/70 font-medium">
                    <span>{format(new Date(call.created_at), "MMM d, h:mm a")}</span>
                    <span>{call.duration ? `${call.duration}s duration` : "Completed"}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-on-surface-muted bg-neutral/50 rounded-xl border border-border/30">
            No recent calls found. Start an AI call to see activity here.
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value, highlight = false }: { title: string | React.ReactNode; value: number | string; highlight?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl border transition-shadow hover:shadow-md ${
      highlight 
        ? "bg-primary text-white border-primary shadow-sm" 
        : "bg-surface border-border/50 text-on-surface shadow-sm"
    }`}>
      <h3 className={`text-sm font-semibold tracking-wide uppercase mb-2 ${highlight ? "text-white/80" : "text-on-surface-muted"}`}>
        {title}
      </h3>
      <p className="text-4xl font-serif tracking-tight">
        {value}
      </p>
    </div>
  );
}
