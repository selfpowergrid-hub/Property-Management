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
        <CardTitle>Set up your organisation</CardTitle>
        <CardDescription>
          This is your landlord account — every property, tenant, and report lives under it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organisation name</Label>
            <Input id="name" name="name" placeholder="e.g. Mwangi Holdings" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="county">County</Label>
            <Input id="county" name="county" placeholder="e.g. Nairobi" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton className="w-full">Create organisation</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
