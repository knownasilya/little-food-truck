import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Alabama/Tennessee food trucks — see
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
    name: "Fat Charles BBQ",
    city: "Birmingham, AL",
    lat: 33.5186,
    lng: -86.8104,
    cuisine: "bbq",
    description: "A Birmingham food truck known for OG and birria tacos alongside locally-sourced, slow-smoked BBQ.",
    phone: "(205) 615-4950",
  },
  {
    name: "Dos Hermanos Taco Truck",
    city: "Birmingham, AL",
    lat: 33.5186,
    lng: -86.8104,
    cuisine: "mexican",
    description: "A cash-only Birmingham taco truck serving street tacos, tortas, and burritos for over a decade.",
  },
  {
    name: "Aww Shucks",
    city: "Birmingham, AL",
    lat: 33.5186,
    lng: -86.8104,
    cuisine: "other",
    description: "A Guinness-World-Record-breaking Birmingham food truck serving fire-roasted corn on the cob with toppings like Mexican street corn.",
    website: "https://www.awwshucks.online",
    phone: "(205) 346-1999",
  },
  {
    name: "Beast Mode Food Truck",
    city: "Huntsville, AL",
    lat: 34.7304,
    lng: -86.5861,
    cuisine: "american",
    description: "A Huntsville truck led by a French, Michelin-trained chef, known for gourmet burgers like the Jacked Up Burger.",
    website: "https://beastmodefoodtruck.com",
    phone: "(256) 425-8559",
  },
  {
    name: "Smokin' Gringos",
    city: "Mobile, AL",
    lat: 30.6954,
    lng: -88.0399,
    cuisine: "mexican",
    description: "Self-proclaimed Mobile's first taco truck, since 2009, known for smoked brisket and pulled pork tacos.",
    website: "https://www.smokingringos.com",
    phone: "(251) 458-6890",
  },
  {
    name: "Vegan Time",
    city: "Mobile, AL",
    lat: 30.6954,
    lng: -88.0399,
    cuisine: "vegan",
    description: "A Black-owned Mobile food truck serving alkaline vegan comfort food, including vegan \"crab cakes,\" wings, and burgers.",
    phone: "(251) 422-4765",
  },
  {
    name: "Cuppa Go Coffee Co.",
    city: "Mobile, AL",
    lat: 30.6954,
    lng: -88.0399,
    cuisine: "coffee",
    description: "Mobile's original \"brew bike,\" slinging cold brew and nitro cold brew coffee on tap around the city.",
  },
  {
    name: "Happy Times",
    city: "Montgomery, AL",
    lat: 32.3792,
    lng: -86.3077,
    cuisine: "american",
    description: "A Montgomery food truck serving a remix of subs, tacos, and burgers under the motto \"come hungry, leave happy.\"",
    website: "https://ilikehappytimes.com",
    phone: "(334) 521-8285",
  },
  {
    name: "The Grilled Cheeserie",
    city: "Nashville, TN",
    lat: 36.1627,
    lng: -86.7816,
    cuisine: "american",
    description: "Nashville's award-winning gourmet grilled cheese truck, operating since 2010 and voted the city's best food truck for eight straight years.",
    website: "https://grilledcheeserie.com",
    phone: "(615) 491-9640",
  },
  {
    name: "DegThai",
    city: "Nashville, TN",
    lat: 36.1627,
    lng: -86.7816,
    cuisine: "asian",
    description: "Nashville's original Thai street-food truck, running since 2011 on Music Row.",
    website: "http://m.degthai.com",
  },
  {
    name: "Smokin Hot BBQ Food Truck",
    city: "Memphis, TN",
    lat: 35.1495,
    lng: -90.049,
    cuisine: "bbq",
    description: "A Memphis BBQ truck smoking meats low and slow for up to 14 hours, known for brisket nachos.",
  },
  {
    name: "Soi Number 9",
    city: "Memphis, TN",
    lat: 35.1495,
    lng: -90.049,
    cuisine: "asian",
    description: "A converted-school-bus Thai food truck known for authentic Thai street food and a Food Network feature win.",
    website: "https://soinumber9.com",
    phone: "(901) 219-8415",
  },
  {
    name: "CJ's Tacos",
    city: "Knoxville, TN",
    lat: 35.9606,
    lng: -83.9207,
    cuisine: "mexican",
    description: "Knoxville's #1-rated taco truck on Gay Street, known for pan-fried street tacos with locally sourced ingredients.",
    website: "https://www.cjstacos.com",
    phone: "(865) 770-5999",
  },
  {
    name: "The Donut Theory",
    city: "Knoxville, TN",
    lat: 35.9606,
    lng: -83.9207,
    cuisine: "dessert",
    description: "Knoxville's only exclusively gluten-free donut concept, running a distinctive pink food truck alongside its storefront.",
  },
  {
    name: "Food NV",
    city: "Chattanooga, TN",
    lat: 35.0456,
    lng: -85.3097,
    cuisine: "american",
    description: "A Chattanooga-area gourmet truck run by \"Chef Seth,\" known for its Pimento Cheeseburger and Loaded Totchos.",
    website: "https://www.nvfoodtruck.com",
    phone: "(423) 505-9195",
  },
  {
    name: "Bayou Bites Streatery",
    city: "Chattanooga, TN",
    lat: 35.0456,
    lng: -85.3097,
    cuisine: "seafood",
    description: "A Chattanooga Cajun/Creole truck bringing New Orleans flavor with fried catfish, crawfish nachos, and fried fish tacos.",
    website: "https://www.bayouandbites.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
