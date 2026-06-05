import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Send an Expo push notification to all of a user's registered devices
 * (PRD §7.2). Reads tokens via the service-role client (push_tokens RLS only
 * exposes a user their own rows). No-op when the user has no tokens; never
 * throws — push failures must not break the action that triggered them.
 */
export async function sendPush(
  userId: string | null | undefined,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  if (!userId) return;
  try {
    const admin = createAdminClient();
    const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", userId);
    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({ to: t.token, title, body, sound: "default", data }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch {
    // swallow — best-effort delivery
  }
}
