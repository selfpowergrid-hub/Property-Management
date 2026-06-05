import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register this device for Expo push and upsert the token into push_tokens for
 * the signed-in user (PRD §7.2). Safe to call repeatedly; no-ops on simulators.
 */
export async function registerForPush(orgId: string, userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  if (!token) return;

  await supabase
    .from("push_tokens")
    .upsert({ org_id: orgId, user_id: userId, token, platform: Platform.OS }, { onConflict: "token" });
}
