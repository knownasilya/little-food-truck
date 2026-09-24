import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Texas/Utah food trucks — see
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
    name: "LeRoy and Lewis Barbecue",
    city: "Austin, TX",
    lat: 30.2672,
    lng: -97.7431,
    cuisine: "bbq",
    description: "Known for Wagyu brisket and inventive smoked meats, grown from a truck into a full backyard restaurant and bar.",
    website: "https://leroyandlewisbbq.com",
    phone: "(512) 945-9882",
  },
  {
    name: "T-Loc's Sonora Hot Dogs",
    city: "Austin, TX",
    lat: 30.2672,
    lng: -97.7431,
    cuisine: "mexican",
    description: "Serves the Sonoran hot dog — a bacon-wrapped dog on a bolillo bun — named best hot dog in Texas by Food & Wine.",
    website: "https://tlocs.com",
    phone: "(512) 994-8982",
  },
  {
    name: "Bodhi Viet Vegan",
    city: "Austin, TX",
    lat: 30.2672,
    lng: -97.7431,
    cuisine: "vegan",
    description: "Staffed by Buddhist nuns and volunteers, serving fully vegan Vietnamese noodles, soups, and spring rolls.",
    website: "https://bodhivietvegans.com",
    phone: "(512) 696-1807",
  },
  {
    name: "The Birria Queen",
    city: "Houston, TX",
    lat: 29.7604,
    lng: -95.3698,
    cuisine: "mexican",
    description: "A Black-owned, woman-led truck known for birria tacos and quesadillas, with beef, shrimp, chicken, and vegan options.",
    website: "https://www.thebirriaqueen.com",
    phone: "(832) 721-6975",
  },
  {
    name: "Coffee-Q",
    city: "Houston, TX",
    lat: 29.7604,
    lng: -95.3698,
    cuisine: "bbq",
    description: "Pairs Texas smoked barbecue with handcrafted coffee — brisket tacos alongside espresso drinks.",
    website: "https://www.coffeeq.com",
  },
  {
    name: "Foreign Policy",
    city: "Houston, TX",
    lat: 29.7604,
    lng: -95.3698,
    cuisine: "american",
    description: "Serving the Houston area since 2011, making fusion burgers and fries mixing Korean, Greek, Mexican, and American flavors.",
    website: "https://www.foreignpolicytruck.com",
    phone: "(832) 860-6667",
  },
  {
    name: "Ruthie's Rolling Cafe",
    city: "Dallas, TX",
    lat: 32.7767,
    lng: -96.797,
    cuisine: "american",
    description: "A nonprofit food truck known for gourmet grilled cheese, including \"The Boss\" — brisket, cheddar, pickles.",
    website: "https://ruthiesforgood.com/ruthies-rolling-cafe/",
    phone: "(214) 377-7355",
  },
  {
    name: "Freshnez Kitchen",
    city: "Dallas, TX",
    lat: 32.7767,
    lng: -96.797,
    cuisine: "other",
    description: "Blends Texas barbecue with Nigerian dishes, known for jollof fried rice served with smoked brisket.",
    website: "https://freshnezkitchen.com",
  },
  {
    name: "Naco Mexican Eatery",
    city: "San Antonio, TX",
    lat: 29.4241,
    lng: -98.4936,
    cuisine: "mexican",
    description: "Started in 2018 by a husband-and-wife team, built its name on breakfast tacos and chilaquiles.",
    website: "https://nacomexican.com",
    phone: "(210) 996-1033",
  },
  {
    name: "The Baked Bird",
    city: "San Antonio, TX",
    lat: 29.4241,
    lng: -98.4936,
    cuisine: "american",
    description: "Run by a chef duo, San Antonio's top-voted breakfast truck for its scratch-made morning menu.",
    website: "https://thebakedbirdsa.com",
    phone: "(989) 975-2521",
  },
  {
    name: "ScooterZ BBQ",
    city: "San Antonio, TX",
    lat: 29.4241,
    lng: -98.4936,
    cuisine: "bbq",
    description: "A family-run trailer, since 2017, smoking mesquite BBQ, ribs, brisket, and sausage with classic Texas sides.",
  },
  {
    name: "Big Kat Burgers",
    city: "Fort Worth, TX",
    lat: 32.7555,
    lng: -97.3308,
    cuisine: "american",
    description: "Founded by three friends with 30 years of combined culinary experience, hand-forming fresh, never-frozen patties.",
    website: "https://bigkatburgers.com",
  },
  {
    name: "Coco Shrimp",
    city: "Fort Worth, TX",
    lat: 32.7555,
    lng: -97.3308,
    cuisine: "seafood",
    description: "Started as Fort Worth's first mobile seafood truck, known for Hawaiian-style coconut shrimp plates.",
    website: "https://www.cocoshrimp.com",
  },
  {
    name: "Cupbop",
    city: "Salt Lake City, UT",
    lat: 40.7608,
    lng: -111.891,
    cuisine: "asian",
    description: "Started as an SLC food truck in 2013, serving Korean BBQ meat, rice or noodles, and sauce in a cup.",
    website: "https://cupbop.com",
  },
  {
    name: "Balabé Senegalese Cuisine",
    city: "Salt Lake City, UT",
    lat: 40.7608,
    lng: -111.891,
    cuisine: "other",
    description: "Serves authentic Senegalese chicken, fish, and lamb dishes, with vegan and gluten-free options.",
  },
  {
    name: "The Penguin Brothers",
    city: "Provo, UT",
    lat: 40.2338,
    lng: -111.6585,
    cuisine: "dessert",
    description: "Started by two brothers from Northern California, making gourmet ice cream sandwiches from scratch.",
    website: "https://www.thepenguinbrothers.com",
  },
  {
    name: "Burger Church",
    city: "Ogden, UT",
    lat: 41.223,
    lng: -111.9738,
    cuisine: "american",
    description: "A dog-friendly truck serving grass-fed, American-raised Angus burgers with fries fried in beef tallow.",
  },
  {
    name: "Taqueria La Tapatia",
    city: "Ogden, UT",
    lat: 41.223,
    lng: -111.9738,
    cuisine: "mexican",
    description: "A family-run Mexican truck and catering business known for menudo, tacos, and tamales with handmade tortillas.",
    website: "https://www.taquerialatapatia.online",
    phone: "(385) 254-4274",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
