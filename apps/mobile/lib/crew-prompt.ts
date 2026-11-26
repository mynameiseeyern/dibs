// "Turn this into a crew?" (ARV-96): which groups of people you've said "Not now" to, on this phone.
// Keyed by a short hash of the people, so the same group stays dismissed on every plan.

import * as SecureStore from "expo-secure-store";

const KEY = "dibs.crewPromptDismissed";
const MAX = 40;

function short(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

async function read(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function isDismissed(key: string): Promise<boolean> {
  return (await read()).includes(short(key));
}

export async function dismiss(key: string): Promise<void> {
  const list = (await read()).filter((x) => x !== short(key));
  list.push(short(key));
  await SecureStore.setItemAsync(KEY, JSON.stringify(list.slice(-MAX))).catch(() => {});
}
