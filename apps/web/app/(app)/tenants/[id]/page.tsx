import Link from "next/link";
import { notFound } from "next/navigation";
import { enumLabel, formatKES, formatDate } from "@nyumba360/shared";
import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLeaseAction, renewLeaseAction, moveOutLeaseAction } from "@/app/actions/leases";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog, Field } from "@/components/form-dialog";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  await requireFeature("tenants.manage");
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, phone, email, national_id, emergency_contact")
    .eq("id", params.id)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: leases } = await supabase
    .from("leases")
    .select("id, start_date, end_date, rent_amount, deposit, payment_due_day, status, units(unit_number, properties(name))")
    .eq("tenant_id", tenant.id)
    .order("start_date", { ascending: false });

  const leaseIds = (leases ?? []).map((l) => l.id);
  const filterIds = leaseIds.length ? leaseIds : ["00000000-0000-0000-0000-000000000000"];

  const [{ data: vacantUnits }, { data: invoices }, { data: payments }] = await Promise.all([
    supabase.from("units").select("id, unit_number, monthly_rent, properties(name)").eq("status", "vacant"),
    supabase
      .from("invoices")
      .select("id, period_month, amount, amount_paid, due_date, status, lease_id")
      .in("lease_id", filterIds)
      .order("period_month", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, payment_date, method, receipt_number, lease_id")
      .in("lease_id", filterIds)
      .order("payment_date", { ascending: false }),
  ]);

  const outstanding =
    invoices?.reduce((s, i) => s + (Number(i.amount) - Number(i.amount_paid)), 0) ?? 0;
  const activeLease = leases?.find((l) => l.status === "active");

  const createLeaseDialog = (
    <FormDialog
      trigger={<Button>New lease</Button>}
      title="Create lease"
      description="Assign this tenant to a vacant unit (TEN-02). The first invoice is generated automatically."
      action={createLeaseAction}
      submitLabel="Create lease"
    >
      <input type="hidden" name="tenantId" value={tenant.id} />
      <Field label="Unit" htmlFor="unitId">
        <Select id="unitId" name="unitId" required defaultValue="">
          <option value="" disabled>
            Select a vacant unit
          </option>
          {(vacantUnits ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {(u.properties as { name?: string } | null)?.name ?? "—"} · Unit {u.unit_number} ({formatKES(u.monthly_rent)})
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="startDate">
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field label="End date" htmlFor="endDate" hint="Optional">
          <Input id="endDate" name="endDate" type="date" />
        </Field>
        <Field label="Monthly rent (KES)" htmlFor="rentAmount">
          <Input id="rentAmount" name="rentAmount" type="number" min="0" required />
        </Field>
        <Field label="Deposit (KES)" htmlFor="deposit">
          <Input id="deposit" name="deposit" type="number" min="0" defaultValue={0} />
        </Field>
        <Field label="Payment due day" htmlFor="paymentDueDay" hint="Day of month (1–28)">
          <Input id="paymentDueDay" name="paymentDueDay" type="number" min="1" max="28" defaultValue={1} required />
        </Field>
      </div>
    </FormDialog>
  );

  return (
    <>
      <div className="mb-4">
        <Link href="/tenants" className="text-sm text-primary hover:underline">
          ← Tenants
        </Link>
      </div>
      <PageHeader
        title={tenant.full_name}
        description={`${tenant.phone ?? "—"}${tenant.email ? ` · ${tenant.email}` : ""}`}
        action={!activeLease ? createLeaseDialog : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Outstanding balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatKES(outstanding)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">National ID</CardTitle>
          </CardHeader>
          <CardContent className="text-lg">{tenant.national_id ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Emergency contact</CardTitle>
          </CardHeader>
          <CardContent className="text-lg">{tenant.emergency_contact ?? "—"}</CardContent>
        </Card>
      </div>

      {/* Leases */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Leases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {leases && leases.length > 0 ? (
            leases.map((l) => {
              const unit = l.units as { unit_number?: string; properties?: { name?: string } } | undefined;
              return (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                  <div>
                    <p className="font-medium">
                      {unit?.properties?.name ?? "—"} · Unit {unit?.unit_number ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatKES(l.rent_amount)}/mo · due day {l.payment_due_day} · {formatDate(l.start_date)} →{" "}
                      {l.end_date ? formatDate(l.end_date) : "open"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === "active" ? "success" : "muted"}>{enumLabel(l.status)}</Badge>
                    {l.status === "active" ? (
                      <>
                        <FormDialog
                          trigger={<Button variant="outline" size="sm">Renew</Button>}
                          title="Renew lease"
                          action={renewLeaseAction}
                          submitLabel="Renew"
                        >
                          <input type="hidden" name="leaseId" value={l.id} />
                          <Field label="New end date" htmlFor="newEndDate">
                            <Input id="newEndDate" name="newEndDate" type="date" required />
                          </Field>
                          <Field label="Monthly rent (KES)" htmlFor="rentAmount">
                            <Input id="rentAmount" name="rentAmount" type="number" min="0" defaultValue={Number(l.rent_amount)} required />
                          </Field>
                          <Field label="Payment due day" htmlFor="paymentDueDay">
                            <Input id="paymentDueDay" name="paymentDueDay" type="number" min="1" max="28" defaultValue={l.payment_due_day} required />
                          </Field>
                        </FormDialog>
                        <FormDialog
                          trigger={<Button variant="outline" size="sm">Move out</Button>}
                          title="Record move-out"
                          description="Free the unit and terminate the lease (TEN-05)."
                          action={moveOutLeaseAction}
                          submitLabel="Confirm move-out"
                        >
                          <input type="hidden" name="leaseId" value={l.id} />
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Notice date" htmlFor="noticeDate">
                              <Input id="noticeDate" name="noticeDate" type="date" required />
                            </Field>
                            <Field label="Vacate date" htmlFor="vacateDate">
                              <Input id="vacateDate" name="vacateDate" type="date" required />
                            </Field>
                          </div>
                          <Field label="Deposit deductions (KES)" htmlFor="depositDeductions" hint={`Deposit held: ${formatKES(l.deposit)}`}>
                            <Input id="depositDeductions" name="depositDeductions" type="number" min="0" defaultValue={0} />
                          </Field>
                          <Field label="Notes" htmlFor="notes">
                            <Textarea id="notes" name="notes" placeholder="Condition, deductions breakdown…" />
                          </Field>
                        </FormDialog>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No leases yet. Create one to start billing.</p>
          )}
        </CardContent>
      </Card>

      {/* Ledger (TEN-06) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{formatDate(i.period_month)}</TableCell>
                    <TableCell>{formatKES(i.amount)}</TableCell>
                    <TableCell>{formatKES(i.amount_paid)}</TableCell>
                    <TableCell>
                      <Badge variant={i.status === "paid" ? "success" : i.status === "overdue" ? "destructive" : "muted"}>
                        {enumLabel(i.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(invoices ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>{formatKES(p.amount)}</TableCell>
                    <TableCell>{enumLabel(p.method)}</TableCell>
                    <TableCell>
                      <Link href={`/payments/${p.id}/receipt`} className="text-primary hover:underline">
                        {p.receipt_number ?? "—"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(payments ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      No payments yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
