import { requireFeature } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  updateOrgBillingAction,
  updateOrgTaxAction,
  updateOrgProfileAction,
} from "@/app/actions/organisation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormDialog, Field } from "@/components/form-dialog";

export const dynamic = "force-dynamic";

const pctLabel = (frac: number) => `${(frac * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

export default async function SettingsPage() {
  const me = await requireFeature("org.manage");
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select(
      "name, mpesa_paybill_number, grace_days, kra_pin, mri_rate, vat_registered, vat_rate, logo_path, registration_number, phone, email, county, address, postal_address",
    )
    .eq("id", me.orgId!)
    .maybeSingle();

  const logoUrl = org?.logo_path
    ? supabase.storage.from("org-logos").getPublicUrl(org.logo_path).data.publicUrl
    : null;

  const editCompany = (
    <FormDialog
      trigger={<Button>Edit company</Button>}
      title="Company profile"
      description="Details shown across the app, on receipts and reports."
      action={updateOrgProfileAction}
      submitLabel="Save company"
    >
      <Field label="Company name" htmlFor="name">
        <Input id="name" name="name" defaultValue={org?.name ?? ""} required />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Registration no." htmlFor="registrationNumber">
          <Input id="registrationNumber" name="registrationNumber" defaultValue={org?.registration_number ?? ""} />
        </Field>
        <Field label="KRA PIN" htmlFor="kraPin">
          <Input id="kraPin" name="kraPin" defaultValue={org?.kra_pin ?? ""} placeholder="A012345678Z" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={org?.phone ?? ""} placeholder="+254700000000" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={org?.email ?? ""} />
        </Field>
        <Field label="County" htmlFor="county">
          <Input id="county" name="county" defaultValue={org?.county ?? ""} />
        </Field>
        <Field label="Postal address" htmlFor="postalAddress">
          <Input id="postalAddress" name="postalAddress" defaultValue={org?.postal_address ?? ""} />
        </Field>
      </div>
      <Field label="Physical address" htmlFor="address">
        <Input id="address" name="address" defaultValue={org?.address ?? ""} />
      </Field>
      <Field label="Logo" htmlFor="logo" hint={logoUrl ? "Upload to replace the current logo" : "Optional"}>
        <Input id="logo" name="logo" type="file" accept="image/*" />
      </Field>
    </FormDialog>
  );

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

  const editTax = (
    <FormDialog
      trigger={<Button>Edit tax</Button>}
      title="Tax settings"
      description="KRA profile used to compute Monthly Rental Income (MRI) tax."
      action={updateOrgTaxAction}
      submitLabel="Save settings"
    >
      <Field label="KRA PIN" htmlFor="kraPin" hint="e.g. A012345678Z">
        <Input id="kraPin" name="kraPin" defaultValue={org?.kra_pin ?? ""} placeholder="A012345678Z" />
      </Field>
      <Field label="MRI rate (%)" htmlFor="mriRatePercent" hint="Monthly Rental Income tax on residential rent (default 7.5%)">
        <Input
          id="mriRatePercent"
          name="mriRatePercent"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={((org?.mri_rate ?? 0.075) * 100).toString()}
          required
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="VAT registered" htmlFor="vatRegistered" hint="For commercial rent">
          <Select id="vatRegistered" name="vatRegistered" defaultValue={org?.vat_registered ? "on" : ""}>
            <option value="">No</option>
            <option value="on">Yes</option>
          </Select>
        </Field>
        <Field label="VAT rate (%)" htmlFor="vatRatePercent">
          <Input
            id="vatRatePercent"
            name="vatRatePercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={((org?.vat_rate ?? 0.16) * 100).toString()}
            required
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimates to support your KRA filing — not tax advice. Confirm rates with KRA or a tax
        professional.
      </p>
    </FormDialog>
  );

  return (
    <>
      <PageHeader title="Settings" description={`Organisation settings for ${org?.name ?? "your organisation"}.`} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company</CardTitle>
          <CardDescription>Your company profile and logo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={org?.name ?? "Logo"} className="h-16 w-16 rounded-md border object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-md border bg-primary text-2xl font-bold text-primary-foreground">
                {(org?.name?.charAt(0) ?? "L").toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{org?.name ?? "—"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[org?.phone, org?.email].filter(Boolean).join(" · ") || "No contact set"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[org?.registration_number && `Reg ${org.registration_number}`, org?.kra_pin && `PIN ${org.kra_pin}`]
                  .filter(Boolean)
                  .join(" · ") || "No registration details"}
              </p>
            </div>
          </div>
          <div>{editCompany}</div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Tax</CardTitle>
            <CardDescription>KRA rental tax profile (PRD §6.4 / Finance Act).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-muted-foreground">KRA PIN</span>
              <span className="font-medium">{org?.kra_pin ?? "Not set"}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm text-muted-foreground">MRI rate</span>
              <span className="font-medium">{pctLabel(org?.mri_rate ?? 0.075)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">VAT</span>
              <span className="font-medium">
                {org?.vat_registered ? `Registered · ${pctLabel(org?.vat_rate ?? 0.16)}` : "Not registered"}
              </span>
            </div>
            <div className="pt-2">{editTax}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
