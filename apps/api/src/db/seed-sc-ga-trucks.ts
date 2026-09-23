import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating South Carolina/Georgia food trucks — see
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
    name: "Dave's Smoke & Tacos",
    city: "North Charleston, SC",
    lat: 32.8546,
    lng: -79.9748,
    cuisine: "bbq",
    description: "A food trailer that blends slow-smoked barbecue with Mexican street-food flavors.",
    website: "https://davessmokeandtacos.com",
    phone: "(443) 504-8975",
  },
  {
    name: "The Wurst Wagen",
    city: "Columbia, SC",
    lat: 34.0007,
    lng: -81.0348,
    cuisine: "other",
    description: "A German food truck serving housemade bratwurst, curry wurst, and schnitzel.",
    website: "https://thewurstwagen.com",
  },
  {
    name: "Doko Smoke Barbeque",
    city: "Columbia, SC",
    lat: 34.0007,
    lng: -81.0348,
    cuisine: "bbq",
    description: "A competition pitmaster's truck with an onboard smoker, known for brisket and pulled pork.",
    website: "https://dokosmoke.com",
  },
  {
    name: "The Wok Lobster",
    city: "Greenville, SC",
    lat: 34.8526,
    lng: -82.394,
    cuisine: "asian",
    description: "Voted Best Food Truck of the Upstate 2024 for Asian-American fusion dishes like Korean corn dogs and lobster corn dogs.",
    website: "https://thewoklobster.net",
  },
  {
    name: "We Got The Beets",
    city: "Greenville, SC",
    lat: 34.8526,
    lng: -82.394,
    cuisine: "vegan",
    description: "Greenville's first cruelty-free food truck, serving plant-based versions of classic sandwiches.",
  },
  {
    name: "Henry's Hog Hauler",
    city: "Greenville, SC",
    lat: 34.8526,
    lng: -82.394,
    cuisine: "bbq",
    description: "The mobile arm of Greenville institution Henry's Smokehouse, serving slow-smoked pulled pork and ribs.",
    website: "https://henryssmokehouse.com",
    phone: "(864) 918-6228",
  },
  {
    name: "Benito's Rolling Oven",
    city: "North Myrtle Beach, SC",
    lat: 33.8162,
    lng: -78.6803,
    cuisine: "other",
    description: "A wood-fired pizza truck making gourmet Neapolitan-style pies on site.",
    website: "https://benitosrollingoven.com",
    phone: "(843) 798-8242",
  },
  {
    name: "Vita Nova Traveling Cafe",
    city: "Greenville, SC",
    lat: 34.8526,
    lng: -82.394,
    cuisine: "coffee",
    description: "A mobile espresso and coffee cafe that caters events across the Upstate.",
    phone: "(864) 905-6905",
  },
  {
    name: "Dos Potrillos Mexican Food Truck",
    city: "Aiken, SC",
    lat: 33.5601,
    lng: -81.7196,
    cuisine: "mexican",
    description: "A family-run truck serving authentic Mexico City-style tacos al pastor and quesabirria.",
  },
  {
    name: "Bento Bus",
    city: "Atlanta, GA",
    lat: 33.749,
    lng: -84.388,
    cuisine: "asian",
    description: "A long-running Japanese food truck serving organic rice bowls, sushi burritos, and curry.",
    phone: "(678) 439-6277",
  },
  {
    name: "The Pickle",
    city: "Atlanta, GA",
    lat: 33.749,
    lng: -84.388,
    cuisine: "american",
    description: "Atlanta's original gourmet food truck, operating since 2004 with a Tex-Mex, Southern, and Bayou menu.",
    website: "https://thepickleatl.com",
  },
  {
    name: "Astros Corn Dogs",
    city: "Atlanta, GA",
    lat: 33.749,
    lng: -84.388,
    cuisine: "dessert",
    description: "A specialty corn dog truck known for Korean-style and dessert-twist corn dogs like the cinnamon-sugar Star Dust Dog.",
  },
  {
    name: "Crispi",
    city: "Savannah, GA",
    lat: 32.0809,
    lng: -81.0912,
    cuisine: "american",
    description: "A smash-burger trailer parked at Two Tides Brewing in Savannah's Starland District.",
  },
  {
    name: "Yoshi's Kitchen",
    city: "Savannah, GA",
    lat: 32.0809,
    lng: -81.0912,
    cuisine: "asian",
    description: "A Japanese food truck run by a sushi-chef family, best known for its donburi fried-shrimp rice bowl.",
    phone: "(912) 704-8915",
  },
  {
    name: "Molly's Fish & Chips n More",
    city: "Savannah, GA",
    lat: 32.0809,
    lng: -81.0912,
    cuisine: "seafood",
    description: "The mobile arm of a Savannah Scottish pub, serving fish and chips and seafood combos.",
    phone: "(912) 777-2259",
  },
  {
    name: "Cafe Racer",
    city: "Athens, GA",
    lat: 33.9519,
    lng: -83.3576,
    cuisine: "american",
    description: "An Athens staple since 2018, known for double-stacked smash burgers and breakfast tacos.",
    website: "https://caferacerfoodtruck.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
