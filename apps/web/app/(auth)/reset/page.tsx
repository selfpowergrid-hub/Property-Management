"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction, type ActionState } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState & { sent?: boolean } = {};

export default function ResetPage() {
  const [state, action] = useFormState(requestPasswordResetAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          We&apos;ll email you a reset link. SMS OTP reset (PRD AUTH-06) arrives in Phase 3.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.sent ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            If that email exists, a reset link is on its way.
          </p>
        ) : (
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton className="w-full">Send reset link</SubmitButton>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
