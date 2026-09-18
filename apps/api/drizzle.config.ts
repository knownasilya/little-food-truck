import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  // Our schema.ts declares a stub for Supabase's own auth.users table (see
  // the authUsers export) purely so our tables can FK into it — this makes
  // sure db:push never tries to create/alter anything in that schema.
  schemaFilter: ["public"],
});
