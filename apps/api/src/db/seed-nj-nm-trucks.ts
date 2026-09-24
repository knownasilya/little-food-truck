import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating New Jersey/New Mexico food trucks — see
// seed-unclaimed-trucks.ts for how these get seeded (idempotent, resumable
// unclaimed listings). Researched from public sources (food-truck
// directories, local news coverage, each truck's own site/social).
// Deliberately no `claimEmail`/personal contact info: nothing here claims
// to have verified who the real owner is, that's exactly what the
// claim-request review step is for. Coordinates are well-known city
// centers, not a specific truck's real location — precise, on-the-day
// location is exactly what the real owner sets after claiming (schedule
// entries / default location — see db/schema.ts).
const trucks: UnclaimedTruckSeed[] = [
  {
    name: "JJ's Hot Dogs",
    city: "Newark, NJ",
    lat: 40.7357,
    lng: -74.1724,
    cuisine: "american",
    description: "A Newark hot dog institution running since 1971, known as a neighborhood icon.",
    website: "https://jjshotdogsnj.com",
  },
  {
    name: "Mexi-Flip Taco Truck",
    city: "Newark, NJ",
    lat: 40.7357,
    lng: -74.1724,
    cuisine: "mexican",
    description: "A Mexican-Filipino fusion truck known for tacos with fresh daily tortillas.",
    phone: "(786) 972-9449",
  },
  {
    name: "Chennai Flavors Food Truck",
    city: "Jersey City, NJ",
    lat: 40.7178,
    lng: -74.0431,
    cuisine: "asian",
    description: "A South Indian truck known for dosas, biryani, and kathi rolls.",
    phone: "(201) 668-9685",
  },
  {
    name: "Amanda Bananas",
    city: "Hoboken, NJ",
    lat: 40.7439,
    lng: -74.0324,
    cuisine: "dessert",
    description: "A long-running Pier 13 truck known for dairy-free banana soft-serve.",
  },
  {
    name: "Cubano X-Press",
    city: "Hoboken, NJ",
    lat: 40.7439,
    lng: -74.0324,
    cuisine: "other",
    description: "A Pier 13 fixture known for pressed Cuban sandwiches.",
    website: "https://cubanoxpress.com",
  },
  {
    name: "Woody Wagon",
    city: "Atlantic City, NJ",
    lat: 39.3643,
    lng: -74.4229,
    cuisine: "american",
    description: "A boardwalk-area truck and bar known as an Atlantic City must-see.",
  },
  {
    name: "Chef Sheed's BBQ Shack",
    city: "Atlantic City, NJ",
    lat: 39.3643,
    lng: -74.4229,
    cuisine: "bbq",
    description: "A BBQ and seafood truck/eatery known for smoked brisket.",
  },
  {
    name: "World Famous Boardwalk Fish & Chips",
    city: "Atlantic City, NJ",
    lat: 39.3643,
    lng: -74.4229,
    cuisine: "seafood",
    description: "A boardwalk truck known for fresh-cut fries and battered fried fish.",
  },
  {
    name: "El Chile Toreado",
    city: "Santa Fe, NM",
    lat: 35.687,
    lng: -105.9378,
    cuisine: "mexican",
    description: "A father-daughter-run truck and James Beard semifinalist, known for breakfast tacos and al pastor.",
    website: "https://elchiletoreado.com",
  },
  {
    name: "Bang Bite Filling Station",
    city: "Santa Fe, NM",
    lat: 35.687,
    lng: -105.9378,
    cuisine: "american",
    description: "A Food Network-recognized truck known for green chile cheeseburgers.",
  },
  {
    name: "SoCal Mobile Cafe",
    city: "Santa Fe, NM",
    lat: 35.687,
    lng: -105.9378,
    cuisine: "coffee",
    description: "A full-service coffee truck at the Railyard, known for espresso drinks.",
    website: "https://socalmobilecafe.com",
  },
  {
    name: "Luchador Food Truck",
    city: "Las Cruces, NM",
    lat: 32.3199,
    lng: -106.7637,
    cuisine: "mexican",
    description: "A family-run truck at the farmers market, known for tacos and tortas.",
    website: "https://luchadorfoodtruck.netlify.app",
    phone: "(575) 650-2078",
  },
  {
    name: "Nomad's BBQ",
    city: "Albuquerque, NM",
    lat: 35.0844,
    lng: -106.6504,
    cuisine: "bbq",
    description: "A truck known for Texas-style smoked brisket and pulled pork sandwiches.",
    phone: "(505) 206-7654",
  },
  {
    name: "Tikka Spice – Desi Street Food Truck",
    city: "Albuquerque, NM",
    lat: 35.0844,
    lng: -106.6504,
    cuisine: "asian",
    description: "An award-winning Indian truck known for loaded samosas and chicken tikka tacos.",
    website: "https://tikkaspiceabq.com",
  },
  {
    name: "Taco Bus",
    city: "Albuquerque, NM",
    lat: 35.0844,
    lng: -106.6504,
    cuisine: "mexican",
    description: "A family-owned truck near UNM, known for tortas, tacos, and burritos.",
    website: "https://tacobusnm.com",
    phone: "(505) 301-7512",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
