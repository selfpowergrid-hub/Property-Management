import Link from "next/link";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireFeature("tenants.manage");
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email, leases(status, units(unit_number))")
    .order("created_at", { ascending: false });

  const newTenantButton = (
    <Link href="/tenants/new" className={buttonVariants()}>
      New tenant
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Tenants & Leases"
        description="Tenant profiles and their leases (PRD §6.3)."
        action={newTenantButton}
      />

      {tenants && tenants.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Lease</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => {
                  const activeLeases = (t.leases ?? []).filter((l) => l.status === "active");
                  const units = activeLeases
                    .map((l) => (l.units as { unit_number?: string } | null)?.unit_number)
                    .filter(Boolean);
                  const unitLabel =
                    units.length === 0 ? "—" : units.length <= 2 ? units.join(", ") : `${units.length} units`;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.full_name}</TableCell>
                      <TableCell>{t.phone ?? "—"}</TableCell>
                      <TableCell>{unitLabel}</TableCell>
                      <TableCell>{activeLeases.length > 0 ? "Active" : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/tenants/${t.id}`} className="text-sm text-primary hover:underline">
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon="Users"
          title="No tenants yet"
          description="Create a tenant profile, then assign them a lease on a vacant unit."
        />
      )}
    </>
  );
}
