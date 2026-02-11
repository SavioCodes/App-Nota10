import { Platform } from "react-native";
import { REVENUECAT_PRODUCT_IDS } from "@shared/revenuecat";

export { REVENUECAT_PRODUCT_IDS };

export function getRevenueCatApiKey(): string | null {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;
  }
  return null;
}

export function isRevenueCatSupportedPlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}
