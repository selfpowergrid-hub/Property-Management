"use client";

import { useFormState } from "react-dom";
import { submitPublicInquiryAction } from "@/app/actions/public-inquiry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

const initial: { error?: string; ok?: boolean } = {};

export function ListingInquiryForm({ unitId }: { unitId: string }) {
  const [state, action] = useFormState(submitPublicInquiryAction, initial);

  if (state.ok) {
    return (
      <div className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
        Thanks! Your inquiry has been sent — the agent will get in touch shortly.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="unitId" value={unitId} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="+254700000000" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preferredMoveIn">Preferred move-in (optional)</Label>
        <Input id="preferredMoveIn" name="preferredMoveIn" type="date" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea id="message" name="message" placeholder="When would you like to view it?" />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full">Book a viewing</SubmitButton>
    </form>
  );
}
