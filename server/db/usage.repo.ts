import { and, eq, sql } from "drizzle-orm";
import { usageCounters } from "../../drizzle/schema";
import { getDb } from "./core";

export async function getDailyUsage(userId: number, date: string) {
  const db = await getDb();
  if (!db) return { conversionCount: 0 };
  const result = await db
    .select()
    .from(usageCounters)
    .where(and(eq(usageCounters.userId, userId), eq(usageCounters.date, date)))
    .limit(1);
  return result[0] || { conversionCount: 0 };
}

export async function incrementDailyUsage(userId: number, date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(usageCounters)
    .values({ userId, date, conversionCount: 1 })
    .onDuplicateKeyUpdate({ set: { conversionCount: sql`${usageCounters.conversionCount} + 1` } });
}
