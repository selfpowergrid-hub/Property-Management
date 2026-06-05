/**
 * Formatting helpers. KES is the only supported currency in V1 (PRD §15.1),
 * so currency formatting is centralised here for web + mobile.
 */

const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

/** Format a KES amount, e.g. 25000 -> "KSh 25,000". Accepts string or number
 *  (Supabase returns numeric columns as strings). */
export function formatKES(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (value == null || Number.isNaN(value)) return "KSh 0";
  return KES.format(value);
}

const DATE = new Intl.DateTimeFormat("en-KE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return DATE.format(d);
}

/** Whole days between two dates (e.g. days a unit has been vacant, VAC-01). */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}
