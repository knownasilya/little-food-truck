import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Mississippi/Missouri food trucks — see
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
    name: "Eddie Wright BBQ",
    city: "Jackson, MS",
    lat: 32.2988,
    lng: -90.1848,
    cuisine: "bbq",
    description: "A veteran-owned Jackson BBQ truck run by a Marine Corps vet turned competition pitmaster, known for ribs, wings, and smoked turkey.",
    website: "https://eddiewrightbbq.com",
    phone: "(769) 208-5576",
  },
  {
    name: "Taqueria Mi Bonita",
    city: "Jackson, MS",
    lat: 32.2988,
    lng: -90.1848,
    cuisine: "mexican",
    description: "A longtime Jackson taco truck serving authentic Mexican street food — tacos, burritos, and homemade salsas.",
    phone: "(601) 238-2784",
  },
  {
    name: "Chunky Dunks Sweets Truck",
    city: "Flowood, MS",
    lat: 32.321,
    lng: -90.1051,
    cuisine: "dessert",
    description: "Mississippi's only hand-dipped ice cream truck, family-run and known for ice cream nachos and hot fudge sundaes.",
  },
  {
    name: "One Guy Steak and Chicken",
    city: "Jackson, MS",
    lat: 32.2988,
    lng: -90.1848,
    cuisine: "american",
    description: "A popular Jackson food truck serving steak and chicken plates from its I-55 frontage road spot.",
    website: "https://oneguysteakandchicken.com",
  },
  {
    name: "CG BBQ, LLC",
    city: "Gulfport, MS",
    lat: 30.3674,
    lng: -89.0928,
    cuisine: "bbq",
    description: "A Gulfport BBQ truck run by pitmaster Chris German, serving ribs, brisket, pulled pork, and chicken.",
    phone: "(601) 265-3035",
  },
  {
    name: "Los Sárapes Tacos y Más",
    city: "Gulfport, MS",
    lat: 30.3674,
    lng: -89.0928,
    cuisine: "mexican",
    description: "A well-known Gulfport taco truck famous for birria tacos and quesabirria.",
    phone: "(228) 236-6243",
  },
  {
    name: "Taymas Taqueria",
    city: "Hattiesburg, MS",
    lat: 31.3271,
    lng: -89.2903,
    cuisine: "mexican",
    description: "A downtown Hattiesburg taco truck serving authentic Mexican street tacos with a local twist.",
    phone: "(251) 487-1640",
  },
  {
    name: "Jitter Bug Coffee Truck",
    city: "Hattiesburg, MS",
    lat: 31.3271,
    lng: -89.2903,
    cuisine: "coffee",
    description: "A locally owned mobile coffee shop with an upbeat vibe, serving Hattiesburg and surrounding areas.",
    website: "https://jitterbugcoffeetruck.com",
  },
  {
    name: "Seoul Taco",
    city: "St. Louis, MO",
    lat: 38.627,
    lng: -90.1994,
    cuisine: "asian",
    description: "St. Louis's original Korean-Mexican fusion food truck, since 2011, still rolling for festivals and private events.",
    website: "https://www.seoultaco.com",
    phone: "(314) 925-8101",
  },
  {
    name: "Vincent Van Doughnut",
    city: "St. Louis, MO",
    lat: 38.627,
    lng: -90.1994,
    cuisine: "dessert",
    description: "St. Louis's first doughnut food truck — a 1960 Ford step van named \"Clyde\" — known for scratch-made rugelach-style doughnuts.",
    website: "https://vincentvandoughnut.com",
  },
  {
    name: "MOGOKC",
    city: "Kansas City, MO",
    lat: 39.0997,
    lng: -94.5786,
    cuisine: "asian",
    description: "A Kansas City food truck serving authentic Burmese dishes like tea leaf salad and Burmese chicken curry at farmers markets.",
  },
  {
    name: "The Melt Truck",
    city: "Kansas City, MO",
    lat: 39.0997,
    lng: -94.5786,
    cuisine: "american",
    description: "A family-run Kansas City-area truck specializing in gourmet grilled cheese melts, mac and cheese, and loaded nachos.",
  },
  {
    name: "I Love Tacos Taqueria",
    city: "Springfield, MO",
    lat: 37.209,
    lng: -93.2923,
    cuisine: "mexican",
    description: "One of Springfield's original Mexican food trucks, serving tacos, tortas, and tamales.",
    website: "https://ilovetacos417.com",
    phone: "(417) 489-0076",
  },
  {
    name: "Ozark Mountain Biscuit Co.",
    city: "Columbia, MO",
    lat: 38.9517,
    lng: -92.3341,
    cuisine: "american",
    description: "Missouri's celebrated biscuit food truck, serving scratch-made buttermilk biscuit sandwiches since 2013.",
    website: "https://ozarkbiscuits.com",
  },
  {
    name: "Three Pigs BBQ",
    city: "Lee's Summit, MO",
    lat: 38.9108,
    lng: -94.3822,
    cuisine: "bbq",
    description: "A Kansas City-area BBQ truck serving ribs, burnt ends, brisket, and kielbasa platters daily.",
    website: "https://threepigsbbq.com",
    phone: "(816) 813-2227",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
