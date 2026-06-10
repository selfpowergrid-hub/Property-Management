"use client";

import { useFormState } from "react-dom";
import { createOrganisationAction } from "@/app/actions/organisation";
import type { ActionState } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function OnboardingForm() {
  const [state, action] = useFormState(createOrganisationAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register your company</CardTitle>
        <CardDescription>
          This is your company account — every property, tenant, and report lives under it, fully
          isolated from other companies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" name="name" placeholder="e.g. Mwangi Holdings Ltd" required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration no.</Label>
              <Input id="registrationNumber" name="registrationNumber" placeholder="e.g. CPR/2020/123456" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kraPin">KRA PIN</Label>
              <Input id="kraPin" name="kraPin" placeholder="A012345678Z" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+254700000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="info@company.co.ke" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input id="county" name="county" placeholder="e.g. Nairobi" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalAddress">Postal address</Label>
              <Input id="postalAddress" name="postalAddress" placeholder="P.O. Box 0000-00100" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Physical address</Label>
            <Input id="address" name="address" placeholder="Building, street, town" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Company logo</Label>
            <Input id="logo" name="logo" type="file" accept="image/*" />
            <p className="text-xs text-muted-foreground">Shown in the sidebar, receipts, and reports.</p>
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton className="w-full">Create company</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
