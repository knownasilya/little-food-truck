import "dotenv/config";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../lib/env.js";

// Runs every per-region real-truck seed script (seed-sc-ga-trucks.ts,
// seed-ar-ca-trucks.ts, ...) in one pass — each one still runs as its own
// child process (same `node --import tsx <file>` invocation as this
// package's own "start" script), so a single region's exit code/output
// never gets tangled up with another's, and one region failing doesn't
// stop the rest from being attempted. Matches seed-*-trucks.ts, two
// lowercase state-code segments — deliberately excludes this directory's
// non-region seed scripts (seed.ts, seed-region-trucks.ts,
// seed-unclaimed-trucks.ts).
const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here)
  .filter((f) => /^seed-[a-z]{2}-[a-z]{2}-trucks\.ts$/.test(f))
  .sort();

if (files.length === 0) {
  console.error("No per-region truck seed files found in", here);
  process.exit(1);
}

console.log(`Connecting to: ${new URL(env.DATABASE_URL).host}`);
console.log(`Running ${files.length} region seed scripts: ${files.map((f) => f.replace(/^seed-|-trucks\.ts$/g, "")).join(", ")}\n`);

const failed: string[] = [];
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, ["--import", "tsx", join(here, file)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) failed.push(file);
}

console.log(`\n${files.length - failed.length}/${files.length} region scripts completed without error.`);
if (failed.length > 0) {
  console.error(`Failed: ${failed.join(", ")}`);
}
process.exit(failed.length > 0 ? 1 : 0);
