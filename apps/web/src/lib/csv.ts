// Minimal RFC 4180-style CSV parser (quoted fields, escaped quotes, CRLF, BOM).

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const ALIASES: Record<string, string> = {
  name: "name",
  "full name": "name",
  fullname: "name",
  "customer name": "name",
  phone: "phone",
  mobile: "phone",
  "mobile number": "phone",
  "phone number": "phone",
  number: "phone",
  contact: "phone",
  email: "email",
  "email address": "email",
  budget: "budget",
  location: "preferred_location",
  "preferred location": "preferred_location",
  preferred_location: "preferred_location",
  "property type": "property_type",
  property_type: "property_type",
  configuration: "property_type",
  bhk: "property_type",
  timeline: "timeline",
  purpose: "purpose",
};

export type LeadCsvRow = Partial<
  Record<"name" | "phone" | "email" | "budget" | "preferred_location" | "property_type" | "timeline" | "purpose", string>
>;

// Turns CSV text into objects keyed by our lead fields. Unknown columns are ignored.
export function csvToLeadRows(input: string): LeadCsvRow[] {
  const [header, ...body] = parseCsv(input);
  if (!header) return [];
  const keys = header.map((h) => ALIASES[h.trim().toLowerCase()] ?? null);
  return body.map((cells) => {
    const out: Record<string, string> = {};
    keys.forEach((k, idx) => {
      const v = (cells[idx] ?? "").trim();
      if (k && v) out[k] = v;
    });
    return out;
  });
}
