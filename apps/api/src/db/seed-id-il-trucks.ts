import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Idaho/Illinois food trucks — see
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
    name: "The Hood",
    city: "Boise, ID",
    lat: 43.615,
    lng: -116.2023,
    cuisine: "american",
    description: "A Boise-area smash-burger truck known for its Huckleberry Burger and hand-cut fries.",
    phone: "(425) 231-7569",
  },
  {
    name: "MELT Food Truck",
    city: "Boise, ID",
    lat: 43.615,
    lng: -116.2023,
    cuisine: "american",
    description: "An award-winning Boise truck since 2018 doing chef-inspired grilled-cheese melts on fresh-baked bread with scratch-made tomato soup.",
    website: "https://meltfoodtruck.com",
    phone: "(971) 344-5495",
  },
  {
    name: "Chingu Korean Eats",
    city: "Boise, ID",
    lat: 43.615,
    lng: -116.2023,
    cuisine: "asian",
    description: "A Korean food truck serving bulgogi bowls and family-recipe Korean BBQ dishes.",
    website: "https://chingueats.com",
  },
  {
    name: "She's Smokin' BBQ",
    city: "Meridian, ID",
    lat: 43.6121,
    lng: -116.3915,
    cuisine: "bbq",
    description: "A downtown-Meridian truck blending BBQ and Mexican flavors — pulled pork and brisket tacos.",
    website: "https://shessmokinbbq.com",
  },
  {
    name: "Dave's Fire & Smoke BBQ",
    city: "Idaho Falls, ID",
    lat: 43.4917,
    lng: -112.0339,
    cuisine: "bbq",
    description: "An Idaho Falls BBQ truck known for smoked brisket, pulled pork, ribs, and loaded mac and cheese.",
    website: "https://davesfireandsmokebbq.com",
    phone: "(208) 569-9767",
  },
  {
    name: "CheSa's Gourmet Food Truck",
    city: "Chicago, IL",
    lat: 41.8781,
    lng: -87.6298,
    cuisine: "other",
    description: "A woman- and minority-owned truck billed as the only 100% gluten-free gourmet food truck in Illinois, serving Creole/Cajun-inspired dishes since 2015.",
  },
  {
    name: "The Slide Ride",
    city: "Chicago, IL",
    lat: 41.8781,
    lng: -87.6298,
    cuisine: "american",
    description: "Chicago's original slider truck, operating since 2011.",
  },
  {
    name: "Yum Dum Truck",
    city: "Chicago, IL",
    lat: 41.8781,
    lng: -87.6298,
    cuisine: "asian",
    description: "A longtime Chicago truck, since 2014, known for handmade bao and its \"Kimcheesy\" rice balls.",
    website: "https://yumdumtruck.com",
    phone: "(847) 376-1925",
  },
  {
    name: "Tandoori Wheels",
    city: "Naperville, IL",
    lat: 41.7508,
    lng: -88.1535,
    cuisine: "asian",
    description: "An Indian food truck serving butter chicken, \"Bombay Burrito\" frankies, and paneer tikka masala.",
    website: "https://tandooriwheels.com",
    phone: "(331) 302-6141",
  },
  {
    name: "Taco Madre",
    city: "Naperville, IL",
    lat: 41.7508,
    lng: -88.1535,
    cuisine: "mexican",
    description: "A family-owned Mexican street-taco truck and catering operation, part of a small local restaurant group.",
    website: "https://thetacomadre.com",
    phone: "(630) 445-8633",
  },
  {
    name: "Los Hidalguenses",
    city: "Champaign, IL",
    lat: 40.1164,
    lng: -88.2434,
    cuisine: "mexican",
    description: "A Champaign taco truck since 2020, a local favorite for pastor tacos and Tuesday $10 taco specials.",
    phone: "(217) 714-0738",
  },
  {
    name: "Garro's Taste of the City",
    city: "Urbana, IL",
    lat: 40.1106,
    lng: -88.2073,
    cuisine: "american",
    description: "A Black-owned truck bringing Chicago-style eats — dipped Italian beef, gyro fries — to Champaign-Urbana.",
  },
  {
    name: "Di Real Jerk",
    city: "Rockford, IL",
    lat: 42.2711,
    lng: -89.094,
    cuisine: "other",
    description: "A Jamaican truck known for jerk chicken, oxtail, and dirty rice.",
  },
  {
    name: "Sizz N Fizz",
    city: "Rockford, IL",
    lat: 42.2711,
    lng: -89.094,
    cuisine: "american",
    description: "A smash-burger truck from Prairie Street Brewing Co., known for its double-patty \"Sizz\" burger.",
    website: "https://sizznfizz.com",
  },
  {
    name: "Gilly's BBQ",
    city: "Springfield, IL",
    lat: 39.7817,
    lng: -89.6501,
    cuisine: "bbq",
    description: "A Springfield-area BBQ trailer, since 2014, smoking pork, brisket, ribs, and chicken on-site.",
    website: "https://gillysbbq.com",
    phone: "(217) 993-1096",
  },
  {
    name: "Los Rancheros Taco Joint",
    city: "Springfield, IL",
    lat: 39.7817,
    lng: -89.6501,
    cuisine: "mexican",
    description: "A taco truck spin-off of a regional Mexican restaurant chain, known for al pastor and birria tacos.",
    phone: "(217) 331-3536",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
