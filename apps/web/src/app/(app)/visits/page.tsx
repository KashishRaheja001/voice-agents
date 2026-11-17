import Link from "next/link";
import { format } from "date-fns";
import { requireOrg } from "@/lib/auth";

export const revalidate = 0;

type VisitCall = { created_at: string; extracted: { visit_slot?: string | null } | null };

// Leads the agent booked for a site visit: the main outcome for real estate.
export default async function VisitsPage() {
  const { supabase } = await requireOrg();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, phone, budget, preferred_location, property_type, calls ( created_at, extracted )")
    .eq("status", "Site Visit")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("Error fetching site visits:", error);

  const rows = (leads ?? []).map((l) => {
    const calls = ((l.calls ?? []) as VisitCall[])
      .filter((c) => c.extracted?.visit_slot)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { ...l, slot: calls[0]?.extracted?.visit_slot ?? null, bookedAt: calls[0]?.created_at ?? null };
  });

  return (
    <div className="space-y-8 py-8">
      <div>
        <h1 className="text-5xl font-serif text-on-surface tracking-tighter mb-4">Site Visits</h1>
        <p className="text-on-surface-muted text-lg max-w-2xl font-serif leading-relaxed">
          Leads the AI agent booked for a visit. Confirm the slot with them before the day.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-on-surface-muted bg-neutral/50 rounded-xl border border-border/30">
          No site visits booked yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((v) => (
            <div key={v.id} className="bg-surface border border-border/50 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <Link href={`/leads/${v.id}`} className="text-lg font-semibold text-on-surface hover:text-primary">
                    {v.name}
                  </Link>
                  <p className="text-sm mt-1">
                    <a href={`tel:${v.phone}`} className="text-primary hover:underline">{v.phone}</a>
                  </p>
                </div>
                <span className="bg-green-100 text-green-800 border border-green-200 rounded-full px-3 py-1 text-xs font-semibold">
                  {v.slot ?? "Slot not captured"}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-3 mt-4 text-sm">
                <div>
                  <dt className="text-on-surface-muted">Budget</dt>
                  <dd className="font-medium text-on-surface">{v.budget ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-muted">Looking for</dt>
                  <dd className="font-medium text-on-surface">{v.property_type ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-on-surface-muted">Area</dt>
                  <dd className="font-medium text-on-surface">{v.preferred_location ?? "-"}</dd>
                </div>
              </dl>
              {v.bookedAt && (
                <p className="text-xs text-on-surface-muted mt-4">Booked {format(new Date(v.bookedAt), "MMM d, h:mm a")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
