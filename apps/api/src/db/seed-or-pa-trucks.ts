import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Oregon/Pennsylvania food trucks — see
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
    name: "Bark City BBQ",
    city: "Portland, OR",
    lat: 45.5152,
    lng: -122.6784,
    cuisine: "bbq",
    description: "An award-winning Portland BBQ cart (2018 Eater PDX \"Food Cart of the Year\") known for smoked brisket and ribs.",
    website: "https://barkcitybbq.com",
  },
  {
    name: "Mole Mole",
    city: "Portland, OR",
    lat: 45.5152,
    lng: -122.6784,
    cuisine: "mexican",
    description: "A family-owned cart known for house-made mole sauces on enchiladas, tacos, and quesabirria.",
    website: "https://molemolepdx.com",
  },
  {
    name: "Stretch the Noodle",
    city: "Portland, OR",
    lat: 45.5152,
    lng: -122.6784,
    cuisine: "asian",
    description: "A husband-and-wife cart famous for made-to-order, hand-pulled Chinese noodles and dumplings.",
    website: "https://stretch-the-noodle.com",
  },
  {
    name: "Spella Caffè",
    city: "Portland, OR",
    lat: 45.5152,
    lng: -122.6784,
    cuisine: "coffee",
    description: "A compact downtown espresso cart praised for old-school Italian-style espresso and cappuccino.",
    website: "https://spellacaffe.com",
  },
  {
    name: "Farmer and the Beast",
    city: "Portland, OR",
    lat: 45.5152,
    lng: -122.6784,
    cuisine: "american",
    description: "A cart celebrated for its smash burger, ranked among the city's best cart burgers by The Oregonian.",
  },
  {
    name: "Honeycuspe",
    city: "Portland, OR",
    lat: 45.5152,
    lng: -122.6784,
    cuisine: "dessert",
    description: "A cart specializing in gourmet sweet-and-savory Belgian waffles.",
  },
  {
    name: "Barrio Midtown Yacht Club Food Truck",
    city: "Bend, OR",
    lat: 44.0582,
    lng: -121.3153,
    cuisine: "other",
    description: "A food truck at the Midtown Yacht Club pod serving tacos, burritos, patatas bravas, and paella.",
    website: "https://www.barriobend.com/truck-midtown",
  },
  {
    name: "Uumami Mediterranean",
    city: "Eugene, OR",
    lat: 44.0521,
    lng: -123.0868,
    cuisine: "other",
    description: "A food truck serving Mediterranean plates with gluten-free options.",
    website: "https://uumamifoodcart.com",
  },
  {
    name: "Lyn's",
    city: "Philadelphia, PA",
    lat: 39.9526,
    lng: -75.1652,
    cuisine: "american",
    description: "A truck widely regarded as serving the city's best bacon, egg, and cheese sandwiches.",
  },
  {
    name: "El Amiguito",
    city: "Philadelphia, PA",
    lat: 39.9526,
    lng: -75.1652,
    cuisine: "mexican",
    description: "A mobile food truck operation serving authentic Mexican tacos, quesadillas, and burritos.",
    website: "https://www.elamiguitophilly.com",
  },
  {
    name: "Cupcake Carnivale",
    city: "Philadelphia, PA",
    lat: 39.9526,
    lng: -75.1652,
    cuisine: "dessert",
    description: "An award-winning mobile cupcake truck founded by a pastry chef in 2012, serving gourmet cupcakes.",
    website: "https://cupcakecarnivale.com",
  },
  {
    name: "Get Smok'd BBQ",
    city: "Camp Hill, PA",
    lat: 40.2454,
    lng: -76.9294,
    cuisine: "bbq",
    description: "Scratch-made smoked meats, ribs, and street corn from a truck-and-storefront BBQ operation.",
    website: "https://www.getsmokdbbq.com",
    phone: "(717) 222-5040",
  },
  {
    name: "Cousins Maine Lobster – Pittsburgh",
    city: "Pittsburgh, PA",
    lat: 40.4406,
    lng: -79.9959,
    cuisine: "seafood",
    description: "The local franchise of the nationally known lobster-roll truck, bringing Maine seafood to the city.",
    website: "https://www.cousinsmainelobster.com/locations/pittsburgh-pa",
    phone: "(412) 228-5321",
  },
  {
    name: "Cool Beans Truck",
    city: "Pittsburgh, PA",
    lat: 40.4406,
    lng: -79.9959,
    cuisine: "coffee",
    description: "A coffee-and-breakfast truck known for artisan coffee, breakfast burritos, and vegan options, a Pittsburgh Marathon regular.",
    website: "https://coolbeanstruck.com",
    phone: "(412) 498-1912",
  },
  {
    name: "La Frikitona",
    city: "Allentown, PA",
    lat: 40.6084,
    lng: -75.4902,
    cuisine: "other",
    description: "A family-owned mobile kitchen serving Puerto Rican dishes like mofongo, pinchos, and plantain bowls.",
    website: "https://www.lafrikitonallc.com",
    phone: "(484) 640-8477",
  },
  {
    name: "Soul Lotta Empanadas",
    city: "Harrisburg, PA",
    lat: 40.2732,
    lng: -76.8867,
    cuisine: "other",
    description: "A food truck fusing Southern soul food with Latin flavors, known for empanadas and Cajun catfish tacos.",
    website: "https://soullottaempanadas.com",
    phone: "(717) 236-3500",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
