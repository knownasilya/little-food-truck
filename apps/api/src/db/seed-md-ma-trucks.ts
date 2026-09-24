import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Maryland/Massachusetts food trucks — see
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
    name: "Jimmy's Famous Seafood Truck",
    city: "Baltimore, MD",
    lat: 39.2904,
    lng: -76.6122,
    cuisine: "seafood",
    description: "The mobile arm of Baltimore's iconic 1974 seafood landmark, known for Maryland crab cakes and cream-of-crab soup.",
    website: "https://jimmysfamousseafood.com/food-truck",
  },
  {
    name: "Pizza di Joey",
    city: "Baltimore, MD",
    lat: 39.2904,
    lng: -76.6122,
    cuisine: "other",
    description: "A Navy-veteran-founded brick-oven truck serving NY-style pizza by the slice and 24-inch family pies.",
    website: "https://pizzadijoey.com",
  },
  {
    name: "Smoke-N-Wheels Barbeque",
    city: "Baltimore, MD",
    lat: 39.2904,
    lng: -76.6122,
    cuisine: "bbq",
    description: "A veteran-owned truck slow-smoking brisket, ribs, and pulled pork right on board, plus a signature \"Love Bowl.\"",
  },
  {
    name: "Deddle's Mini Donuts & Chicken",
    city: "Baltimore, MD",
    lat: 39.2904,
    lng: -76.6122,
    cuisine: "dessert",
    description: "Serving Baltimore since 2016 — made-to-order mini donuts (including liquor-infused \"grown-up\" toppings) paired with fried chicken.",
    website: "https://deddlesdonuts.com",
    phone: "(443) 738-4844",
  },
  {
    name: "Sparkplug Coffee",
    city: "Rockville, MD",
    lat: 39.084,
    lng: -77.1528,
    cuisine: "coffee",
    description: "A family-run mobile coffee shop in a retrofitted vintage Suzuki, pouring beans from Maryland's Rise Up Coffee Roasters.",
    website: "https://sparkplugcoffeetruck.com",
  },
  {
    name: "In10se BBQ",
    city: "Frederick, MD",
    lat: 39.4143,
    lng: -77.4105,
    cuisine: "bbq",
    description: "Family-owned since 2009 — pecan-wood-smoked barbecue smoked up to 16 hours, plus catering and bar service.",
    website: "https://in10sebbq.com",
    phone: "(301) 639-5616",
  },
  {
    name: "Fire Pit Brazilian BBQ",
    city: "Rockville, MD",
    lat: 39.084,
    lng: -77.1528,
    cuisine: "other",
    description: "A mother-son-run truck/trailer serving authentic southern-Brazil gaucho barbecue — picanha, beef ribs — with traditional sides.",
    website: "https://firepitbr.com",
  },
  {
    name: "Black Market Bakers Food Truck",
    city: "Annapolis, MD",
    lat: 38.9784,
    lng: -76.4922,
    cuisine: "dessert",
    description: "Began as a pandemic-era home bakery; the truck serves cruffins, scones, and daily vegan pastries on weekend mornings.",
    website: "https://blackmarketbakers.com",
  },
  {
    name: "Annapolis Gyro",
    city: "Annapolis, MD",
    lat: 38.9784,
    lng: -76.4922,
    cuisine: "other",
    description: "A late-night halal truck known for lamb gyros, shawarma platters, and its popular signature white sauce.",
  },
  {
    name: "Bon Me",
    city: "Boston, MA",
    lat: 42.3601,
    lng: -71.0589,
    cuisine: "asian",
    description: "One of Boston's original trucks, from 2011, serving Asian-inspired banh mi sandwiches, noodle salads, and rice bowls.",
    website: "https://bonmetruck.com",
  },
  {
    name: "Roxy's Grilled Cheese",
    city: "Boston, MA",
    lat: 42.3601,
    lng: -71.0589,
    cuisine: "american",
    description: "Boston's first food truck permitted on a city street, in 2011, serving gourmet grilled cheese sandwiches.",
    website: "https://roxysgrilledcheese.com",
  },
  {
    name: "Chicken & Rice Guys",
    city: "Boston, MA",
    lat: 42.3601,
    lng: -71.0589,
    cuisine: "other",
    description: "A halal/kosher fleet serving chicken-over-rice with white and red sauce since 2012.",
    website: "https://cnrguys.com",
    phone: "617-903-8538",
  },
  {
    name: "Big T's Jerky House and BBQ",
    city: "Worcester, MA",
    lat: 42.2626,
    lng: -71.8023,
    cuisine: "bbq",
    description: "Southern-style pit BBQ and award-winning beef jerky, known for its meat-topped \"BBQ Sundae.\"",
    website: "https://bigtsjerkyhouse.com",
  },
  {
    name: "El Charro",
    city: "Springfield, MA",
    lat: 42.1015,
    lng: -72.5898,
    cuisine: "mexican",
    description: "A long-running cash-only taco truck known for authentic tacos, cabeza/lengua options, and housemade salsas.",
  },
  {
    name: "Taco Party Truck",
    city: "Somerville, MA",
    lat: 42.3876,
    lng: -71.0995,
    cuisine: "vegan",
    description: "Boston's original all-vegan truck, founded 2013, serving jackfruit \"pulled pork,\" tempeh, and cashew-crema tacos.",
    website: "https://tacopartyboston.com",
  },
  {
    name: "Kebob King",
    city: "Worcester, MA",
    lat: 42.2626,
    lng: -71.8023,
    cuisine: "other",
    description: "A Greek/Mediterranean-inspired truck serving gyros, falafel, and kebab plates with rice pilaf and hummus.",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
