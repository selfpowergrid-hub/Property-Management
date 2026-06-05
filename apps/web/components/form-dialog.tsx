"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

type State = { error?: string; ok?: boolean };
type Action = (prev: State, formData: FormData) => Promise<State>;

/**
 * Trigger + modal form wired to a server action via useFormState. Closes and
 * refreshes the route on each successful submission (object identity tracks
 * repeated submits so the dialog reliably closes every time).
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = "Save",
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: Action;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState(action, {});
  const router = useRouter();
  const handled = React.useRef<State | null>(null);

  React.useEffect(() => {
    if (state.ok && state !== handled.current) {
      handled.current = state;
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {children}
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Labelled form control wrapper. */
export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
