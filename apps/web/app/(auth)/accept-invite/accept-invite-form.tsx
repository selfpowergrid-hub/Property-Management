"use client";

import { useFormState } from "react-dom";
import { acceptInvitationAction } from "@/app/actions/invitations";
import type { ActionState } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useFormState(acceptInvitationAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept your invitation</CardTitle>
        <CardDescription>Set your name and a password to join the team.</CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <form action={action} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton className="w-full">Join organisation</SubmitButton>
          </form>
        ) : (
          <p className="text-sm text-destructive">This invitation link is missing its token.</p>
        )}
      </CardContent>
    </Card>
  );
}
