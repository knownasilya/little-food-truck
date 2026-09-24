import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Wisconsin/Wyoming food trucks — see
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
    name: "Fully Loaded",
    city: "Milwaukee, WI",
    lat: 43.0389,
    lng: -87.9065,
    cuisine: "american",
    description: "A Milwaukee truck known for its \"world-famous\" loaded fries and burgers.",
    phone: "(414) 914-0499",
  },
  {
    name: "KISS Korean BBQ",
    city: "Milwaukee, WI",
    lat: 43.0389,
    lng: -87.9065,
    cuisine: "asian",
    description: "A Korean BBQ truck serving bulgogi bowls, kimbap, and short-rib rice bowls from family recipes.",
    website: "https://kisskoreanbbq.com",
  },
  {
    name: "Flour Girl & Flame",
    city: "West Allis, WI",
    lat: 43.0167,
    lng: -88.0071,
    cuisine: "other",
    description: "A wood-fired mobile pizza oven turning out hand-tossed pies with organic heirloom flour.",
    website: "https://flourgirlandflame.com",
  },
  {
    name: "El Chido Street Tacos",
    city: "Milwaukee, WI",
    lat: 43.0389,
    lng: -87.9065,
    cuisine: "mexican",
    description: "A Milwaukee taco truck serving marinated street tacos, a regular at local festivals like Brady Street Fest.",
  },
  {
    name: "Better Together Mobile Cafe",
    city: "Milwaukee, WI",
    lat: 43.0389,
    lng: -87.9065,
    cuisine: "coffee",
    description: "A coffee-and-milkshake truck pouring espresso and nitro cold brew with local Pilcrow Coffee and Sassy Cow Dairy.",
    website: "https://bettertogether.cafe",
  },
  {
    name: "Caracas Empanadas",
    city: "Madison, WI",
    lat: 43.0731,
    lng: -89.4012,
    cuisine: "other",
    description: "A long-running Library Mall cart serving Venezuelan-style empanadas and arepas.",
  },
  {
    name: "Freeman Brothers BBQ",
    city: "Verona, WI",
    lat: 42.9909,
    lng: -89.5343,
    cuisine: "bbq",
    description: "A competition-pedigreed BBQ truck whose brisket and ribs have won regional and national BBQ titles.",
  },
  {
    name: "Kakilima Food Cart",
    city: "Madison, WI",
    lat: 43.0731,
    lng: -89.4012,
    cuisine: "asian",
    description: "A Library Mall cart serving Indonesian classics like nasi goreng and peanut-sauce chicken.",
  },
  {
    name: "Taqueria Maldonado's",
    city: "Green Bay, WI",
    lat: 44.5133,
    lng: -88.0133,
    cuisine: "mexican",
    description: "A family-run truck serving authentic Mexican food and homemade tortillas since 2002.",
    website: "https://taqueriamaldonados.shop",
    phone: "(920) 468-8730",
  },
  {
    name: "Scrapyard Smoker BBQ",
    city: "Green Bay, WI",
    lat: 44.5133,
    lng: -88.0133,
    cuisine: "bbq",
    description: "A downtown Green Bay truck known for slow-smoked pulled pork sandwiches and loaded mac & cheese.",
  },
  {
    name: "The Dough Shoppe",
    city: "Green Bay, WI",
    lat: 44.5133,
    lng: -88.0133,
    cuisine: "dessert",
    description: "Wisconsin's first edible-cookie-dough business, with a dough truck, trailer, and cart.",
    website: "https://thedoughshoppe.com",
    phone: "(920) 425-3223",
  },
  {
    name: "Fat Howard's Chili Company",
    city: "Cheyenne, WY",
    lat: 41.14,
    lng: -104.8202,
    cuisine: "american",
    description: "A father-daughter truck serving competition-style red, green, and white chicken chili plus mac & cheese.",
    website: "https://fathowardschili.com",
  },
  {
    name: "Los Conejos Food Truck",
    city: "Cheyenne, WY",
    lat: 41.14,
    lng: -104.8202,
    cuisine: "mexican",
    description: "A street-food-fusion truck serving birria tacos, sliders, bowls, and churros.",
    phone: "(307) 200-9379",
  },
  {
    name: "WyoPhilly Food Truck",
    city: "Casper, WY",
    lat: 42.8501,
    lng: -106.3252,
    cuisine: "american",
    description: "A Philly-style sandwich truck with slow-smoked brisket, house queso, and loaded nachos.",
    website: "https://wyophilly.com",
    phone: "(307) 797-6080",
  },
  {
    name: "Buffalo Bills Food Truck and Catering",
    city: "Hoback Junction, WY",
    lat: 43.3489,
    lng: -110.7885,
    cuisine: "american",
    description: "A seasonal truck serving farm-to-table elk and buffalo burgers sourced from Wyoming/Idaho ranches.",
    website: "https://wyobuffalobills.com",
    phone: "(307) 699-8693",
  },
  {
    name: "Wander Tortilleria",
    city: "Jackson, WY",
    lat: 43.4799,
    lng: -110.7624,
    cuisine: "mexican",
    description: "An Airstream-based truck making elevated tacos on hand-pressed, heritage-grain tortillas.",
    website: "https://thewandertruck.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
