"use server";

import { redirect } from "next/navigation";
import { signInSchema, signUpSchema } from "@nyumba360/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionState {
  error?: string;
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  // Middleware routes the user to their role home on the next navigation.
  redirect("/");
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Create the account already-confirmed (via the admin client) so the new
  // landlord gets a session immediately and flows into company setup — rather
  // than bouncing to login when the project requires email confirmation.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError) {
    const msg = /already.*registered|exists/i.test(createError.message)
      ? "An account with this email already exists. Please sign in."
      : createError.message;
    return { error: msg };
  }

  // Establish the session, then continue to "Register your company".
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return { error: signInError.message };

  // New landlord has no org/role yet → onboarding creates the organisation.
  redirect("/onboarding");
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { sent?: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email" };

  const supabase = await createClient();
  // Phase 1 uses email-based reset; PRD AUTH-06 (SMS OTP) is wired in Phase 3.
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: error.message };
  return { sent: true };
}
