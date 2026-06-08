import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateOrgBillingAction } from "@/app/actions/organisation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormDialog, Field } from "@/components/form-dialog";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireFeature("org.manage");
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("name, mpesa_paybill_number, grace_days")
    .eq("id", me.orgId!)
    .maybeSingle();

  const editBilling = (
    <FormDialog
      trigger={<Button>Edit billing</Button>}
      title="Billing settings"
      description="M-Pesa Paybill and late-payment grace period (PAY-02, PAY-06)."
      action={updateOrgBillingAction}
      submitLabel="Save settings"
    >
      <Field label="M-Pesa Paybill number" htmlFor="mpesaPaybillNumber" hint="Shown on receipts and the record form">
        <Input
          id="mpesaPaybillNumber"
          name="mpesaPaybillNumber"
          inputMode="numeric"
          placeholder="e.g. 247247"
          defaultValue={org?.mpesa_paybill_number ?? ""}
        />
      </Field>
      <Field label="Grace period (days)" htmlFor="graceDays" hint="Days after the due date before rent is marked late">
        <Input
          id="graceDays"
          name="graceDays"
          type="number"
          min="0"
          max="31"
          defaultValue={org?.grace_days ?? 3}
          required
        />
      </Field>
    </FormDialog>
  );

  return (
    <>
      <PageHeader title="Settings" description={`Organisation settings for ${org?.name ?? "your organisation"}.`} />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>How rent is collected and when it is flagged late.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">M-Pesa Paybill number</span>
            <span className="font-medium">{org?.mpesa_paybill_number ?? "Not set"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Late-payment grace period</span>
            <span className="font-medium">{org?.grace_days ?? 3} days</span>
          </div>
          <div className="pt-2">{editBilling}</div>
        </CardContent>
      </Card>
    </>
  );
}
