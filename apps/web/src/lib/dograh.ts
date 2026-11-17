import "server-only";
import { timingSafeEqual } from "node:crypto";

// Dograh REST API base. Hosted default; set DOGRAH_API_URL for self-hosted.
export const DOGRAH_API_URL = (process.env.DOGRAH_API_URL || "https://api.dograh.com/api/v1").replace(/\/$/, "");

// Constant-time check of the shared secret Dograh sends with webhooks/tool calls.
export function hasValidWebhookSecret(request: Request) {
  const expected = process.env.DOGRAH_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Dograh renders unresolved template variables literally (e.g. "{{gathered_context.x}}")
// or as empty/"null". Treat all of those as "no value".
export function cleanValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s === "null" || s === "undefined" || s.startsWith("{{")) return null;
  return s;
}
