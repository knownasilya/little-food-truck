import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Louisiana/Maine food trucks — see
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
    name: "Taceaux Loceaux",
    city: "New Orleans, LA",
    lat: 29.9511,
    lng: -90.0715,
    cuisine: "mexican",
    description: "An Uptown New Orleans mobile taqueria known for gourmet, chef-driven specialty tacos.",
    website: "https://taceauxloceaux.square.site",
    phone: "(504) 307-4747",
  },
  {
    name: "Tanjariné Kitchen",
    city: "New Orleans, LA",
    lat: 29.9511,
    lng: -90.0715,
    cuisine: "vegan",
    description: "A Black-owned truck serving entirely plant-based, African-inspired dishes, like the Mandela burger.",
    website: "https://tanjarinekitchen.com",
    phone: "(504) 301-6954",
  },
  {
    name: "Petite Rouge Coffee Truck",
    city: "New Orleans, LA",
    lat: 29.9511,
    lng: -90.0715,
    cuisine: "coffee",
    description: "A mobile espresso/tea bar in a vintage van, serving espresso drinks and pastries at events around town.",
    website: "https://petiterougecoffeetruck.com",
  },
  {
    name: "Frencheeze Food Truck",
    city: "New Orleans, LA",
    lat: 29.9511,
    lng: -90.0715,
    cuisine: "american",
    description: "A gourmet grilled-cheese truck known for creative combos like brisket with raspberry preserves.",
    website: "https://frencheezefoodtruck.com",
    phone: "(504) 264-3871",
  },
  {
    name: "Crawfish on the Geaux",
    city: "Baton Rouge, LA",
    lat: 30.4515,
    lng: -91.1871,
    cuisine: "seafood",
    description: "Specializes in boiled crawfish by the pound with classic Cajun sides — corn, potatoes, sausage.",
  },
  {
    name: "Cou-Yon's Cajun BBQ",
    city: "Baton Rouge, LA",
    lat: 30.4515,
    lng: -91.1871,
    cuisine: "bbq",
    description: "A slow-smoked Cajun barbecue truck, an offshoot of the long-running Cou-Yon's restaurant, known for baby-back ribs and loaded baked potatoes.",
    website: "https://couyons.com",
  },
  {
    name: "Beignet Box",
    city: "Lafayette, LA",
    lat: 30.2241,
    lng: -92.0198,
    cuisine: "dessert",
    description: "A Louisiana-founded truck serving fresh, made-to-order beignets dusted with powdered sugar.",
    website: "https://thebeignetbox.com",
  },
  {
    name: "Rice Kings",
    city: "Lafayette, LA",
    lat: 30.2241,
    lng: -92.0198,
    cuisine: "asian",
    description: "An Asian-inspired truck known for hibachi bowls, Korean tacos, and kimchi fries.",
    phone: "(337) 944-9328",
  },
  {
    name: "Bite Into Maine",
    city: "Portland, ME",
    lat: 43.6591,
    lng: -70.2568,
    cuisine: "seafood",
    description: "A nationally recognized lobster roll truck offering six styles — Maine, Connecticut, curry, wasabi, and more.",
    website: "https://biteintomaine.com",
  },
  {
    name: "Black Salt",
    city: "Portland, ME",
    lat: 43.6591,
    lng: -70.2568,
    cuisine: "american",
    description: "An elevated fried chicken sandwich truck, known for the Korean-BBQ-inspired \"Seoul Bird.\"",
    website: "https://blacksaltmaine.com",
    phone: "(207) 406-3080",
  },
  {
    name: "Eighty8 Donuts",
    city: "Portland, ME",
    lat: 43.6591,
    lng: -70.2568,
    cuisine: "dessert",
    description: "A beloved donut truck, operating since 2013, serving hot, made-to-order mini donuts, often on the Eastern Promenade.",
    website: "https://eighty8donuts.com",
    phone: "(207) 805-0488",
  },
  {
    name: "Tacos Del Seoul",
    city: "Portland, ME",
    lat: 43.6591,
    lng: -70.2568,
    cuisine: "asian",
    description: "A Korean-Mexican fusion truck serving bulgogi tacos, rice bowls, and burritos.",
  },
  {
    name: "Casa Mexicana",
    city: "Bangor, ME",
    lat: 44.8016,
    lng: -68.7712,
    cuisine: "mexican",
    description: "A seasonal Bangor Waterfront taco truck known for hand-made shells and a large rotating taco menu.",
    phone: "(207) 249-2312",
  },
  {
    name: "The Lobstah Buoy",
    city: "Bangor, ME",
    lat: 44.8016,
    lng: -68.7712,
    cuisine: "seafood",
    description: "\"Greater Bangor's Original Fresh Shucked Food Truck,\" known for never-frozen lobster and crab rolls.",
    website: "https://thelobstahbuoy.business.site",
  },
  {
    name: "Schnitzel's Austrian Grill",
    city: "Bangor, ME",
    lat: 44.8016,
    lng: -68.7712,
    cuisine: "other",
    description: "A truck bringing traditional Austrian dishes — schnitzel, strudel, potato salad — to Bangor.",
    website: "https://schnitzelme.com",
    phone: "(207) 517-2613",
  },
  {
    name: "Salty Dog BBQ",
    city: "Winslow, ME",
    lat: 44.5334,
    lng: -69.622,
    cuisine: "bbq",
    description: "A family-run Southern BBQ truck with an onboard wood-fired smoker, serving the mid-Maine/Augusta area since 2018.",
    website: "https://saltydogbbq.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
