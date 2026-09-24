import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating New York/North Dakota food trucks — see
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
    name: "The Halal Guys",
    city: "Manhattan, NY",
    lat: 40.7831,
    lng: -73.9712,
    cuisine: "other",
    description: "One of NYC's original halal carts, credited with launching the city's halal cart boom in the 1990s.",
    website: "https://thehalalguys.com/locations/west-53rd-street-new-york/",
    phone: "(347) 527-1505",
  },
  {
    name: "Uncle Gussy's",
    city: "Manhattan, NY",
    lat: 40.7831,
    lng: -73.9712,
    cuisine: "other",
    description: "A family-run Greek truck — souvlaki, gyro, saffron rice — serving NYC streets since 1971.",
    website: "https://unclegussys.com",
    phone: "(929) 600-1111",
  },
  {
    name: "Wafels & Dinges",
    city: "Manhattan, NY",
    lat: 40.7831,
    lng: -73.9712,
    cuisine: "dessert",
    description: "A Belgian Liège-style waffle truck, Vendy Award winner and \"Throwdown with Bobby Flay\" champion.",
    website: "https://www.wafels.com",
  },
  {
    name: "NYC Pizza Truck",
    city: "Brooklyn, NY",
    lat: 40.6782,
    lng: -73.9442,
    cuisine: "other",
    description: "A chef-owned wood-fired pizza truck, a Smorgasburg regular for over a decade.",
  },
  {
    name: "Tacos El Bronco II",
    city: "Bronx, NY",
    lat: 40.8448,
    lng: -73.8648,
    cuisine: "mexican",
    description: "A longtime Bronx street-taco truck, voted Best Food Truck in the Bronx.",
  },
  {
    name: "Amdo Kitchen",
    city: "Queens, NY",
    lat: 40.7282,
    lng: -73.7949,
    cuisine: "asian",
    description: "A Tibetan momo truck, five-time winner of the Jackson Heights Momo Crawl trophy.",
    phone: "(347) 612-8208",
  },
  {
    name: "Tacos Brothers Truck",
    city: "Staten Island, NY",
    lat: 40.5795,
    lng: -74.1502,
    cuisine: "mexican",
    description: "A multi-truck Mexican street food operation — tacos, tortas, quesadillas — across Staten Island.",
    website: "https://tacosbrotherstruck.com",
    phone: "(347) 864-2980",
  },
  {
    name: "Lloyd Taco Trucks",
    city: "Buffalo, NY",
    lat: 42.8864,
    lng: -78.8784,
    cuisine: "mexican",
    description: "Buffalo's first taco truck, now running four trucks plus catering.",
    website: "https://www.whereslloyd.com",
    phone: "(716) 863-9781",
  },
  {
    name: "Cousins Maine Lobster",
    city: "Buffalo, NY",
    lat: 42.8864,
    lng: -78.8784,
    cuisine: "seafood",
    description: "The franchise lobster-roll truck of Shark Tank fame, with a dedicated Buffalo route.",
    website: "https://cousinsmainelobster.com/locations/buffalo-ny",
  },
  {
    name: "Roc City Sammich",
    city: "Rochester, NY",
    lat: 43.1566,
    lng: -77.6088,
    cuisine: "american",
    description: "Known for Pittsburgh-style sandwiches with fries stuffed inside, operating since 2012.",
    website: "https://roccitysammich.com",
    phone: "(585) 802-0147",
  },
  {
    name: "Byblos Street Grill",
    city: "Syracuse, NY",
    lat: 43.0481,
    lng: -76.1474,
    cuisine: "other",
    description: "A Lebanese/Mediterranean gyro and grill truck, an offshoot of Byblos Mediterranean Cafe, est. 2010.",
    website: "https://byblossyr.com/page/byblos-food-trucks",
  },
  {
    name: "THORN + ROOTS",
    city: "Albany, NY",
    lat: 42.6526,
    lng: -73.7562,
    cuisine: "vegan",
    description: "Organic grain bowls, smoothies, and juices, a regular at Albany VegFest and the Albany Heritage Area Visitors Center.",
    website: "https://www.thornandroots.com",
  },
  {
    name: "Jumbo's Food Truck",
    city: "Fargo, ND",
    lat: 46.8772,
    lng: -96.7898,
    cuisine: "american",
    description: "Known for its \"sloppiest joes in North Dakota.\"",
    website: "https://jumbossloppyjoesauce.com",
    phone: "(701) 306-0458",
  },
  {
    name: "Twisted J'z Mobile Coffee, Ice Cream & Eats",
    city: "Fargo, ND",
    lat: 46.8772,
    lng: -96.7898,
    cuisine: "coffee",
    description: "A mobile coffee and treats trailer serving the Fargo-West Fargo area.",
  },
  {
    name: "Darrell's BBQ",
    city: "Bismarck, ND",
    lat: 46.8083,
    lng: -100.7837,
    cuisine: "bbq",
    description: "A Southern-style BBQ/soul food truck founded in 2013, known for fall-off-the-bone ribs.",
    phone: "(701) 220-7398",
  },
  {
    name: "Melissa's Mobile Cocina",
    city: "Grand Forks, ND",
    lat: 47.9253,
    lng: -97.0329,
    cuisine: "mexican",
    description: "A Tex-Mex truck known for tacos, birria, and enchiladas.",
    website: "https://melissascocina.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
