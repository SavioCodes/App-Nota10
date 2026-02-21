import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

import { getSupabaseClient, isSupabaseAuthEnabled } from "@/lib/supabase/client";

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME ?? "",
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }

  type BufferLike = {
    from: (input: string, encoding: string) => { toString: (encoding: string) => string };
  };
  const maybeBuffer = (globalThis as { Buffer?: BufferLike }).Buffer;
  if (maybeBuffer?.from) {
    return maybeBuffer.from(value, "utf-8").toString("base64");
  }

  return value;
};

export const getRedirectUri = () => {
  const supabaseEnabled = isSupabaseAuthEnabled();

  if (ReactNative.Platform.OS === "web") {
    if (supabaseEnabled && typeof window !== "undefined") {
      return `${window.location.origin}/oauth/callback`;
    }
    return `${getApiBaseUrl()}/api/oauth/callback`;
  }

  if (env.deepLinkScheme) {
    return Linking.createURL("/oauth/callback", { scheme: env.deepLinkScheme });
  }

  return Linking.createURL("/oauth/callback");
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};

async function startSupabaseOAuthLogin(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const provider: "google" | "apple" =
    ReactNative.Platform.OS === "ios" ? "apple" : "google";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getRedirectUri(),
      skipBrowserRedirect: true,
      queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
    },
  });

  if (error) {
    return null;
  }

  const loginUrl = data?.url;
  if (!loginUrl) {
    return null;
  }

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return loginUrl;
  }

  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch {
    return null;
  }

  return loginUrl;
}

export async function startOAuthLogin(): Promise<string | null> {
  if (isSupabaseAuthEnabled()) {
    return startSupabaseOAuthLogin();
  }

  const loginUrl = getLoginUrl();
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch {
    return null;
  }

  return null;
}
