import type { TypedSupabaseClient } from "@nyumba360/supabase";
import { formatKES, formatDate, enumLabel } from "@nyumba360/shared";

export interface ReportRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface ReportTable {
  title: string;
  columns: string[];
  rows: string[][];
  summary: { label: string; value: string }[];
}

type Builder = (supabase: TypedSupabaseClient, range: ReportRange) => Promise<ReportTable>;

const monthKey = (d: string) => d.slice(0, 7); // YYYY-MM

// RPT-01 — Rent Collection: invoiced vs collected vs outstanding per property×month
const rentCollection: Builder = async (supabase, { from, to }) => {
  const { data } = await supabase
    .from("invoices")
    .select("period_month, amount, amount_paid, leases(units(properties(name)))")
    .gte("period_month", from)
    .lte("period_month", to);

  const groups = new Map<string, { property: string; month: string; inv: number; col: number }>();
  for (const i of data ?? []) {
    const property =
      ((i.leases as { units?: { properties?: { name?: string } } } | null)?.units?.properties?.name) ?? "—";
    const month = monthKey(i.period_month);
    const key = `${property}__${month}`;
    const g = groups.get(key) ?? { property, month, inv: 0, col: 0 };
    g.inv += Number(i.amount);
    g.col += Number(i.amount_paid);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => a.property.localeCompare(b.property) || a.month.localeCompare(b.month));
  const totalInv = list.reduce((s, g) => s + g.inv, 0);
  const totalCol = list.reduce((s, g) => s + g.col, 0);

  return {
    title: "Rent Collection Report",
    columns: ["Property", "Month", "Invoiced", "Collected", "Outstanding"],
    rows: list.map((g) => [g.property, g.month, formatKES(g.inv), formatKES(g.col), formatKES(g.inv - g.col)]),
    summary: [
      { label: "Invoiced", value: formatKES(totalInv) },
      { label: "Collected", value: formatKES(totalCol) },
      { label: "Outstanding", value: formatKES(totalInv - totalCol) },
      { label: "Collection rate", value: totalInv ? `${Math.round((totalCol / totalInv) * 100)}%` : "—" },
    ],
  };
};

// RPT-02 — Income & Expense Summary per month
const incomeExpense: Builder = async (supabase, { from, to }) => {
  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase.from("payments").select("amount, payment_date").gte("payment_date", from).lte("payment_date", to),
    supabase.from("expenses").select("amount, date").gte("date", from).lte("date", to),
  ]);

  const months = new Map<string, { income: number; expense: number }>();
  for (const p of payments ?? []) {
    const m = monthKey(p.payment_date);
    const g = months.get(m) ?? { income: 0, expense: 0 };
    g.income += Number(p.amount);
    months.set(m, g);
  }
  for (const e of expenses ?? []) {
    const m = monthKey(e.date);
    const g = months.get(m) ?? { income: 0, expense: 0 };
    g.expense += Number(e.amount);
    months.set(m, g);
  }
  const list = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const income = list.reduce((s, [, g]) => s + g.income, 0);
  const expense = list.reduce((s, [, g]) => s + g.expense, 0);

  return {
    title: "Income & Expense Summary",
    columns: ["Month", "Income", "Expenses", "Net"],
    rows: list.map(([m, g]) => [m, formatKES(g.income), formatKES(g.expense), formatKES(g.income - g.expense)]),
    summary: [
      { label: "Gross income", value: formatKES(income) },
      { label: "Total expenses", value: formatKES(expense) },
      { label: "Net income", value: formatKES(income - expense) },
    ],
  };
};

// RPT-03 — Tenant Arrears with aging (current; `to` caps the as-of date)
const arrears: Builder = async (supabase, { to }) => {
  const asOf = new Date(to);
  const { data } = await supabase
    .from("invoices")
    .select("amount, amount_paid, due_date, leases(tenants(full_name))")
    .neq("status", "paid");

  const buckets = ["0-30", "31-60", "61-90", "90+"] as const;
  const byTenant = new Map<string, number[]>();
  for (const i of data ?? []) {
    const outstanding = Number(i.amount) - Number(i.amount_paid);
    if (outstanding <= 0) continue;
    const tenant = ((i.leases as { tenants?: { full_name?: string } } | null)?.tenants?.full_name) ?? "—";
    const ageDays = Math.floor((asOf.getTime() - new Date(i.due_date).getTime()) / 86_400_000);
    const idx = ageDays <= 30 ? 0 : ageDays <= 60 ? 1 : ageDays <= 90 ? 2 : 3;
    const row = byTenant.get(tenant) ?? [0, 0, 0, 0];
    row[idx]! += outstanding;
    byTenant.set(tenant, row);
  }
  const list = [...byTenant.entries()].sort((a, b) => {
    const ta = a[1].reduce((s, v) => s + v, 0);
    const tb = b[1].reduce((s, v) => s + v, 0);
    return tb - ta;
  });
  const grand = list.reduce((s, [, r]) => s + r.reduce((x, v) => x + v, 0), 0);

  return {
    title: "Tenant Arrears Report",
    columns: ["Tenant", ...buckets, "Total"],
    rows: list.map(([tenant, r]) => [
      tenant,
      ...r.map((v) => formatKES(v)),
      formatKES(r.reduce((s, v) => s + v, 0)),
    ]),
    summary: [
      { label: "Tenants in arrears", value: String(list.length) },
      { label: "Total arrears", value: formatKES(grand) },
    ],
  };
};

// RPT-04 — Occupancy per property (current snapshot)
const occupancy: Builder = async (supabase) => {
  const { data } = await supabase.from("units").select("status, properties(name)");
  const byProp = new Map<string, { total: number; occ: number }>();
  for (const u of data ?? []) {
    const name = ((u.properties as { name?: string } | null)?.name) ?? "—";
    const g = byProp.get(name) ?? { total: 0, occ: 0 };
    g.total += 1;
    if (u.status === "occupied") g.occ += 1;
    byProp.set(name, g);
  }
  const list = [...byProp.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const total = list.reduce((s, [, g]) => s + g.total, 0);
  const occ = list.reduce((s, [, g]) => s + g.occ, 0);

  return {
    title: "Occupancy Report",
    columns: ["Property", "Occupied", "Total units", "Occupancy"],
    rows: list.map(([name, g]) => [
      name,
      String(g.occ),
      String(g.total),
      g.total ? `${Math.round((g.occ / g.total) * 100)}%` : "—",
    ]),
    summary: [
      { label: "Occupied units", value: `${occ} / ${total}` },
      { label: "Overall occupancy", value: total ? `${Math.round((occ / total) * 100)}%` : "—" },
    ],
  };
};

// RPT-05 — Maintenance Summary
const maintenanceSummary: Builder = async (supabase, { from, to }) => {
  const { data } = await supabase
    .from("maintenance_requests")
    .select("status, cost, created_at, resolved_at")
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`);

  const counts = new Map<string, number>();
  let totalCost = 0;
  let resolvedCount = 0;
  let resolutionDaysSum = 0;
  for (const r of data ?? []) {
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    totalCost += Number(r.cost ?? 0);
    if (r.resolved_at) {
      resolvedCount += 1;
      resolutionDaysSum += (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 86_400_000;
    }
  }
  const list = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return {
    title: "Maintenance Summary Report",
    columns: ["Status", "Count"],
    rows: list.map(([status, n]) => [enumLabel(status), String(n)]),
    summary: [
      { label: "Total requests", value: String(data?.length ?? 0) },
      { label: "Resolved", value: String(resolvedCount) },
      { label: "Avg resolution", value: resolvedCount ? `${(resolutionDaysSum / resolvedCount).toFixed(1)} days` : "—" },
      { label: "Total cost", value: formatKES(totalCost) },
    ],
  };
};

// Monthly Rental Income (MRI) tax — KRA filing worksheet. Computes MRI on
// RESIDENTIAL rent *received* (cash basis) at the org's configured rate, less
// any withholding-tax credit, per month. Commercial rent is excluded (it falls
// under the normal income-tax regime). Estimates only — not a KRA filing.
const mriTax: Builder = async (supabase, { from, to }) => {
  const [{ data: org }, { data: payments }] = await Promise.all([
    supabase
      .from("organisations")
      .select("mri_rate, mri_threshold_min, mri_threshold_max")
      .maybeSingle(),
    supabase
      .from("payments")
      .select("amount, wht_amount, payment_date, leases(units(properties(type)))")
      .gte("payment_date", from)
      .lte("payment_date", to),
  ]);

  const rate = Number(org?.mri_rate ?? 0.075);
  const minBand = Number(org?.mri_threshold_min ?? 288000);
  const maxBand = Number(org?.mri_threshold_max ?? 15000000);

  const months = new Map<string, { gross: number; wht: number }>();
  for (const p of payments ?? []) {
    const type = (
      (p.leases as { units?: { properties?: { type?: string } } } | null)?.units?.properties?.type
    );
    if (type !== "residential") continue; // MRI is residential-only
    const m = monthKey(p.payment_date);
    const g = months.get(m) ?? { gross: 0, wht: 0 };
    g.gross += Number(p.amount);
    g.wht += Number(p.wht_amount ?? 0);
    months.set(m, g);
  }

  const list = [...months.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalGross = list.reduce((s, [, g]) => s + g.gross, 0);
  const totalWht = list.reduce((s, [, g]) => s + g.wht, 0);
  const totalMri = totalGross * rate;
  const totalNet = Math.max(0, totalMri - totalWht);

  // Annualise the in-range gross to sense-check MRI eligibility (288k–15M/yr).
  const monthsCount = Math.max(1, list.length);
  const annualised = (totalGross / monthsCount) * 12;
  const eligibility =
    annualised < minBand
      ? "Below MRI band — likely exempt"
      : annualised > maxBand
        ? "Above MRI band — normal income tax applies"
        : "Within MRI band";

  return {
    title: "Monthly Rental Income (MRI) Tax",
    columns: ["Month", "Residential rent received", `MRI @ ${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`, "WHT credit", "Net payable"],
    rows: list.map(([m, g]) => {
      const mri = g.gross * rate;
      return [m, formatKES(g.gross), formatKES(mri), formatKES(g.wht), formatKES(Math.max(0, mri - g.wht))];
    }),
    summary: [
      { label: "Residential rent received", value: formatKES(totalGross) },
      { label: "MRI due", value: formatKES(totalMri) },
      { label: "Withholding credit", value: formatKES(totalWht) },
      { label: "Net MRI payable", value: formatKES(totalNet) },
      { label: "Annualised gross", value: `${formatKES(annualised)} — ${eligibility}` },
    ],
  };
};

export const REPORTS: Record<string, { label: string; description: string; build: Builder }> = {
  "rent-collection": { label: "Rent Collection", description: "Invoiced vs collected vs outstanding per property.", build: rentCollection },
  "income-expense": { label: "Income & Expense", description: "Gross income, expenses, and net per period.", build: incomeExpense },
  arrears: { label: "Tenant Arrears", description: "Outstanding balances with aging.", build: arrears },
  occupancy: { label: "Occupancy", description: "Occupancy rate per property.", build: occupancy },
  maintenance: { label: "Maintenance Summary", description: "Tickets, resolution time, and cost.", build: maintenanceSummary },
  "mri-tax": { label: "MRI Tax", description: "Monthly Rental Income tax worksheet for KRA filing.", build: mriTax },
};

export type ReportSlug = keyof typeof REPORTS;

/** Default range: current calendar year to today. */
export function defaultRange(): ReportRange {
  const now = new Date();
  return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0, 10) };
}

export { formatDate };
