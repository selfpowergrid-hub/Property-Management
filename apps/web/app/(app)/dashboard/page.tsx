import { formatKES } from "@nyumba360/shared";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireStaff();
  const supabase = await createClient();

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  // Live (RLS-scoped) counts so the foundation proves data flows end-to-end.
  const [{ count: propertyCount }, { data: units }, { data: outstanding }, { data: monthPayments }] =
    await Promise.all([
      supabase.from("properties").select("id", { count: "exact", head: true }),
      supabase.from("units").select("status"),
      supabase.from("invoices").select("amount, amount_paid").neq("status", "paid"),
      supabase.from("payments").select("amount").gte("payment_date", monthStart),
    ]);

  const collectedThisMonth = monthPayments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  const totalUnits = units?.length ?? 0;
  const occupied = units?.filter((u) => u.status === "occupied").length ?? 0;
  const vacant = units?.filter((u) => u.status === "vacant").length ?? 0;
  const occupancyRate = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;
  const outstandingTotal =
    outstanding?.reduce((sum, inv) => sum + (Number(inv.amount) - Number(inv.amount_paid)), 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Consolidated view across all your properties."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Properties" value={String(propertyCount ?? 0)} icon="Building2" />
        <StatCard
          title="Occupancy"
          value={`${occupancyRate}%`}
          hint={`${occupied} of ${totalUnits} units occupied`}
          icon="LayoutDashboard"
        />
        <StatCard title="Vacant units" value={String(vacant)} hint="Available to list" icon="DoorOpen" />
        <StatCard
          title="Collected this month"
          value={formatKES(collectedThisMonth)}
          hint="Payments recorded this month"
          icon="Wallet"
        />
        <StatCard
          title="Outstanding rent"
          value={formatKES(outstandingTotal)}
          hint="Unpaid + partial invoices"
          icon="Receipt"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Welcome to LogiQ Estates Pro</CardTitle>
          <CardDescription>
            You&apos;re signed in as {user.profile?.full_name ?? user.email}. This is the Phase 1
            foundation — authentication, multi-tenant data isolation, and role-based navigation are
            live. Property, rent, maintenance, and reporting modules are built out in the next
            phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use the sidebar to explore the modules available to your role.
        </CardContent>
      </Card>
    </>
  );
}
