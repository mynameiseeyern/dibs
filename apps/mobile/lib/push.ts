import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { call } from "./api";

/**
 * Push notifications: a ping when the crew replies, someone joins your plan, or the plan
 * changes (the server sends them; apps/web/lib/push.ts says when and to whom).
 *
 * We never ask on first launch. The ask (`PushAsk`) shows once you've got a plan going, and
 * "Not now" is remembered. Once allowed, the phone registers its token whenever who's signed in
 * changes, so pushes follow the account (or guest pass) on this phone.
 */

const ASKED_KEY = "dibs.pushAsked";
const TOKEN_KEY = "dibs.pushToken";
const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;

// In the app: show it as a banner, quietly.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type PushStatus = "unsupported" | "undetermined" | "granted" | "denied";

/** Simulators and the web can't get pushes. */
const supported = Platform.OS !== "web" && Device.isDevice;

export async function pushStatus(): Promise<PushStatus> {
  if (!supported) return "unsupported";
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return "granted";
  return p.canAskAgain ? "undetermined" : "denied";
}

async function channel() {
  // Android 13+: the permission prompt only appears once a channel exists.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Plans", importance: Notifications.AndroidImportance.HIGH });
  }
}

/** Ask (the system prompt), then register. True if they said yes. */
export async function turnOnPush(): Promise<boolean> {
  if (!supported) return false;
  await channel();
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  await rememberAsked();
  if (!p.granted) return false;
  await registerPush();
  return true;
}

/** Already allowed: tell the server this phone's token, for whoever's here now. */
export async function registerPush(): Promise<void> {
  if (!supported || (await pushStatus()) !== "granted") return;
  try {
    await channel();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await call("/api/v1/push", { method: "POST", body: { token, platform: Platform.OS } });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // Offline, or nobody to register for yet (a 401 before the first plan): next time.
  }
}

/** Signing out: stop pushes to this phone for that account. */
export async function forgetPush(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) await call("/api/v1/push", { method: "DELETE", body: { token }, auth: false });
  } catch {
    // Best effort: the server also drops tokens Expo says are gone.
  }
}

async function rememberAsked() {
  try {
    await SecureStore.setItemAsync(ASKED_KEY, "1");
  } catch {}
}

/** Should the ask show: notifications not decided yet, and not waved off before. */
export function useShouldAskPush() {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      const status = await pushStatus();
      const asked = await SecureStore.getItemAsync(ASKED_KEY).catch(() => null);
      if (live) setAsk(status === "undetermined" && !asked);
    })();
    return () => {
      live = false;
    };
  }, []);
  return { ask, dismiss: () => (setAsk(false), void rememberAsked()) };
}

/**
 * Mounted once at the root: registers when who's here changes, and a tap on a notification
 * opens its plan (or its chat). Works from a cold start too.
 */
export function usePushSetup(who: string) {
  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    registerPush();
  }, [who]);

  useEffect(() => {
    if (!last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = last.notification.request.content.data?.url;
    if (typeof url === "string" && url.startsWith("/p/")) {
      router.push(url as `/p/${string}`);
      Notifications.clearLastNotificationResponse();
    }
  }, [last]);
}
