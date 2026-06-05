import { formatKES, formatDate, enumLabel } from "@nyumba360/shared";
import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function PortalLeasePage() {
  const user = await requireTenant();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, leases(start_date, end_date, rent_amount, deposit, status, units(unit_number, properties(name)))",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const lease = tenant?.leases?.[0];
  const unit = lease?.units as { unit_number?: string; properties?: { name?: string } } | undefined;

  if (!lease) {
    return (
      <>
        <PageHeader title="My Lease" description="Your lease summary (PRD §7.1)." />
        <EmptyState
          icon="FileText"
          title="No active lease"
          description="When your landlord activates a lease for you, its terms and the agreement PDF will appear here."
        />
      </>
    );
  }

  const rows: [string, string][] = [
    ["Property", unit?.properties?.name ?? "—"],
    ["Unit", unit?.unit_number ?? "—"],
    ["Status", enumLabel(lease.status)],
    ["Start date", formatDate(lease.start_date)],
    ["End date", lease.end_date ? formatDate(lease.end_date) : "Open-ended"],
    ["Monthly rent", formatKES(lease.rent_amount)],
    ["Deposit", formatKES(lease.deposit)],
  ];

  return (
    <>
      <PageHeader title="My Lease" description="Your lease summary (PRD §7.1)." />
      <Card>
        <CardContent className="divide-y p-0">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-6 py-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
