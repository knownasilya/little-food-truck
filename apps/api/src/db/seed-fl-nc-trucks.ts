import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Florida/North Carolina food trucks — see
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
    name: "Shiso Crispy",
    city: "Tampa, FL",
    lat: 27.9506,
    lng: -82.4572,
    cuisine: "asian",
    description: "An award-winning hand-folded gyoza and dumpling truck, voted Tampa Bay's #1 food truck.",
    website: "https://shisocrispy.com",
  },
  {
    name: "Fat Boy Rick's Burgers",
    city: "Miami, FL",
    lat: 25.7617,
    lng: -80.1918,
    cuisine: "american",
    description: "A Kendall-area truck known for fresh-ground smash burgers and loaded fries.",
    website: "https://fatboyricks.com",
    phone: "(305) 283-2205",
  },
  {
    name: "Camel Tow Tacos",
    city: "Orlando, FL",
    lat: 28.5383,
    lng: -81.3792,
    cuisine: "mexican",
    description: "A long-running Orlando truck known for Asian-fusion tacos.",
    website: "https://cameltowtacos.com",
    phone: "(407) 403-3068",
  },
  {
    name: "Ibbi's Q",
    city: "Dunedin, FL",
    lat: 28.0197,
    lng: -82.7718,
    cuisine: "bbq",
    description: "A Tampa Bay barbecue truck known for slow-smoked ribs, pulled pork, and \"The Cure\" sandwich.",
    website: "https://ibbisq.com",
    phone: "(727) 366-2229",
  },
  {
    name: "The Donut Box",
    city: "Mount Dora, FL",
    lat: 28.8003,
    lng: -81.6445,
    cuisine: "dessert",
    description: "A gourmet donut truck serving classic and specialty flavors like s'mores and bacon-maple.",
    website: "https://thedonutboxfl.com",
    phone: "(352) 389-5500",
  },
  {
    name: "Dominican Chimi",
    city: "Kissimmee, FL",
    lat: 28.292,
    lng: -81.4076,
    cuisine: "other",
    description: "A Dominican street-food truck known for the chimichurri sandwich (\"chimi\") and empanadas.",
    phone: "(689) 200-3311",
  },
  {
    name: "Two Sisters and a Deviled Crab",
    city: "Jacksonville, FL",
    lat: 30.3322,
    lng: -81.6557,
    cuisine: "seafood",
    description: "A sister-owned seafood truck known for its Cuban-influenced deviled crab.",
    website: "https://2sistersjax.com",
    phone: "(904) 505-8144",
  },
  {
    name: "Tiger Yakitori",
    city: "Charlotte, NC",
    lat: 35.2271,
    lng: -80.8431,
    cuisine: "asian",
    description: "A Charlotte truck specializing in Japanese-style grilled yakitori skewers, operating since 2014.",
    website: "https://tigeryakitori.com",
    phone: "(704) 502-0256",
  },
  {
    name: "Romeo's Vegan Burgers",
    city: "Charlotte, NC",
    lat: 35.2271,
    lng: -80.8431,
    cuisine: "vegan",
    description: "A 100% plant-based burger truck known for the \"Where Art Thou Romeo\" burger.",
    website: "https://romeosveganburgers.com",
  },
  {
    name: "Mariah's Taco Spot",
    city: "Charlotte, NC",
    lat: 35.2271,
    lng: -80.8431,
    cuisine: "mexican",
    description: "An owner-operated truck known for birria tacos with rotating proteins like oxtail, shrimp, and salmon.",
    website: "https://mariahstacospot.com",
  },
  {
    name: "The Humble Pig",
    city: "Raleigh, NC",
    lat: 35.7796,
    lng: -78.6382,
    cuisine: "bbq",
    description: "A husband-and-wife barbecue truck known for rotisserie-smoked meats and banana pudding.",
    phone: "(919) 616-1852",
  },
  {
    name: "Bon Fritay",
    city: "Durham, NC",
    lat: 35.994,
    lng: -78.8986,
    cuisine: "other",
    description: "The Triangle's first Haitian/Caribbean street-food (\"fritay\") truck.",
    website: "https://bonfritaytruck.com",
    phone: "(919) 443-5130",
  },
  {
    name: "Guajiro Cuban Comfort Food",
    city: "Asheville, NC",
    lat: 35.5951,
    lng: -82.5515,
    cuisine: "other",
    description: "A longtime Cuban-comfort-food truck in the River Arts District, known for Cuban sandwiches and slow-cooked meats.",
    website: "https://guajiroasheville.com",
    phone: "(786) 202-8961",
  },
  {
    name: "MoMoMandu",
    city: "Raleigh, NC",
    lat: 35.7796,
    lng: -78.6382,
    cuisine: "asian",
    description: "A Nepali food truck known for handmade momo dumplings.",
    website: "https://momomandunc.com",
  },
  {
    name: "321 Coffee",
    city: "Raleigh, NC",
    lat: 35.7796,
    lng: -78.6382,
    cuisine: "coffee",
    description: "A nonprofit-affiliated mobile coffee truck employing adults with intellectual and developmental disabilities.",
    website: "https://321coffee.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
