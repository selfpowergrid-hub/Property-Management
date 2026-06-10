import type { TypedSupabaseClient } from "@nyumba360/supabase";

export interface ArrearRow {
  leaseId: string;
  tenantName: string;
  phone: string | null;
  unit: string;
  property: string;
  balance: number;
  oldestDue: string; // YYYY-MM-DD of the oldest unpaid invoice
  daysLate: number;
}

/**
 * Tenants who are late on rent: active leases whose oldest unpaid invoice is
 * past the org's grace period, with the total outstanding balance. Sorted by
 * balance (largest first) so the worst arrears surface at the top. RLS scopes
 * everything to the caller's org.
 */
export async function loadArrears(supabase: TypedSupabaseClient): Promise<ArrearRow[]> {
  const [{ data: org }, { data: invoices }] = await Promise.all([
    supabase.from("organisations").select("grace_days").maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "amount, amount_paid, due_date, lease_id, leases(tenants(full_name, phone), units(unit_number, properties(name)))",
      )
      .neq("status", "paid"),
  ]);

  const grace = Number(org?.grace_days ?? 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type Acc = {
    leaseId: string;
    tenantName: string;
    phone: string | null;
    unit: string;
    property: string;
    balance: number;
    oldestDue: string;
  };
  const byLease = new Map<string, Acc>();

  for (const i of invoices ?? []) {
    if (!i.lease_id) continue;
    const outstanding = Number(i.amount) - Number(i.amount_paid);
    if (outstanding <= 0) continue;

    const lease = i.leases as
      | { tenants?: { full_name?: string; phone?: string | null }; units?: { unit_number?: string; properties?: { name?: string } } }
      | null;

    const acc =
      byLease.get(i.lease_id) ??
      ({
        leaseId: i.lease_id,
        tenantName: lease?.tenants?.full_name ?? "—",
        phone: lease?.tenants?.phone ?? null,
        unit: lease?.units?.unit_number ?? "—",
        property: lease?.units?.properties?.name ?? "—",
        balance: 0,
        oldestDue: i.due_date,
      } satisfies Acc);

    acc.balance += outstanding;
    if (i.due_date < acc.oldestDue) acc.oldestDue = i.due_date;
    byLease.set(i.lease_id, acc);
  }

  const rows: ArrearRow[] = [];
  for (const a of byLease.values()) {
    const due = new Date(a.oldestDue);
    due.setHours(0, 0, 0, 0);
    const daysLate = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
    if (daysLate > grace && a.balance > 0) {
      rows.push({ ...a, daysLate });
    }
  }

  return rows.sort((x, y) => y.balance - x.balance);
}
