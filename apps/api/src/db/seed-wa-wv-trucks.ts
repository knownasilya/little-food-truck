import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Washington/West Virginia food trucks — see
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
    name: "El Camión",
    city: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    cuisine: "mexican",
    description: "A long-running Mexican street-food truck/trailer serving tacos, burritos, gorditas, and ceviche.",
    website: "https://elcamionseattle.com",
    phone: "(206) 468-5691",
  },
  {
    name: "Where Ya At Matt",
    city: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    cuisine: "american",
    description: "A New Orleans-style truck, since 2010, known for scratch-made po'boys, gumbo, and jambalaya.",
    website: "https://whereyaatmatt.com",
    phone: "(206) 251-3445",
  },
  {
    name: "Off the Rez",
    city: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    cuisine: "american",
    description: "Seattle's first Native-owned food truck, est. 2011, known for Indian tacos and frybread.",
    website: "https://offthereztruck.com",
  },
  {
    name: "Bumbu Truck",
    city: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    cuisine: "asian",
    description: "An Indonesian street-food truck run by a Chopped-winning chef, known for chicken satay and Javanese fried noodles.",
    website: "https://bumbutruck.com",
    phone: "(206) 604-3462",
  },
  {
    name: "Rain Coffee",
    city: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    cuisine: "coffee",
    description: "A mobile coffee truck serving espresso drinks, tea, and pastries around Seattle and the Eastside.",
  },
  {
    name: "Veg Wich",
    city: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    cuisine: "vegan",
    description: "A vegan/vegetarian sandwich truck with gluten-free options.",
  },
  {
    name: "Big Rod's Texas BBQ",
    city: "Nine Mile Falls, WA",
    lat: 47.7962,
    lng: -117.547,
    cuisine: "bbq",
    description: "A Texas-style wood-fired BBQ truck known for 22-24 hour smoked brisket and pulled pork.",
    phone: "(509) 218-7087",
  },
  {
    name: "Mixed Plate",
    city: "Spokane, WA",
    lat: 47.6588,
    lng: -117.426,
    cuisine: "asian",
    description: "An Asian/Pacific Island fusion truck known for beef bulgogi tacos and Hawaiian loco moco.",
    phone: "(509) 280-6115",
  },
  {
    name: "El Maestro del Taco",
    city: "Bellevue, WA",
    lat: 47.6101,
    lng: -122.2015,
    cuisine: "mexican",
    description: "A family-run truck known for street tacos and burritos.",
    phone: "(425) 240-7708",
  },
  {
    name: "I Love Tacos",
    city: "Tacoma, WA",
    lat: 47.2529,
    lng: -122.4443,
    cuisine: "mexican",
    description: "A street-style taco truck known for its Taco Tuesdays.",
    phone: "(253) 592-0402",
  },
  {
    name: "Alaska Weathervane Scallop Food Truck",
    city: "Tacoma, WA",
    lat: 47.2529,
    lng: -122.4443,
    cuisine: "seafood",
    description: "Run by the fishers who catch it, known for pan-seared, boat-frozen Alaska scallops.",
    website: "https://alaskascallop.net",
    phone: "(253) 582-2580",
  },
  {
    name: "Cousins Maine Lobster – Morgantown",
    city: "Morgantown, WV",
    lat: 39.6295,
    lng: -79.9559,
    cuisine: "seafood",
    description: "The national lobster-truck brand's West Virginia debut, in May 2025, known for wild-caught Maine lobster rolls.",
    website: "https://cousinsmainelobster.com/locations/morgantown-wv",
  },
  {
    name: "Camaradas Food Truck",
    city: "Morgantown, WV",
    lat: 39.6295,
    lng: -79.9559,
    cuisine: "mexican",
    description: "A Latino food truck known for Mexican-inspired plates, parked daily on Mileground Rd.",
    website: "https://camaradasfoodtruck.com",
    phone: "(304) 435-4279",
  },
  {
    name: "Southside Sliders",
    city: "Huntington, WV",
    lat: 38.4192,
    lng: -82.4452,
    cuisine: "american",
    description: "A family/locally-owned truck known for mini sliders and tater tots.",
    website: "https://southsidesliders.com",
    phone: "(304) 417-3782",
  },
  {
    name: "Shawarma Zone WV",
    city: "South Charleston, WV",
    lat: 38.3676,
    lng: -81.7001,
    cuisine: "other",
    description: "A Mediterranean truck known for shawarma, gyros, and falafel.",
    phone: "(304) 780-1999",
  },
  {
    name: "BillyD's",
    city: "Charleston, WV",
    lat: 38.3498,
    lng: -81.6326,
    cuisine: "american",
    description: "Known for wings and smash burgers, plus seafood/crawfish boils.",
    phone: "(304) 415-6691",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
