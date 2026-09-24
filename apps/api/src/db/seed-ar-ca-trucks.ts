import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Arkansas/California food trucks — see
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
    name: "Rolling Taco",
    city: "Bentonville, AR",
    lat: 36.3729,
    lng: -94.2088,
    cuisine: "mexican",
    description: "A family-run truck serving authentic Mexican street tacos, enchiladas, and quesadillas at the Bentonville Square farmers market.",
    phone: "(479) 340-3526",
  },
  {
    name: "Chao's Asian & American Foods",
    city: "Fayetteville, AR",
    lat: 36.0626,
    lng: -94.1574,
    cuisine: "asian",
    description: "A family-owned truck serving Hmong, Chinese, and Thai dishes made fresh to order, including pad thai and crab rangoons.",
    phone: "(479) 316-9191",
  },
  {
    name: "Katmandu MoMo",
    city: "Little Rock, AR",
    lat: 34.7465,
    lng: -92.2896,
    cuisine: "asian",
    description: "A Nepalese truck known for hand-wrapped momo dumplings with fresh-made achar sauce.",
    phone: "(501) 351-4169",
  },
  {
    name: "Hot Rod Wieners",
    city: "Little Rock, AR",
    lat: 34.7465,
    lng: -92.2896,
    cuisine: "american",
    description: "A husband-and-wife-run truck since 2014, known for gourmet hot dogs on scratch-made buns with homemade toppings.",
    phone: "(870) 210-6416",
  },
  {
    name: "Kogi BBQ",
    city: "Los Angeles, CA",
    lat: 34.0522,
    lng: -118.2437,
    cuisine: "mexican",
    description: "The original Korean-Mexican fusion taco truck, credited with launching the modern gourmet food truck movement.",
    website: "https://kogibbq.com",
  },
  {
    name: "Cena Vegan",
    city: "Los Angeles, CA",
    lat: 34.0522,
    lng: -118.2437,
    cuisine: "vegan",
    description: "A 100% plant-based truck known for its big burrito, nachos, and taco plates, popular at Smorgasburg LA.",
    website: "https://cenavegan.com",
    phone: "(323) 250-8965",
  },
  {
    name: "Longshot Coffee",
    city: "Los Angeles, CA",
    lat: 34.0522,
    lng: -118.2437,
    cuisine: "coffee",
    description: "A mobile espresso bar serving handcrafted lattes and cappuccinos at events across LA/SoCal.",
    website: "https://longshotcoffee.com",
  },
  {
    name: "Rincón del Cielo Taqueria",
    city: "San Mateo, CA",
    lat: 37.5629,
    lng: -122.3255,
    cuisine: "mexican",
    description: "A Bay Area truck serving scratch-made tacos, tortas, and quesabirria.",
    website: "https://rincondelcielotaqueria.com",
    phone: "(650) 704-2830",
  },
  {
    name: "Sam's ChowderMobile",
    city: "Half Moon Bay, CA",
    lat: 37.4636,
    lng: -122.4286,
    cuisine: "seafood",
    description: "An offshoot of Sam's Chowder House, famous for toasted lobster rolls and New England clam chowder.",
    website: "https://samschowdermobile.com",
  },
  {
    name: "The Lime Truck",
    city: "San Diego, CA",
    lat: 32.7157,
    lng: -117.1611,
    cuisine: "mexican",
    description: "A two-time \"Great Food Truck Race\" champion serving elevated Cali-Mex tacos and burrito bowls.",
    website: "https://thelimetruck.com",
  },
  {
    name: "Shawarma Guys",
    city: "San Diego, CA",
    lat: 32.7157,
    lng: -117.1611,
    cuisine: "other",
    description: "A cult-favorite Middle Eastern truck known for its signature Wagyu shawarma.",
    website: "https://theshawarmaguys.com",
    phone: "(619) 340-1234",
  },
  {
    name: "Buckhorn BBQ",
    city: "Sacramento, CA",
    lat: 38.5816,
    lng: -121.4944,
    cuisine: "bbq",
    description: "A Sacramento BBQ institution known for char-roasted tri-tip sandwiches with a house 10-spice rub.",
    website: "https://buckhorngrill.com",
  },
  {
    name: "The Lumpia Truck",
    city: "Sacramento, CA",
    lat: 38.5816,
    lng: -121.4944,
    cuisine: "asian",
    description: "A Filipino truck specializing in lumpia, serving Sacramento and Northern California.",
    website: "https://thelumpiatruck.com",
    phone: "(916) 337-5057",
  },
  {
    name: "Tacos Mi Reynita",
    city: "Oakland, CA",
    lat: 37.8044,
    lng: -122.2712,
    cuisine: "mexican",
    description: "An East Oakland truck known for Tijuana-style tacos with charcoal-grilled meats and housemade tortillas.",
    phone: "(510) 434-8039",
  },
  {
    name: "Lalkhan's Indian Express",
    city: "San Jose, CA",
    lat: 37.3382,
    lng: -121.8863,
    cuisine: "asian",
    description: "A truck serving traditional Indian dishes like butter chicken and vegetable biryani, with vegetarian/gluten-free options.",
    website: "https://indianxpressfood.com",
  },
  {
    name: "Rocko's Ice Cream Tacos",
    city: "San Jose, CA",
    lat: 37.3382,
    lng: -121.8863,
    cuisine: "dessert",
    description: "A dessert truck known for liquid-nitrogen-frozen ice cream tacos in a waffle-cone shell.",
    website: "https://rockosicecreamtacos.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
