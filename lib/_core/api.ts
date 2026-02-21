import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { appLogger } from "@/lib/_core/logger";

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let errorMessage = errorText || `API call failed: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson?.error) errorMessage = String(errorJson.error);
      else if (errorJson?.message) errorMessage = String(errorJson.message);
    } catch {
      // Keep plain text error.
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }
  const text = await response.text();
  return (text ? (JSON.parse(text) as T) : ({} as T));
}

export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: unknown }> {
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  const result = await apiCall<{ app_session_id: string; user: unknown }>(endpoint);
  return {
    sessionToken: result.app_session_id,
    user: result.user,
  };
}

export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
} | null> {
  try {
    const result = await apiCall<{ user: unknown }>("/api/auth/me");
    const user = result.user as
      | {
          id: number;
          openId: string;
          name: string | null;
          email: string | null;
          loginMethod: string | null;
          lastSignedIn: string;
        }
      | null
      | undefined;
    return user ?? null;
  } catch (error) {
    appLogger.warn("api.get_me_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}

export async function establishSession(token: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/auth/session`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    return response.ok;
  } catch (error) {
    appLogger.warn("api.establish_session_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return false;
  }
}
