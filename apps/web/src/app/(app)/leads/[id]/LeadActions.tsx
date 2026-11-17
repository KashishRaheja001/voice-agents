"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDoNotCall } from "@/app/actions/leadActions";

// Call and do-not-call controls for one lead. Messages are shown inline.
export default function LeadActions({ leadId, doNotCall }: { leadId: string; doNotCall: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"call" | "dnc" | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function call() {
    setBusy("call");
    setMessage(null);
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage({ ok: true, text: "Call started. Results appear here when it ends." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: data.error ?? "Could not start the call." });
      }
    } catch {
      setMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function toggleDnc() {
    const next = !doNotCall;
    if (next && !confirm("Mark this lead as Do Not Call? The app will block calls to them.")) return;
    setBusy("dnc");
    setMessage(null);
    const res = await setDoNotCall(leadId, next);
    setBusy(null);
    if (res.error) setMessage({ ok: false, text: res.error });
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={call}
          disabled={busy !== null || doNotCall}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy === "call" ? "Starting..." : "Call with AI"}
        </button>
        <button
          onClick={toggleDnc}
          disabled={busy !== null}
          className="bg-neutral text-on-surface border border-border/50 px-6 py-3 rounded-full font-bold text-sm disabled:opacity-50"
        >
          {doNotCall ? "Remove Do Not Call" : "Mark Do Not Call"}
        </button>
      </div>
      {doNotCall && <p className="text-sm text-red-700">This lead is marked Do Not Call. Calls are blocked.</p>}
      {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>}
    </div>
  );
}
