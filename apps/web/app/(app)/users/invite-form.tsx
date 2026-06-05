"use client";

import { useFormState } from "react-dom";
import { INVITABLE_ROLES, ROLE_LABELS, type UserRole } from "@nyumba360/shared";
import { createInvitationAction } from "@/app/actions/invitations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";

const initial: { error?: string; ok?: boolean; link?: string } = {};

export function InviteForm() {
  const [state, action] = useFormState(createInvitationAction, initial);

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Invite a user</CardTitle>
        <CardDescription>Managers, caretakers, and accountants.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" defaultValue="manager">
              {INVITABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role as UserRole]}
                </option>
              ))}
            </Select>
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.ok && state.link ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Invitation created. Share this link (SMS/email delivery is wired in Phase 3):
              <code className="mt-1 block break-all text-xs">{state.link}</code>
            </div>
          ) : null}
          <SubmitButton className="w-full">Send invitation</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
