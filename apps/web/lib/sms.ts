import "server-only";
import type { TypedSupabaseClient } from "@nyumba360/supabase";

interface SendSmsArgs {
  orgId: string;
  phone: string;
  message: string;
}

/**
 * Send an SMS via Africa's Talking and record it in `sms_logs` (PRD §6.9, §10).
 *
 * Mock mode: when AT_API_KEY is unset the message is logged as `sent` without
 * any network call, so the whole app works offline. Set AT_API_KEY (+ sandbox
 * or live AT_USERNAME / AT_SENDER_ID) and it sends for real with no code change.
 *
 * Never throws — SMS failures are logged to the row, not propagated, so they
 * can't break the action that triggered them.
 */
export async function sendSms(
  supabase: TypedSupabaseClient,
  { orgId, phone, message }: SendSmsArgs,
): Promise<void> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || "sandbox";
  const sender = process.env.AT_SENDER_ID || undefined;

  const { data: log } = await supabase
    .from("sms_logs")
    .insert({ org_id: orgId, recipient_phone: phone, message, status: "queued" })
    .select("id")
    .single();
  const logId = log?.id;

  // Mock mode — no credentials configured.
  if (!apiKey) {
    if (logId) {
      await supabase
        .from("sms_logs")
        .update({ status: "sent", at_message_id: "mock", sent_at: new Date().toISOString() })
        .eq("id", logId);
    }
    return;
  }

  const base = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  try {
    const body = new URLSearchParams({ username, to: phone, message });
    if (sender) body.set("from", sender);

    const res = await fetch(`${base}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
    const json = (await res.json()) as {
      SMSMessageData?: { Recipients?: { status?: string; messageId?: string }[] };
    };
    const recipient = json.SMSMessageData?.Recipients?.[0];
    const success = res.ok && recipient?.status === "Success";

    if (logId) {
      await supabase
        .from("sms_logs")
        .update({
          status: success ? "sent" : "failed",
          at_message_id: recipient?.messageId ?? null,
          error: success ? null : recipient?.status ?? `HTTP ${res.status}`,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }
  } catch (err) {
    if (logId) {
      await supabase
        .from("sms_logs")
        .update({ status: "failed", error: err instanceof Error ? err.message : "send failed" })
        .eq("id", logId);
    }
  }
}
