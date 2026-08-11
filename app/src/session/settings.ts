import { appGet, appSet } from "../storage/repo";

/** Non-secret app preferences. Safe to store in the clear. */
export interface Settings {
  theme: "system" | "light" | "dark";
  inactivityLockSeconds: number;
  lockPrivateOnBackground: boolean;
  lockFinanceOnBackground: boolean;
  lockOnComputerConnection: boolean;
  minimalNotifications: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  inactivityLockSeconds: 120,
  lockPrivateOnBackground: true,
  lockFinanceOnBackground: false,
  lockOnComputerConnection: true,
  minimalNotifications: true,
};

const KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  const stored = await appGet<Partial<Settings>>(KEY);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(s: Settings): Promise<void> {
  await appSet(KEY, s);
}
