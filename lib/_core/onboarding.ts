import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const ONBOARDING_COMPLETED_KEY = "nota10:onboarding:completed:v1";

function readWebStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY);
  } catch {
    return null;
  }
}

async function writeWebStorage(value: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, value);
  } catch {
    // Ignore web storage failures to avoid blocking login.
  }
}

export async function isOnboardingCompleted(): Promise<boolean> {
  if (Platform.OS === "web") {
    return readWebStorage() === "true";
  }

  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  if (Platform.OS === "web") {
    await writeWebStorage("true");
    return;
  }

  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  } catch {
    // Ignore persistence failures and continue.
  }
}
