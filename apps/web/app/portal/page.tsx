import { formatKES, formatDate, enumLabel } from "@nyumba360/shared";
import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const user = await requireTenant();
  const supabase = await createClient();

  // Tenant sees only their own data via RLS.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, leases(id, rent_amount, payment_due_day, units(unit_number, properties(name)))")
    .eq("user_id", user.id)
    .maybeSingle();

  const lease = tenant?.leases?.[0];
  const unit = lease?.units as { unit_number?: string; properties?: { name?: string } } | undefined;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("amount, amount_paid, due_date, status")
    .neq("status", "paid")
    .order("due_date", { ascending: true });

  const balance =
    invoices?.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0) ?? 0;
  const nextDue = invoices?.[0];

  return (
    <>
      <PageHeader title={`Karibu, ${user.profile?.full_name ?? "tenant"}`} description="Your rent and home at a glance." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Current balance" value={formatKES(balance)} icon="Receipt" />
        <StatCard
          title="Next due date"
          value={nextDue ? formatDate(nextDue.due_date) : "—"}
          hint={nextDue ? enumLabel(nextDue.status) : "All settled"}
          icon="FileText"
        />
        <StatCard title="Monthly rent" value={formatKES(lease?.rent_amount ?? 0)} icon="Home" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your unit</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {unit
            ? `${unit.properties?.name ?? "—"} · Unit ${unit.unit_number ?? "—"}`
            : "No active lease found on your account yet."}
        </CardContent>
      </Card>
    </>
  );
}
