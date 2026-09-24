import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Delaware/Hawaii food trucks — see
// seed-unclaimed-trucks.ts for how these get seeded (idempotent, resumable
// unclaimed listings). Researched from public sources (food-truck
// directories, local news coverage, each truck's own site/social).
// Deliberately no `claimEmail`/personal contact info: nothing here claims
// to have verified who the real owner is, that's exactly what the
// claim-request review step is for. Coordinates are well-known city
// centers, not a specific truck's real location — precise, on-the-day
// location is exactly what the real owner sets after claiming (schedule
// entries / default location — see db/schema.ts). Delaware and Hawaii both
// have smaller food-truck scenes than most states, so this list is
// deliberately leaner (14 vs. the usual ~16) rather than padded with
// unverifiable entries.
const trucks: UnclaimedTruckSeed[] = [
  {
    name: "La Pinkeria",
    city: "Rehoboth Beach, DE",
    lat: 38.7209,
    lng: -75.076,
    cuisine: "mexican",
    description: "An eye-catching pink taco truck known for birria tacos, esquites, and its birria grilled cheese.",
    phone: "302-260-0806",
  },
  {
    name: "Cajun-Sno",
    city: "Wilmington, DE",
    lat: 39.7391,
    lng: -75.5398,
    cuisine: "dessert",
    description: "A longtime North Wilmington truck, since 2013, serving New Orleans-style snoballs and stuffed snoballs.",
    website: "https://cajun-sno.com",
    phone: "302-824-2356",
  },
  {
    name: "The Plum Pit",
    city: "Wilmington, DE",
    lat: 39.7391,
    lng: -75.5398,
    cuisine: "other",
    description: "A modern-world-fusion truck known for beef/jerk chicken empanadas and Asian BBQ pulled pork sandwiches.",
    website: "https://plumpitfoodtruck.com",
    phone: "(267) 223-5528",
  },
  {
    name: "Big Bro's BBQ & Soul Food",
    city: "Newark, DE",
    lat: 39.6837,
    lng: -75.7497,
    cuisine: "bbq",
    description: "A family-run truck known for 15-hour wood-smoked BBQ and soul food classics like fried fish and cheesesteaks.",
    website: "https://bigbrosbbq.com",
    phone: "484-908-8510",
  },
  {
    name: "Outlandish Food Truck",
    city: "Newark, DE",
    lat: 39.6837,
    lng: -75.7497,
    cuisine: "american",
    description: "A comfort-food truck known for its grilled-cheese \"Outlandish Sandwich\" and chicken & waffles.",
    phone: "(302) 359-7763",
  },
  {
    name: "Taqueria El Gallito",
    city: "Dover, DE",
    lat: 39.1582,
    lng: -75.5244,
    cuisine: "mexican",
    description: "A family-operated taco truck regarded as one of the state's best, known for birria tacos and smoked pork burritos.",
    website: "https://ordertaqueriaelgallitofoodtruck.com",
  },
  {
    name: "Cousins Maine Lobster – Delaware",
    city: "Newark, DE",
    lat: 39.6837,
    lng: -75.7497,
    cuisine: "seafood",
    description: "The local franchise arm of the national Shark Tank-famous truck, known for Maine lobster rolls and lobster tots.",
    website: "https://cousinsmainelobster.com/locations/delaware",
    phone: "302-300-3302",
  },
  {
    name: "Thai Mee Up",
    city: "Kahului, HI",
    lat: 20.8893,
    lng: -156.4729,
    cuisine: "asian",
    description: "An award-winning Thai truck (2018 Aipono Gold \"Best Food Truck\") known for drunken noodles and pad Thai.",
    phone: "(808) 214-3369",
  },
  {
    name: "Havens",
    city: "Kahului, HI",
    lat: 20.8893,
    lng: -156.4729,
    cuisine: "american",
    description: "A smash-burger truck spun off from a North Kihei restaurant, known for the Deluxe and Umami smash burgers.",
    website: "https://havensmaui.com",
  },
  {
    name: "Like Poke",
    city: "Kahului, HI",
    lat: 20.8893,
    lng: -156.4729,
    cuisine: "seafood",
    description: "A chef-owned truck serving since 2009, with a limited, focused menu of fresh poke and fish katsu.",
    phone: "808-757-8402",
  },
  {
    name: "Papa Len's Hawaiian Food & Catering",
    city: "Kailua, HI",
    lat: 21.4022,
    lng: -157.7394,
    cuisine: "other",
    description: "A family truck known for traditional imu-cooked kalua pig, chicken long rice, and fresh poke.",
    phone: "(808) 777-8989",
  },
  {
    name: "Maria Bonita Lunchwagon",
    city: "Kailua, HI",
    lat: 21.4022,
    lng: -157.7394,
    cuisine: "mexican",
    description: "A cash-only lunch wagon known for large California burritos and fish taco plates.",
    phone: "(808) 286-5113",
  },
  {
    name: "Tin Hut BBQ",
    city: "Honolulu, HI",
    lat: 21.3069,
    lng: -157.8583,
    cuisine: "bbq",
    description: "A disabled-veteran-owned BBQ truck voted Hawaii's Best Food Truck (2017), known for Texas-style brisket and Carolina pulled pork.",
    website: "https://tinhutbbq.com",
  },
  {
    name: "Island Style Grindz",
    city: "Hilo, HI",
    lat: 19.7297,
    lng: -155.09,
    cuisine: "other",
    description: "An owner-operated Big Island truck known for surf 'n' turf, poke nachos, and Korean chicken wings.",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
