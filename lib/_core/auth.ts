import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";
import { appLogger } from "@/lib/_core/logger";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(SESSION_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    appLogger.warn("auth.session_token_read_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (error) {
    appLogger.error("auth.session_token_write_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    throw error;
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    appLogger.warn("auth.session_token_delete_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? window.localStorage.getItem(USER_INFO_KEY)
        : await SecureStore.getItemAsync(USER_INFO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<User, "lastSignedIn"> & { lastSignedIn: string | Date };
    return {
      ...parsed,
      lastSignedIn: new Date(parsed.lastSignedIn),
    };
  } catch (error) {
    appLogger.warn("auth.user_info_read_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    const payload = JSON.stringify(user);
    if (Platform.OS === "web") {
      window.localStorage.setItem(USER_INFO_KEY, payload);
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, payload);
  } catch (error) {
    appLogger.warn("auth.user_info_write_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    appLogger.warn("auth.user_info_delete_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
