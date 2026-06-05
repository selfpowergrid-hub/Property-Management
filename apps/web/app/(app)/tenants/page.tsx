import Link from "next/link";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createTenantAction } from "@/app/actions/tenants";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog, Field } from "@/components/form-dialog";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireFeature("tenants.manage");
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email, leases(status, units(unit_number))")
    .order("created_at", { ascending: false });

  const newTenantDialog = (
    <FormDialog
      trigger={<Button>New tenant</Button>}
      title="New tenant"
      description="Create a tenant profile (TEN-01)."
      action={createTenantAction}
      submitLabel="Create tenant"
    >
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" htmlFor="phone" hint="e.g. +254700000000">
          <Input id="phone" name="phone" required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" />
        </Field>
        <Field label="National ID" htmlFor="nationalId">
          <Input id="nationalId" name="nationalId" />
        </Field>
        <Field label="Emergency contact" htmlFor="emergencyContact">
          <Input id="emergencyContact" name="emergencyContact" />
        </Field>
      </div>
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        title="Tenants & Leases"
        description="Tenant profiles and their leases (PRD §6.3)."
        action={newTenantDialog}
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
                  const active = t.leases?.find((l) => l.status === "active");
                  const unit = active?.units as { unit_number?: string } | undefined;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.full_name}</TableCell>
                      <TableCell>{t.phone ?? "—"}</TableCell>
                      <TableCell>{unit?.unit_number ?? "—"}</TableCell>
                      <TableCell>{active ? "Active" : "—"}</TableCell>
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
