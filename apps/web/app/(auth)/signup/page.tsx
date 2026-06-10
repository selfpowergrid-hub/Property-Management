"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signUpAction, type ActionState } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export default function SignUpPage() {
  const [state, action] = useFormState(signUpAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your landlord account</CardTitle>
        <CardDescription>Start managing your properties on LogiQ Estates Pro.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton className="w-full">Create account</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
