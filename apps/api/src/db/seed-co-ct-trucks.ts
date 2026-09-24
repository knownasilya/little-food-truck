import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Colorado/Connecticut food trucks — see
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
    name: "Brad's Pit BBQ",
    city: "Denver, CO",
    lat: 39.7392,
    lng: -104.9903,
    cuisine: "bbq",
    description: "Hickory-smoked brisket, ribs, and pulled pork from a longtime Denver-metro BBQ truck.",
    website: "https://bradsbbq.com",
    phone: "(720) 510-1765",
  },
  {
    name: "Mukja",
    city: "Denver, CO",
    lat: 39.7392,
    lng: -104.9903,
    cuisine: "asian",
    description: "A family-run Korean fusion truck known for Korean corn/cheese dogs and wonton nachos.",
  },
  {
    name: "Tacos GTO",
    city: "Boulder, CO",
    lat: 40.015,
    lng: -105.2705,
    cuisine: "mexican",
    description: "A family-owned taco trailer serving street tacos, burritos, and tortas around Boulder.",
  },
  {
    name: "Cafe Alejandro",
    city: "Boulder, CO",
    lat: 40.015,
    lng: -105.2705,
    cuisine: "coffee",
    description: "A purple mobile espresso truck known for its Mexican Mocha.",
    website: "https://cafealejandro.com",
  },
  {
    name: "La Tapatia Tacos",
    city: "Colorado Springs, CO",
    lat: 38.8339,
    lng: -104.8214,
    cuisine: "mexican",
    description: "A Mexican street-food truck known for pizzabirra and quesabirra creations.",
    phone: "(719) 505-2166",
  },
  {
    name: "Lumpia House",
    city: "Colorado Springs, CO",
    lat: 38.8339,
    lng: -104.8214,
    cuisine: "asian",
    description: "A Filipino food truck specializing in multiple lumpia varieties plus lomein and pancit noodles.",
    phone: "(719) 321-5743",
  },
  {
    name: "Kona Ice of Northern Colorado",
    city: "Fort Collins, CO",
    lat: 40.5853,
    lng: -105.0844,
    cuisine: "dessert",
    description: "A mobile shaved-ice truck with a \"Flavorwave\" custom-blend feature, serving Northern Colorado events.",
    website: "https://www.kona-ice.com",
  },
  {
    name: "Ted's Restaurant",
    city: "Hartford, CT",
    lat: 41.7658,
    lng: -72.6734,
    cuisine: "american",
    description: "A historic steamed-cheeseburger brand's food truck (the brand itself dates to 1959), a regular at Bushnell Park and area venues.",
    website: "https://tedsrestaurant.com",
  },
  {
    name: "Ixtapa Mexican Tacos",
    city: "New Haven, CT",
    lat: 41.3083,
    lng: -72.9279,
    cuisine: "mexican",
    description: "A long-running taco truck on New Haven's Long Wharf \"food truck row,\" known for tacos, tortas, and huevos rancheros.",
  },
  {
    name: "Banh Mi On Cedar",
    city: "New Haven, CT",
    lat: 41.3083,
    lng: -72.9279,
    cuisine: "asian",
    description: "A Vietnamese sandwich cart on Cedar Street known for its banh mi.",
  },
  {
    name: "The Jitter Bus",
    city: "New Haven, CT",
    lat: 41.3083,
    lng: -72.9279,
    cuisine: "coffee",
    description: "An espresso bar built into a retrofitted black school bus, serving single-origin Connecticut-roasted coffee since 2016.",
    website: "https://thejitterbus.com",
    phone: "(203) 645-9887",
  },
  {
    name: "Fire Engine Pizza Co",
    city: "Bridgeport, CT",
    lat: 41.1792,
    lng: -73.1894,
    cuisine: "other",
    description: "Wood-fired pizza served from a converted 1985 fire engine, stationed on Fairfield Ave.",
    website: "https://thefireenginepizzaco.com",
    phone: "(203) 333-3473",
  },
  {
    name: "The Tasty Yolk",
    city: "Bridgeport, CT",
    lat: 41.1792,
    lng: -73.1894,
    cuisine: "american",
    description: "A breakfast-sandwich truck brand known for its brisket \"Banker\" sandwich.",
    website: "https://thetastyyolk.com",
  },
  {
    name: "GMonkey Mobile",
    city: "Durham, CT",
    lat: 41.4801,
    lng: -72.6809,
    cuisine: "vegan",
    description: "Connecticut's original all-vegan, organic food truck, serving farm-to-street soups, salads, and desserts since 2009.",
    website: "https://gmonkeyfastfood.com",
  },
  {
    name: "LobsterCraft",
    city: "Fairfield, CT",
    lat: 41.1408,
    lng: -73.2637,
    cuisine: "seafood",
    description: "An award-winning Connecticut-style hot buttered lobster roll truck, in business since 2012.",
    website: "https://lobstercraft.com",
    phone: "(203) 292-5350",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
