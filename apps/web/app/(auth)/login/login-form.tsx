"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signInAction, type ActionState } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function LoginForm({ invited }: { invited: boolean }) {
  const [state, action] = useFormState(signInAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Enter your details to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        {invited ? (
          <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Your account is ready — sign in to get started.
          </p>
        ) : null}
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/reset" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </form>
        <div className="mt-6 border-t pt-5">
          <p className="mb-2 text-center text-sm text-muted-foreground">New to LogiQ Estates Pro?</p>
          <Link href="/signup" className={`${buttonVariants({ variant: "outline" })} w-full`}>
            Register your company
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
