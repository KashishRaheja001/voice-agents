"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/settingsActions";

const inputClass =
  "w-full bg-neutral border border-border/50 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-60";
const labelClass = "block text-sm font-semibold text-on-surface mb-2 uppercase tracking-wide";

type Defaults = { name: string; agent_name: string; language: string; dograh_trigger_uuid: string };

export default function SettingsForm({ defaults, canEdit }: { defaults: Defaults; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(saveSettings, undefined);

  return (
    <form action={formAction} className="bg-surface border border-border/50 rounded-2xl p-8 shadow-sm space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className={labelClass}>Company Name</label>
          <input id="name" name="name" defaultValue={defaults.name} disabled={!canEdit} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="agent_name" className={labelClass}>Agent Name (AI Voice)</label>
          <input id="agent_name" name="agent_name" defaultValue={defaults.agent_name} disabled={!canEdit} required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="language" className={labelClass}>Voice Language</label>
        <select id="language" name="language" defaultValue={defaults.language} disabled={!canEdit} className={inputClass}>
          <option value="hinglish">Hinglish</option>
          <option value="hindi">Hindi</option>
          <option value="english">English</option>
        </select>
      </div>

      <div>
        <label htmlFor="dograh_trigger_uuid" className={labelClass}>Agent Trigger ID</label>
        <input
          id="dograh_trigger_uuid"
          name="dograh_trigger_uuid"
          defaultValue={defaults.dograh_trigger_uuid}
          disabled={!canEdit}
          placeholder="Provided when your calling agent is set up"
          className={inputClass}
        />
        <p className="text-xs text-on-surface-muted mt-2">
          Links your workspace to its calling agent. Calls cannot start until this is set.
        </p>
      </div>

      <div className="pt-4 flex items-center gap-4 border-t border-border/50">
        {canEdit && (
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-white px-8 py-3 rounded-full text-sm font-bold tracking-wide shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save Configuration"}
          </button>
        )}
        {state?.saved && <span role="status" className="text-sm font-medium text-green-600">Settings saved.</span>}
        {state?.error && <span role="alert" className="text-sm font-medium text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
