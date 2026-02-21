import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { appLogger } from "@/lib/_core/logger";
import { toAuthUser } from "@/lib/_core/session-user";
import { getSupabaseClient, isSupabaseAuthEnabled } from "@/lib/supabase/client";

type CallbackStatus = "processing" | "success" | "error";
type QueryUser = {
  id?: number;
  openId?: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: string | number | Date;
};

function decodeBase64User(value: string): QueryUser | null {
  try {
    if (typeof atob === "undefined") return null;
    const decoded = atob(value);
    const parsed = JSON.parse(decoded) as QueryUser;
    return parsed;
  } catch {
    return null;
  }
}

function buildAuthUser(raw: QueryUser | null | undefined): Auth.User | null {
  if (!raw || typeof raw.id !== "number" || typeof raw.openId !== "string") return null;
  return {
    id: raw.id,
    openId: raw.openId,
    name: raw.name ?? null,
    email: raw.email ?? null,
    loginMethod: raw.loginMethod ?? null,
    lastSignedIn: new Date(raw.lastSignedIn ?? Date.now()),
  };
}

function parseHashParams(url: string | null | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const hashIndex = url.indexOf("#");
  if (hashIndex < 0) return new URLSearchParams();
  const hash = url.slice(hashIndex + 1);
  return new URLSearchParams(hash);
}

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    sessionToken?: string;
    user?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const [status, setStatus] = useState<CallbackStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (params.error) {
          setStatus("error");
          setErrorMessage(params.error);
          return;
        }

        if (isSupabaseAuthEnabled()) {
          const supabase = getSupabaseClient();
          const initialUrl = await Linking.getInitialURL();
          const hashParams = parseHashParams(initialUrl);

          const accessToken = params.access_token || hashParams.get("access_token") || undefined;
          const refreshToken = params.refresh_token || hashParams.get("refresh_token") || undefined;
          const authCode = params.code || hashParams.get("code") || undefined;

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              throw new Error(error.message);
            }
          } else if (authCode) {
            const { error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (error) {
              throw new Error(error.message);
            }
          }

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) {
            setStatus("error");
            setErrorMessage("No Supabase session token received.");
            return;
          }

          await Auth.setSessionToken(session.access_token);

          const apiUser = await Api.getMe();
          if (apiUser) {
            await Auth.setUserInfo(toAuthUser(apiUser));
          }

          setStatus("success");
          setTimeout(() => router.replace("/(tabs)"), 800);
          return;
        }

        if (params.sessionToken) {
          await Auth.setSessionToken(params.sessionToken);
          const userFromParam = buildAuthUser(decodeBase64User(params.user || ""));
          if (userFromParam) {
            await Auth.setUserInfo(userFromParam);
          }
          setStatus("success");
          setTimeout(() => router.replace("/(tabs)"), 800);
          return;
        }

        const url = await Linking.getInitialURL();
        const parsed = url ? new URL(url) : null;
        const code = params.code || parsed?.searchParams.get("code") || "";
        const state = params.state || parsed?.searchParams.get("state") || "";
        const tokenFromUrl = parsed?.searchParams.get("sessionToken");

        if (tokenFromUrl) {
          await Auth.setSessionToken(tokenFromUrl);
          setStatus("success");
          setTimeout(() => router.replace("/(tabs)"), 800);
          return;
        }

        if (!code || !state) {
          setStatus("error");
          setErrorMessage("Missing OAuth callback parameters.");
          return;
        }

        const result = await Api.exchangeOAuthCode(code, state);
        if (!result.sessionToken) {
          setStatus("error");
          setErrorMessage("No session token received.");
          return;
        }

        await Auth.setSessionToken(result.sessionToken);
        const user = buildAuthUser(result.user as QueryUser);
        if (user) {
          await Auth.setUserInfo(user);
        }

        setStatus("success");
        setTimeout(() => router.replace("/(tabs)"), 800);
      } catch (error) {
        appLogger.error("oauth.callback_failed", {
          message: error instanceof Error ? error.message : "unknown_error",
        });
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to complete authentication.");
      }
    };

    run();
  }, [params.access_token, params.code, params.error, params.refresh_token, params.sessionToken, params.state, params.user, router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Finalizando autenticacao...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">Autenticacao concluida.</Text>
            <Text className="text-base leading-6 text-center text-foreground">Redirecionando...</Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">Falha na autenticacao</Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage || "Erro desconhecido."}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
