import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../lib/env.js";
import * as schema from "./schema.js";

// Exported so index.ts can close it on shutdown (see closeDb below) —
// without that, SIGTERM during a rolling deploy leaves connections open
// until the pool's own idle timeout, which can exhaust the database's
// connection limit under repeated deploys.
export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
