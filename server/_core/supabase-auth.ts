import { createRemoteJWKSet, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { serverLogger } from "./logger";

type SupabaseJwtPayload = {
  sub?: unknown;
  email?: unknown;
  app_metadata?: {
    provider?: unknown;
  };
  user_metadata?: {
    name?: unknown;
    full_name?: unknown;
    display_name?: unknown;
  };
};

let cachedJwks:
  | {
      url: string;
      set: ReturnType<typeof createRemoteJWKSet>;
    }
  | null = null;

function getIssuerUrl(): string {
  return `${ENV.supabaseUrl.replace(/\/+$/, "")}/auth/v1`;
}

function getJwks() {
  const issuer = getIssuerUrl();
  const jwksUrl = `${issuer}/keys`;

  if (cachedJwks && cachedJwks.url === jwksUrl) {
    return cachedJwks.set;
  }

  const set = createRemoteJWKSet(new URL(jwksUrl));
  cachedJwks = { url: jwksUrl, set };
  return set;
}

function normalizeProvider(raw: unknown): "supabase_google" | "supabase_apple" | "legacy_oauth" {
  const provider = typeof raw === "string" ? raw.toLowerCase() : "";
  if (provider === "google") return "supabase_google";
  if (provider === "apple") return "supabase_apple";
  return "legacy_oauth";
}

function normalizeName(payload: SupabaseJwtPayload): string | null {
  const candidates = [
    payload.user_metadata?.name,
    payload.user_metadata?.full_name,
    payload.user_metadata?.display_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export async function authenticateSupabaseBearerToken(token: string): Promise<User | null> {
  if (!ENV.authSupabaseEnabled || !ENV.supabaseUrl) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: getIssuerUrl(),
    });

    const claims = payload as SupabaseJwtPayload;
    const sub = typeof claims.sub === "string" ? claims.sub : "";
    if (!sub) return null;

    const provider = normalizeProvider(claims.app_metadata?.provider);
    const openId = `supabase:${sub}`.slice(0, 191);
    const name = normalizeName(claims);
    const email = typeof claims.email === "string" ? claims.email : null;

    const existing = await db.getUserByAnyIdentity({
      supabaseUserId: sub,
      openId,
    });

    await db.upsertUser({
      openId: existing?.openId ?? openId,
      supabaseUserId: sub,
      authProvider: provider,
      name: name ?? existing?.name ?? null,
      email: email ?? existing?.email ?? null,
      loginMethod: provider === "supabase_google" ? "google" : provider === "supabase_apple" ? "apple" : "oauth",
      lastSignedIn: new Date(),
    });

    const user = await db.getUserBySupabaseUserId(sub);
    return user ?? null;
  } catch (error) {
    serverLogger.warn("auth.supabase_token_verification_failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}
