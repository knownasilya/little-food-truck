import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Rhode Island/South Dakota food trucks — see
// seed-unclaimed-trucks.ts for how these get seeded (idempotent, resumable
// unclaimed listings). Researched from public sources (food-truck
// directories, local news coverage, each truck's own site/social).
// Deliberately no `claimEmail`/personal contact info: nothing here claims
// to have verified who the real owner is, that's exactly what the
// claim-request review step is for. Coordinates are well-known city
// centers, not a specific truck's real location — precise, on-the-day
// location is exactly what the real owner sets after claiming (schedule
// entries / default location — see db/schema.ts). Rhode Island and South
// Dakota both have smaller food-truck scenes than most states, so this
// list is deliberately leaner (13 vs. the usual ~16) rather than padded
// with unverifiable entries.
const trucks: UnclaimedTruckSeed[] = [
  {
    name: "Haven Brothers",
    city: "Providence, RI",
    lat: 41.824,
    lng: -71.4128,
    cuisine: "american",
    description: "A historic 1893 late-night diner-on-wheels known for burgers and milkshakes, parked nightly by City Hall.",
    website: "https://havenbrosdiner.com",
    phone: "(401) 862-6703",
  },
  {
    name: "Rogue On The Rhode",
    city: "Providence, RI",
    lat: 41.824,
    lng: -71.4128,
    cuisine: "american",
    description: "The street-food extension of Rogue Island Kitchen & Bar, known for its award-winning Maine lobster roll.",
    website: "https://rogueislandgroup.com",
    phone: "(401) 831-3733",
  },
  {
    name: "Poco Loco Taco Truck",
    city: "Providence, RI",
    lat: 41.824,
    lng: -71.4128,
    cuisine: "mexican",
    description: "A long-running taco truck, since 2010, serving scratch-made Mexican street food.",
    website: "https://pocolocotacos.com",
    phone: "(401) 461-2640",
  },
  {
    name: "Shuckin' Truck",
    city: "Narragansett, RI",
    lat: 41.4292,
    lng: -71.4623,
    cuisine: "seafood",
    description: "A mobile raw bar serving oysters from its own farm and seafood from the family's fishing boats.",
    website: "https://shuckintruck.com",
  },
  {
    name: "A Mano Pizza + Gelato",
    city: "Newport, RI",
    lat: 41.4901,
    lng: -71.3128,
    cuisine: "other",
    description: "Hand-crafted Neapolitan wood-fired pizza and gelato from an oven imported from Italy.",
    website: "https://amanopizzanpt.com",
    phone: "(401) 450-6984",
  },
  {
    name: "Newport Chowder Company",
    city: "Newport, RI",
    lat: 41.4901,
    lng: -71.3128,
    cuisine: "seafood",
    description: "A family-owned truck, recipe dating to 1985, known for award-winning New England seafood chowder and lobster rolls.",
    website: "https://newportchowdercompany.com",
    phone: "(401) 447-8373",
  },
  {
    name: "Cluck Truck",
    city: "Newport, RI",
    lat: 41.4901,
    lng: -71.3128,
    cuisine: "american",
    description: "A pick-your-chicken sandwich truck known for its fried chicken sandwiches and milkshakes.",
    website: "https://clucktruckri.com",
    phone: "(401) 595-3088",
  },
  {
    name: "Windy City Bites",
    city: "Sioux Falls, SD",
    lat: 43.546,
    lng: -96.7313,
    cuisine: "american",
    description: "Chicago-style street food — Italian beef, Chicago dogs — with a Caribbean soul-food twist.",
    website: "https://windycitybites.com",
    phone: "(605) 254-3533",
  },
  {
    name: "Taqueria Sanchez",
    city: "Sioux Falls, SD",
    lat: 43.546,
    lng: -96.7313,
    cuisine: "mexican",
    description: "An authentic taco/burrito truck that grew into a local Mexican food mini-chain.",
    phone: "(605) 376-6307",
  },
  {
    name: "The Smoked Culture",
    city: "Sioux Falls, SD",
    lat: 43.546,
    lng: -96.7313,
    cuisine: "bbq",
    description: "A Texas-style barbecue truck known for brisket and smoked mac and cheese.",
    website: "https://thesmokedculture.com",
  },
  {
    name: "Eddie's Tacos RC",
    city: "Rapid City, SD",
    lat: 44.0805,
    lng: -103.231,
    cuisine: "mexican",
    description: "A family-owned taco truck, est. 2016, highly rated for authentic Mexican food including birria tacos.",
    phone: "(605) 631-9111",
  },
  {
    name: "Black Hills Brats",
    city: "Spearfish, SD",
    lat: 44.4906,
    lng: -103.8592,
    cuisine: "other",
    description: "A veteran-owned truck serving house-made bratwurst in multiple flavors across the Black Hills.",
    website: "https://blackhillsbrats.com",
    phone: "(605) 569-6186",
  },
  {
    name: "Savour Pinoy & Sushi",
    city: "Rapid City, SD",
    lat: 44.0805,
    lng: -103.231,
    cuisine: "asian",
    description: "A Filipino-and-sushi fusion truck known for lumpia and sushi rolls.",
    phone: "(605) 593-7498",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
