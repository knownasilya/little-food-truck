import "dotenv/config";

// Generic runner for the per-region real-truck seed scripts
// (seed-sc-ga-trucks.ts, seed-ar-ca-trucks.ts, ...) — added once the
// per-region named package.json scripts started piling up one pair of
// states at a time. Each region file is still a normal, independently
// runnable module (own top-level await, own process.exit) — this just
// dynamically imports the one named on the command line instead of
// needing its own package.json entry.
//
// Usage: pnpm db:seed:region <region-slug>   (e.g. sc-ga, ar-ca — pnpm run,
//        unlike npm run, passes extra args straight through without a `--`)
//        pnpm db:seed:region:prod <region-slug>
const region = process.argv[2];
if (!region) {
  console.error("Usage: tsx seed-region-trucks.ts <region-slug>  (e.g. sc-ga, matching seed-<region-slug>-trucks.ts)");
  process.exit(1);
}

await import(`./seed-${region}-trucks.js`);
