import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Kansas/Kentucky food trucks — see
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
    name: "The Flying Stove",
    city: "Wichita, KS",
    lat: 37.6872,
    lng: -97.3301,
    cuisine: "american",
    description: "Wichita's original food truck, since 2011, known for a rotating, chef-driven menu of scratch-made street food.",
    website: "https://theflyingstove.com",
    phone: "(316) 609-9016",
  },
  {
    name: "Waffle Wagon",
    city: "Wichita, KS",
    lat: 37.6872,
    lng: -97.3301,
    cuisine: "dessert",
    description: "A food truck specializing in Belgian Liège waffles, sweet and savory.",
  },
  {
    name: "Big B's Beef Truck",
    city: "Wichita, KS",
    lat: 37.6872,
    lng: -97.3301,
    cuisine: "american",
    description: "A Chicago-style truck known for Italian beef sandwiches, Chicago dogs, and garlic fries.",
    phone: "(316) 942-2333",
  },
  {
    name: "Wheat Street Dogs",
    city: "Wichita, KS",
    lat: 37.6872,
    lng: -97.3301,
    cuisine: "vegan",
    description: "Wichita's first all-vegan hot dog cart, serving handcrafted meat-free dogs and sausages since 2018.",
    website: "https://wheatstreetdogs.com",
    phone: "(316) 290-9836",
  },
  {
    name: "Funky Monkey Munchies",
    city: "Wichita, KS",
    lat: 37.6872,
    lng: -97.3301,
    cuisine: "asian",
    description: "A fusion truck known for gastropub mashups like Korean street tacos and Vietnamese egg rolls.",
  },
  {
    name: "Crave of KC",
    city: "Overland Park, KS",
    lat: 38.9822,
    lng: -94.6708,
    cuisine: "mexican",
    description: "A scratch-made taco truck, since 2012, known for chicken fusion tacos and slow-roasted carnitas.",
    website: "https://cravekc.com",
  },
  {
    name: "Mad Greek Traveling Taverna",
    city: "Lawrence, KS",
    lat: 38.9717,
    lng: -95.2353,
    cuisine: "other",
    description: "A food-truck spinoff of a 30-year Lawrence Greek restaurant, known for gyros, souvlaki, and homemade baklava.",
    website: "https://themadgreektravelingtaverna.com",
  },
  {
    name: "Northstar Coffee",
    city: "Lawrence, KS",
    lat: 38.9717,
    lng: -95.2353,
    cuisine: "coffee",
    description: "A mobile espresso cafe serving handmade pastries and coffee drinks around Lawrence and the KC metro.",
  },
  {
    name: "Nathan's Taqueria",
    city: "Lexington, KY",
    lat: 38.0406,
    lng: -84.5037,
    cuisine: "mexican",
    description: "A family-run truck serving authentic tacos; won Gold for Best Food Truck in Lexington, 2025.",
    phone: "(859) 433-7420",
  },
  {
    name: "Rolling Oven",
    city: "Lexington, KY",
    lat: 38.0406,
    lng: -84.5037,
    cuisine: "other",
    description: "A mobile pizzeria in a converted shipping container, serving Neapolitan-inspired wood-fired pizza since 2014.",
    website: "https://rollingoven.com",
    phone: "(859) 447-8146",
  },
  {
    name: "Porterhouse BBQ",
    city: "Lexington, KY",
    lat: 38.0406,
    lng: -84.5037,
    cuisine: "bbq",
    description: "A truck known for pulled pork and brisket sandwiches plus loaded BBQ tacos.",
    phone: "(859) 806-0952",
  },
  {
    name: "Longshot Lobsta",
    city: "Louisville, KY",
    lat: 38.2527,
    lng: -85.7585,
    cuisine: "seafood",
    description: "Louisville's original lobster truck, since 2013, known for steamed lobster rolls and lobster bisque.",
    website: "https://longshotlobsta.com",
    phone: "(502) 262-2232",
  },
  {
    name: "Holy Molé Taco Truck",
    city: "Louisville, KY",
    lat: 38.2527,
    lng: -85.7585,
    cuisine: "mexican",
    description: "Louisville's first traveling taqueria, roaming since 2011, known for tacos on fresh masa tortillas.",
    phone: "(502) 558-6554",
  },
  {
    name: "Cotton BBQ",
    city: "Bowling Green, KY",
    lat: 36.9685,
    lng: -86.4808,
    cuisine: "bbq",
    description: "A Texas-style BBQ truck known for smoked beef brisket and pulled pork.",
    phone: "(404) 514-6971",
  },
  {
    name: "Empanadas BG",
    city: "Bowling Green, KY",
    lat: 36.9685,
    lng: -86.4808,
    cuisine: "other",
    description: "A truck known for handmade empanadas fried to order in a variety of fillings.",
    phone: "(270) 799-8523",
  },
  {
    name: "Hot Buns Food Truck",
    city: "Louisville, KY",
    lat: 38.2527,
    lng: -85.7585,
    cuisine: "asian",
    description: "An Asian fusion truck known for steamed bao buns filled with savory meats and house-made sauces.",
    website: "https://hotbunsfoodtruck.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
