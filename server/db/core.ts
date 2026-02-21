import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlClient: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _sqlClient = postgres(process.env.DATABASE_URL, {
        max: 10,
        prepare: false,
      });
      _db = drizzle(_sqlClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_sqlClient) {
    await _sqlClient.end({ timeout: 5 });
    _sqlClient = null;
  }
  _db = null;
}
