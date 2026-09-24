import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Vermont/Virginia food trucks — see
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
    name: "Beansie's Bus",
    city: "Burlington, VT",
    lat: 44.4759,
    lng: -73.2121,
    cuisine: "american",
    description: "An iconic, family-run yellow-school-bus truck at Battery Park since 1944, known for Michigan hot dogs and fries.",
    website: "https://beansies.com",
    phone: "(802) 343-7181",
  },
  {
    name: "Champ's Creemee",
    city: "Burlington, VT",
    lat: 44.4759,
    lng: -73.2121,
    cuisine: "dessert",
    description: "A waterfront soft-serve stand, run by the ECHO science museum, famous for its maple creemee.",
  },
  {
    name: "Farmers & Foragers",
    city: "Burlington, VT",
    lat: 44.4759,
    lng: -73.2121,
    cuisine: "american",
    description: "A sustainably-sourced New American truck at Burlington Harbor Marina using local farm ingredients.",
    website: "https://vtfarmersandforagers.com",
  },
  {
    name: "Warren's Kitchen & Catering",
    city: "Stowe, VT",
    lat: 44.4654,
    lng: -72.6874,
    cuisine: "other",
    description: "A Caribbean/Jamaican-fusion truck parked at The Alchemist Brewery, known for jerk chicken mac and cheese.",
    website: "https://warrenskitchenvt.com",
  },
  {
    name: "Caja Madera",
    city: "Hardwick, VT",
    lat: 44.5051,
    lng: -72.3626,
    cuisine: "mexican",
    description: "A globally-inspired street-taco truck with dishes like jerk pulled pork and banh-mi tacos.",
    website: "https://www.cajamaderatacotrucks.com",
  },
  {
    name: "Smokin Barrels BBQ",
    city: "Derby Center, VT",
    lat: 44.9598,
    lng: -72.1287,
    cuisine: "bbq",
    description: "A low-and-slow BBQ truck serving Vermont's Northeast Kingdom.",
  },
  {
    name: "Boka Tako Truck",
    city: "Richmond, VA",
    lat: 37.5407,
    lng: -77.436,
    cuisine: "mexican",
    description: "RVA's original gourmet taco truck, since 2010, blending American/Asian flavors into tacos.",
    website: "https://www.bokatruck.com",
    phone: "(804) 928-2652",
  },
  {
    name: "Mama Vicky's Lumpia and Filipino Cuisine",
    city: "Richmond, VA",
    lat: 37.5407,
    lng: -77.436,
    cuisine: "asian",
    description: "A city-licensed truck serving Filipino lumpia, adobo, and pancit.",
    phone: "(804) 940-0352",
  },
  {
    name: "Deutscher Imbiss",
    city: "Virginia Beach, VA",
    lat: 36.8529,
    lng: -75.978,
    cuisine: "other",
    description: "An authentic German truck run by a Heidelberg native, serving bratwurst, currywurst, and schnitzel.",
    website: "https://deutscherimbiss.com",
    phone: "(757) 933-1307",
  },
  {
    name: "Courtney's Kitchen 757",
    city: "Virginia Beach, VA",
    lat: 36.8529,
    lng: -75.978,
    cuisine: "american",
    description: "A veteran-owned burger and cheesesteak truck.",
  },
  {
    name: "Hangry's",
    city: "Norfolk, VA",
    lat: 36.8508,
    lng: -76.2859,
    cuisine: "mexican",
    description: "A \"Virginia-Mex\" breakfast/lunch truck known for breakfast burritos, with vegetarian/vegan options.",
    website: "https://hangrysvb.com",
    phone: "(757) 619-7277",
  },
  {
    name: "A Toda Madre",
    city: "Arlington, VA",
    lat: 38.8816,
    lng: -77.091,
    cuisine: "mexican",
    description: "An authentic Mexican truck — sopes, tacos, tortas — parked in Courthouse/Rosslyn.",
    website: "https://atodamadredmv.com",
    phone: "(571) 645-4727",
  },
  {
    name: "Urban Bumpkin BBQ",
    city: "Arlington, VA",
    lat: 38.8816,
    lng: -77.091,
    cuisine: "bbq",
    description: "An Asian-fusion BBQ truck known for Alaskan frybread and Russian-style shawarma wraps.",
    phone: "(571) 224-4950",
  },
  {
    name: "Carpe Donut",
    city: "Charlottesville, VA",
    lat: 38.0293,
    lng: -78.4767,
    cuisine: "dessert",
    description: "A from-scratch organic donut truck, nicknamed \"Gypsy,\" a City Market fixture since 2007.",
    website: "https://carpedonut.org",
    phone: "(434) 806-6202",
  },
  {
    name: "Good Waffles & Co.",
    city: "Charlottesville, VA",
    lat: 38.0293,
    lng: -78.4767,
    cuisine: "dessert",
    description: "A family-owned truck specializing in Belgian Liège waffles.",
    website: "https://goodwafflesco.com",
    phone: "(434) 327-9827",
  },
  {
    name: "Mouth Wide Open",
    city: "Charlottesville, VA",
    lat: 38.0293,
    lng: -78.4767,
    cuisine: "seafood",
    description: "A gourmet catering truck, since 2012, best known for its crab cake sliders.",
    website: "https://www.mwofoodtruck.com",
    phone: "(434) 245-0221",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
