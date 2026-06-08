"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { createTenantWithAllocationsAction } from "@/app/actions/tenants";
import { formatKES } from "@nyumba360/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/form-dialog";

export interface VacantUnitOption {
  id: string;
  label: string;
  monthlyRent: number;
}

interface AllocationRow {
  unitId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  deposit: string;
  paymentDueDay: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyRow = (): AllocationRow => ({
  unitId: "",
  startDate: today(),
  endDate: "",
  rentAmount: "",
  deposit: "0",
  paymentDueDay: "1",
});

export function NewTenantForm({ vacantUnits }: { vacantUnits: VacantUnitOption[] }) {
  const [state, formAction] = useFormState(createTenantWithAllocationsAction, {} as { error?: string });
  const [rows, setRows] = React.useState<AllocationRow[]>([]);

  function updateRow(i: number, patch: Partial<AllocationRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function onPickUnit(i: number, unitId: string) {
    const unit = vacantUnits.find((u) => u.id === unitId);
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i
          ? {
              ...r,
              unitId,
              // Pre-fill rent from the unit unless the user already typed one.
              rentAmount: r.rentAmount && r.rentAmount !== "" ? r.rentAmount : String(unit?.monthlyRent ?? ""),
            }
          : r,
      ),
    );
  }

  // Only rows with a chosen unit count as allocations; blank rows are ignored.
  const allocationsJson = JSON.stringify(
    rows
      .filter((r) => r.unitId)
      .map((r) => ({
        unitId: r.unitId,
        startDate: r.startDate,
        endDate: r.endDate,
        rentAmount: r.rentAmount,
        deposit: r.deposit,
        paymentDueDay: r.paymentDueDay,
      })),
  );

  // Units already chosen in other rows shouldn't be selectable again.
  const unitsFor = (i: number) => {
    const taken = new Set(rows.filter((_, idx) => idx !== i).map((r) => r.unitId).filter(Boolean));
    return vacantUnits.filter((u) => !taken.has(u.id) || u.id === rows[i]?.unitId);
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="allocations" value={allocationsJson} />

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" required />
            </Field>
          </div>
          <Field label="ID type" htmlFor="idType">
            <Select id="idType" name="idType" defaultValue="national_id">
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="alien_id">Alien ID</option>
              <option value="military_id">Military ID</option>
            </Select>
          </Field>
          <Field label="ID / document number" htmlFor="nationalId">
            <Input id="nationalId" name="nationalId" />
          </Field>
          <Field label="Date of birth" htmlFor="dateOfBirth">
            <Input id="dateOfBirth" name="dateOfBirth" type="date" />
          </Field>
          <Field label="Gender" htmlFor="gender">
            <Select id="gender" name="gender" defaultValue="">
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="undisclosed">Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Nationality" htmlFor="nationality">
            <Input id="nationality" name="nationality" defaultValue="Kenyan" />
          </Field>
          <Field label="Marital status" htmlFor="maritalStatus">
            <Select id="maritalStatus" name="maritalStatus" defaultValue="">
              <option value="">—</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </Select>
          </Field>
          <Field label="KRA PIN" htmlFor="kraPin" hint="e.g. A012345678Z">
            <Input id="kraPin" name="kraPin" />
          </Field>
        </CardContent>
      </Card>

      {/* Contact & address */}
      <Card>
        <CardHeader>
          <CardTitle>Contact &amp; address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" hint="e.g. +254700000000">
            <Input id="phone" name="phone" required />
          </Field>
          <Field label="Alternate phone" htmlFor="alternatePhone">
            <Input id="alternatePhone" name="alternatePhone" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Postal address" htmlFor="postalAddress">
            <Input id="postalAddress" name="postalAddress" placeholder="P.O. Box 0000-00100" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Physical / home address" htmlFor="physicalAddress">
              <Input id="physicalAddress" name="physicalAddress" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Employment */}
      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Occupation" htmlFor="occupation">
            <Input id="occupation" name="occupation" />
          </Field>
          <Field label="Employer" htmlFor="employer">
            <Input id="employer" name="employer" />
          </Field>
        </CardContent>
      </Card>

      {/* Next of kin */}
      <Card>
        <CardHeader>
          <CardTitle>Next of kin &amp; emergency</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Next of kin name" htmlFor="nextOfKinName">
            <Input id="nextOfKinName" name="nextOfKinName" />
          </Field>
          <Field label="Relationship" htmlFor="nextOfKinRelationship">
            <Input id="nextOfKinRelationship" name="nextOfKinRelationship" placeholder="Spouse, parent…" />
          </Field>
          <Field label="Next of kin phone" htmlFor="nextOfKinPhone">
            <Input id="nextOfKinPhone" name="nextOfKinPhone" />
          </Field>
          <Field label="Emergency contact" htmlFor="emergencyContact" hint="If different from next of kin">
            <Input id="emergencyContact" name="emergencyContact" />
          </Field>
        </CardContent>
      </Card>

      {/* Unit allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Unit allocations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Optionally assign this tenant to one or more vacant units. Each allocation creates an
            active lease and generates the first invoice. You can also do this later from the tenant
            page.
          </p>

          {vacantUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vacant units available to allocate.</p>
          ) : null}

          {rows.map((row, i) => (
            <div key={i} className="space-y-4 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Allocation {i + 1}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </Button>
              </div>
              <Field label="Unit" htmlFor={`unit-${i}`}>
                <Select
                  id={`unit-${i}`}
                  value={row.unitId}
                  onChange={(e) => onPickUnit(i, e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a vacant unit
                  </option>
                  {unitsFor(i).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label} ({formatKES(u.monthlyRent)})
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Start date" htmlFor={`start-${i}`}>
                  <Input
                    id={`start-${i}`}
                    type="date"
                    value={row.startDate}
                    onChange={(e) => updateRow(i, { startDate: e.target.value })}
                    required
                  />
                </Field>
                <Field label="End date" htmlFor={`end-${i}`} hint="Optional">
                  <Input
                    id={`end-${i}`}
                    type="date"
                    value={row.endDate}
                    onChange={(e) => updateRow(i, { endDate: e.target.value })}
                  />
                </Field>
                <Field label="Monthly rent (KES)" htmlFor={`rent-${i}`}>
                  <Input
                    id={`rent-${i}`}
                    type="number"
                    min="0"
                    value={row.rentAmount}
                    onChange={(e) => updateRow(i, { rentAmount: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Deposit (KES)" htmlFor={`deposit-${i}`}>
                  <Input
                    id={`deposit-${i}`}
                    type="number"
                    min="0"
                    value={row.deposit}
                    onChange={(e) => updateRow(i, { deposit: e.target.value })}
                  />
                </Field>
                <Field label="Payment due day" htmlFor={`due-${i}`} hint="Day of month (1–28)">
                  <Input
                    id={`due-${i}`}
                    type="number"
                    min="1"
                    max="28"
                    value={row.paymentDueDay}
                    onChange={(e) => updateRow(i, { paymentDueDay: e.target.value })}
                    required
                  />
                </Field>
              </div>
            </div>
          ))}

          {vacantUnits.length > 0 && rows.length < vacantUnits.length ? (
            <Button type="button" variant="outline" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
              + Add unit
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Internal notes" htmlFor="notes">
            <Textarea id="notes" name="notes" placeholder="Anything staff should know about this tenant…" />
          </Field>
        </CardContent>
      </Card>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex justify-end gap-2">
        <SubmitButton>Create tenant</SubmitButton>
      </div>
    </form>
  );
}
