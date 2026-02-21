import { eq, or } from "drizzle-orm";
import type { InsertUser } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "./core";

type UpsertUserInput = InsertUser & {
  supabaseUserId?: string | null;
};

function normalizeOpenId(input: UpsertUserInput): string {
  if (input.openId && input.openId.trim().length > 0) {
    return input.openId;
  }

  if (input.supabaseUserId && input.supabaseUserId.trim().length > 0) {
    return `supabase:${input.supabaseUserId}`.slice(0, 191);
  }

  throw new Error("User openId is required for upsert");
}

export async function upsertUser(user: UpsertUserInput): Promise<void> {
  const openId = normalizeOpenId(user);
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = {
    openId,
    ...(user.supabaseUserId !== undefined ? { supabaseUserId: user.supabaseUserId ?? null } : {}),
    ...(user.authProvider !== undefined ? { authProvider: user.authProvider ?? null } : {}),
    ...(user.name !== undefined ? { name: user.name ?? null } : {}),
    ...(user.email !== undefined ? { email: user.email ?? null } : {}),
    ...(user.loginMethod !== undefined ? { loginMethod: user.loginMethod ?? null } : {}),
    ...(user.lastSignedIn !== undefined ? { lastSignedIn: user.lastSignedIn } : {}),
    ...(user.role !== undefined
      ? { role: user.role }
      : openId === ENV.ownerOpenId
        ? { role: "admin" }
        : {}),
  };

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.loginMethod !== undefined ? { loginMethod: values.loginMethod } : {}),
        ...(values.lastSignedIn !== undefined ? { lastSignedIn: values.lastSignedIn } : {}),
        ...(values.role !== undefined ? { role: values.role } : {}),
        ...(values.supabaseUserId !== undefined ? { supabaseUserId: values.supabaseUserId } : {}),
        ...(values.authProvider !== undefined ? { authProvider: values.authProvider } : {}),
        updatedAt: new Date(),
      },
    });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserBySupabaseUserId(supabaseUserId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.supabaseUserId, supabaseUserId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByAnyIdentity(input: { openId?: string | null; supabaseUserId?: string | null }) {
  const db = await getDb();
  if (!db) return undefined;

  const clauses = [];
  if (input.openId) clauses.push(eq(users.openId, input.openId));
  if (input.supabaseUserId) clauses.push(eq(users.supabaseUserId, input.supabaseUserId));
  if (clauses.length === 0) return undefined;

  const result = await db.select().from(users).where(or(...clauses)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
