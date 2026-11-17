"use client";

import { useState } from "react";
import { importLeads } from "@/app/actions/leadActions";

type Result = Awaited<ReturnType<typeof importLeads>>;

export default function ImportLeads() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    const res = await importLeads(formData);
    setResult(res);
    setPending(false);
  }

  const done = result && "success" in result && result.success;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setResult(null);
        }}
        className="bg-neutral text-on-surface border border-border/50 px-6 py-2 rounded-full text-sm font-semibold hover:bg-tertiary transition-colors shadow-sm"
      >
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-8 shadow-xl border border-border/50">
            <h3 className="text-2xl font-serif mb-2 text-on-surface">Import leads</h3>
            <p className="text-sm text-on-surface-muted mb-6">
              CSV with a header row. Needs <b>Name</b> and <b>Phone</b>; optional: Email, Budget, Location,
              Property Type, Timeline, Purpose. Max 1000 rows.
            </p>

            {done ? (
              <div className="space-y-3 text-sm text-on-surface">
                <p className="font-semibold">{result.inserted} leads imported.</p>
                {result.alreadyExisted > 0 && <p>{result.alreadyExisted} already in your workspace (skipped).</p>}
                {result.duplicatesInFile > 0 && <p>{result.duplicatesInFile} repeated numbers in the file (skipped).</p>}
                {result.invalidCount > 0 && (
                  <div>
                    <p>{result.invalidCount} rows skipped:</p>
                    <ul className="list-disc pl-5 text-on-surface-muted">
                      {result.invalid.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-primary text-white py-2.5 rounded-full font-bold text-sm mt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <form action={onSubmit} className="space-y-4">
                <input type="file" name="file" accept=".csv,text/csv" required className="w-full text-sm" />
                <input
                  type="text"
                  name="consent_source"
                  placeholder="Where did these leads come from? (e.g. 99acres enquiries)"
                  required
                  className="w-full bg-neutral border border-border/50 rounded-lg px-4 py-2.5 text-on-surface"
                />
                <label className="flex gap-2 text-sm text-on-surface items-start">
                  <input type="checkbox" name="consent" className="mt-1" required />
                  <span>These people enquired with us and agreed to be contacted. No cold lists.</span>
                </label>
                {result && "error" in result && <p className="text-sm text-red-600">{result.error}</p>}
                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex-1 bg-primary text-white py-2.5 rounded-full font-bold text-sm disabled:opacity-60"
                  >
                    {pending ? "Importing..." : "Import"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 bg-neutral text-on-surface border border-border/50 py-2.5 rounded-full font-bold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
