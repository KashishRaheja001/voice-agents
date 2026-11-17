"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/authActions";

type Field = { name: string; label: string; type: string; autoComplete?: string; placeholder?: string };

const inputClass =
  "w-full bg-neutral border border-border/50 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

export default function AuthForm({
  action,
  fields,
  submitLabel,
  next,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  fields: Field[];
  submitLabel: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block text-sm font-semibold text-on-surface mb-2">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
            className={inputClass}
          />
        </div>
      ))}
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm font-medium text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-white px-6 py-3 rounded-full text-sm font-bold tracking-wide shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {pending ? "Please wait..." : submitLabel}
      </button>
    </form>
  );
}
