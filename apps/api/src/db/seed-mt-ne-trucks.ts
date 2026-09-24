import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Montana/Nebraska food trucks — see
// seed-unclaimed-trucks.ts for how these get seeded (idempotent, resumable
// unclaimed listings). Researched from public sources (food-truck
// directories, local news coverage, each truck's own site/social).
// Deliberately no `claimEmail`/personal contact info: nothing here claims
// to have verified who the real owner is, that's exactly what the
// claim-request review step is for. Coordinates are well-known city
// centers, not a specific truck's real location — precise, on-the-day
// location is exactly what the real owner sets after claiming (schedule
// entries / default location — see db/schema.ts). Montana and Nebraska
// both have smaller food-truck scenes than most states, so this list is
// deliberately leaner (14 vs. the usual ~16) rather than padded with
// unverifiable entries.
const trucks: UnclaimedTruckSeed[] = [
  {
    name: "Lost Texan Pit BBQ",
    city: "Billings, MT",
    lat: 45.7833,
    lng: -108.5007,
    cuisine: "bbq",
    description: "A Texas-style BBQ truck known for post-oak-smoked brisket, sausage, and pulled pork.",
    website: "https://losttexanmt.com",
  },
  {
    name: "Mac Shack",
    city: "Billings, MT",
    lat: 45.7833,
    lng: -108.5007,
    cuisine: "american",
    description: "A rotating-schedule truck known for specialty mac and cheese, including a Chicken Bacon Ranch Mac.",
  },
  {
    name: "Brookie's Cookie Dough",
    city: "Billings, MT",
    lat: 45.7833,
    lng: -108.5007,
    cuisine: "dessert",
    description: "Serves scoops of edible cookie dough paired with Wilcoxson's ice cream.",
    phone: "(406) 672-1752",
  },
  {
    name: "Big Thai Country",
    city: "Missoula, MT",
    lat: 46.8721,
    lng: -113.994,
    cuisine: "asian",
    description: "Missoula's first authentic Thai food truck, a regular at local breweries.",
    website: "https://www.bigthaicountry.com",
    phone: "(406) 240-9511",
  },
  {
    name: "Clove Cart Pizza",
    city: "Missoula, MT",
    lat: 46.8721,
    lng: -113.994,
    cuisine: "other",
    description: "A wood-fired pizza cart using seasonal, local ingredients.",
    website: "https://www.clovecart.com",
  },
  {
    name: "El Rodeo Taco Truck",
    city: "Bozeman, MT",
    lat: 45.677,
    lng: -111.0429,
    cuisine: "mexican",
    description: "A longtime Bozeman taco bus — a converted school bus — known for al pastor and carnitas tacos.",
    phone: "(406) 551-3463",
  },
  {
    name: "Cholms Burger",
    city: "Bozeman, MT",
    lat: 45.677,
    lng: -111.0429,
    cuisine: "american",
    description: "A smash-burger truck in the N 7th Ave food truck court, winner of 2025 Bozeman's Choice for Burgers.",
    phone: "(406) 341-2874",
  },
  {
    name: "Tacos El Valle",
    city: "Great Falls, MT",
    lat: 47.5053,
    lng: -111.3008,
    cuisine: "mexican",
    description: "A street-taco truck known for hand-pressed tortillas and elote.",
    phone: "(720) 899-7267",
  },
  {
    name: "Dos de Oros Taco Truck",
    city: "Omaha, NE",
    lat: 41.2565,
    lng: -95.9345,
    cuisine: "mexican",
    description: "A long-running South Omaha taco truck, since 2003, known for al pastor and chili verde burritos.",
    website: "https://dosdeorostacotruck.shop",
    phone: "(402) 321-2490",
  },
  {
    name: "402 BBQ",
    city: "Omaha, NE",
    lat: 41.2565,
    lng: -95.9345,
    cuisine: "bbq",
    description: "A husband-and-wife-run BBQ truck known for smoked brisket sandwiches and BBQ mac and cheese.",
    website: "https://the402bbq.com",
    phone: "(402) 618-8274",
  },
  {
    name: "Johnny Ricco's Brooklyn Pizza",
    city: "Omaha, NE",
    lat: 41.2565,
    lng: -95.9345,
    cuisine: "other",
    description: "A veteran-owned truck serving New York-style pizza from imported stone-bottom ovens.",
    website: "https://johnnyriccos.com",
    phone: "(704) 807-6836",
  },
  {
    name: "Taqueria Limón",
    city: "Lincoln, NE",
    lat: 40.8136,
    lng: -96.7026,
    cuisine: "mexican",
    description: "A truck on Cornhusker Hwy known for pupusas and made-to-order tacos and tortas.",
    phone: "(402) 975-8991",
  },
  {
    name: "Muchachos Tacos & Food Truck",
    city: "Lincoln, NE",
    lat: 40.8136,
    lng: -96.7026,
    cuisine: "mexican",
    description: "A family truck blending New Mexican and Mexican traditions, known for smoked-meat tacos and tostadas.",
    website: "https://yomuchacho.com",
    phone: "(531) 500-2290",
  },
  {
    name: "The Gilded Swine",
    city: "Lincoln, NE",
    lat: 40.8136,
    lng: -96.7026,
    cuisine: "other",
    description: "A scratch-made sausage and world-street-food truck using locally sourced meats.",
    website: "https://thegildedswine.com",
    phone: "(402) 432-6347",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
