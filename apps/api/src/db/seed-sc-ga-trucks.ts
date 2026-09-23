import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, closeDb } from "./client.js";
import { truckProfiles, users } from "./schema.js";
import { env } from "../lib/env.js";
import { supabaseAdmin } from "../lib/supabase.js";

// Adds real, currently-operating South Carolina/Georgia food trucks as
// unclaimed listings — same shape POST /api/admin/trucks produces (see
// routes/admin.ts): a full, login-locked placeholder account per truck,
// plus a claim link the real owner can use to submit a claim request (see
// routes/claim.ts). Researched from public sources (food-truck
// directories, local news coverage, each truck's own site/social) — see
// the source notes inline. Deliberately no `claimEmail`/personal contact
// info: nothing here claims to have verified who the real owner is, that's
// exactly what the claim-request review step is for. Idempotent by design
// (each truck's placeholder email is deterministic from its name — see the
// `email` line below) — safely re-runnable after a partial failure (a
// dropped connection, a rate limit, ...): already-seeded trucks are
// skipped, not duplicated, and one truck's own failure doesn't stop the
// rest from being attempted.
const CLAIM_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// Well-known city-center coordinates, not a specific truck's real
// location — same "usually found around <city>" approximation already
// used for demo trucks in this file and the unclaimed-trucks block above.
// Precise, on-the-day location is exactly what the real owner sets after
// claiming (schedule entries / default location — see db/schema.ts).
const cities = {
  "North Charleston, SC": { lat: 32.8546, lng: -79.9748 },
  "Columbia, SC": { lat: 34.0007, lng: -81.0348 },
  "Greenville, SC": { lat: 34.8526, lng: -82.394 },
  "North Myrtle Beach, SC": { lat: 33.8162, lng: -78.6803 },
  "Aiken, SC": { lat: 33.5601, lng: -81.7196 },
  "Atlanta, GA": { lat: 33.749, lng: -84.388 },
  "Savannah, GA": { lat: 32.0809, lng: -81.0912 },
  "Athens, GA": { lat: 33.9519, lng: -83.3576 },
} as const;

const trucks = [
  {
    name: "Dave's Smoke & Tacos",
    city: "North Charleston, SC",
    cuisine: "bbq" as const,
    description: "A food trailer that blends slow-smoked barbecue with Mexican street-food flavors.",
    website: "https://davessmokeandtacos.com",
    phone: "(443) 504-8975",
  },
  {
    name: "The Wurst Wagen",
    city: "Columbia, SC",
    cuisine: "other" as const,
    description: "A German food truck serving housemade bratwurst, curry wurst, and schnitzel.",
    website: "https://thewurstwagen.com",
  },
  {
    name: "Doko Smoke Barbeque",
    city: "Columbia, SC",
    cuisine: "bbq" as const,
    description: "A competition pitmaster's truck with an onboard smoker, known for brisket and pulled pork.",
    website: "https://dokosmoke.com",
  },
  {
    name: "The Wok Lobster",
    city: "Greenville, SC",
    cuisine: "asian" as const,
    description: "Voted Best Food Truck of the Upstate 2024 for Asian-American fusion dishes like Korean corn dogs and lobster corn dogs.",
    website: "https://thewoklobster.net",
  },
  {
    name: "We Got The Beets",
    city: "Greenville, SC",
    cuisine: "vegan" as const,
    description: "Greenville's first cruelty-free food truck, serving plant-based versions of classic sandwiches.",
  },
  {
    name: "Henry's Hog Hauler",
    city: "Greenville, SC",
    cuisine: "bbq" as const,
    description: "The mobile arm of Greenville institution Henry's Smokehouse, serving slow-smoked pulled pork and ribs.",
    website: "https://henryssmokehouse.com",
    phone: "(864) 918-6228",
  },
  {
    name: "Benito's Rolling Oven",
    city: "North Myrtle Beach, SC",
    cuisine: "other" as const,
    description: "A wood-fired pizza truck making gourmet Neapolitan-style pies on site.",
    website: "https://benitosrollingoven.com",
    phone: "(843) 798-8242",
  },
  {
    name: "Vita Nova Traveling Cafe",
    city: "Greenville, SC",
    cuisine: "coffee" as const,
    description: "A mobile espresso and coffee cafe that caters events across the Upstate.",
    phone: "(864) 905-6905",
  },
  {
    name: "Dos Potrillos Mexican Food Truck",
    city: "Aiken, SC",
    cuisine: "mexican" as const,
    description: "A family-run truck serving authentic Mexico City-style tacos al pastor and quesabirria.",
  },
  {
    name: "Bento Bus",
    city: "Atlanta, GA",
    cuisine: "asian" as const,
    description: "A long-running Japanese food truck serving organic rice bowls, sushi burritos, and curry.",
    phone: "(678) 439-6277",
  },
  {
    name: "The Pickle",
    city: "Atlanta, GA",
    cuisine: "american" as const,
    description: "Atlanta's original gourmet food truck, operating since 2004 with a Tex-Mex, Southern, and Bayou menu.",
    website: "https://thepickleatl.com",
  },
  {
    name: "Astros Corn Dogs",
    city: "Atlanta, GA",
    cuisine: "dessert" as const,
    description: "A specialty corn dog truck known for Korean-style and dessert-twist corn dogs like the cinnamon-sugar Star Dust Dog.",
  },
  {
    name: "Crispi",
    city: "Savannah, GA",
    cuisine: "american" as const,
    description: "A smash-burger trailer parked at Two Tides Brewing in Savannah's Starland District.",
  },
  {
    name: "Yoshi's Kitchen",
    city: "Savannah, GA",
    cuisine: "asian" as const,
    description: "A Japanese food truck run by a sushi-chef family, best known for its donburi fried-shrimp rice bowl.",
    phone: "(912) 704-8915",
  },
  {
    name: "Molly's Fish & Chips n More",
    city: "Savannah, GA",
    cuisine: "seafood" as const,
    description: "The mobile arm of a Savannah Scottish pub, serving fish and chips and seafood combos.",
    phone: "(912) 777-2259",
  },
  {
    name: "Cafe Racer",
    city: "Athens, GA",
    cuisine: "american" as const,
    description: "An Athens staple since 2018, known for double-stacked smash burgers and breakfast tacos.",
    website: "https://caferacerfoodtruck.com",
  },
];

let created = 0;
let skipped = 0;
let failed = 0;

for (const truck of trucks) {
  const slug = truck.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const email = `unclaimed-${slug}@trucks.invalid`;

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) {
      console.log(`${truck.name} (${truck.city}): already seeded, skipping`);
      skipped++;
      continue;
    }

    const placeholderPassword = randomBytes(24).toString("hex");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: placeholderPassword,
      email_confirm: true,
      app_metadata: { role: "truck" },
      user_metadata: { displayName: truck.name },
    });
    if (error || !data.user) {
      throw new Error(`Could not create auth user: ${error?.message}`);
    }
    const userId = data.user.id;
    const { lat, lng } = cities[truck.city as keyof typeof cities];

    await db.insert(users).values({ id: userId, email, role: "truck", displayName: truck.name });

    const claimToken = randomBytes(32).toString("hex");
    await db.insert(truckProfiles).values({
      userId,
      name: truck.name,
      description: `${truck.description} Usually found around ${truck.city}.`,
      cuisine: truck.cuisine,
      lat,
      lng,
      website: truck.website ?? null,
      phone: truck.phone ?? null,
      claimToken,
      claimTokenExpiresAt: new Date(Date.now() + CLAIM_TOKEN_TTL_MS),
    });

    console.log(`${truck.name} (${truck.city}): ${env.WEB_ORIGIN}/claim?token=${claimToken}`);
    created++;
  } catch (err) {
    console.error(`${truck.name} (${truck.city}): FAILED — ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

console.log(`\n${created} created, ${skipped} already existed, ${failed} failed (of ${trucks.length}).`);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
