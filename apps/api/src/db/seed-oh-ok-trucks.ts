import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Ohio/Oklahoma food trucks — see
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
    name: "Ray Ray's Hog Pit",
    city: "Columbus, OH",
    lat: 39.9612,
    lng: -82.9988,
    cuisine: "bbq",
    description: "Chef James Anderson raises his own pigs for slow-smoked pulled pork, ribs, and brisket; featured on Food Network's Diners, Drive-Ins and Dives.",
    website: "https://rayrayshogpit.com",
  },
  {
    name: "Mya's Fried Chicken",
    city: "Columbus, OH",
    lat: 39.9612,
    lng: -82.9988,
    cuisine: "american",
    description: "A Clintonville-area truck known for buttermilk-brined fried chicken sliders, chicken and waffles, and scratch-made biscuits.",
  },
  {
    name: "Queen's Table",
    city: "Columbus, OH",
    lat: 39.9612,
    lng: -82.9988,
    cuisine: "seafood",
    description: "Known for its \"Fishboat\" — fried fish piled on a bun with cabbage, tomato, and onion.",
    website: "https://queenstablefoodtruck.com",
    phone: "(614) 316-8943",
  },
  {
    name: "Crimson Cup Coffee Truck",
    city: "Columbus, OH",
    lat: 39.9612,
    lng: -82.9988,
    cuisine: "coffee",
    description: "The mobile arm of Columbus roaster Crimson Cup, serving espresso drinks and cold brew at local businesses.",
    website: "https://www.crimsoncup.com",
  },
  {
    name: "Off the GRIDdle",
    city: "Cleveland, OH",
    lat: 41.4993,
    lng: -81.6944,
    cuisine: "american",
    description: "A decade-plus Cleveland fixture known for handcrafted sandwiches like the Cuban and Big Pig, plus fries with garlic aioli.",
    website: "https://offthegriddlecle.com",
  },
  {
    name: "Squash the Beef",
    city: "Cleveland, OH",
    lat: 41.4993,
    lng: -81.6944,
    cuisine: "vegan",
    description: "A 100%-plant-based truck serving vegan Southern comfort food, including jackfruit sliders and mac and cheese.",
    website: "https://squashthebeefcle.com",
  },
  {
    name: "Fired Up Taco Truck",
    city: "Cleveland, OH",
    lat: 41.4993,
    lng: -81.6944,
    cuisine: "mexican",
    description: "Cleveland's long-running taco and catering truck, built from a former police SWAT vehicle.",
    website: "https://fireduptacos.com",
  },
  {
    name: "Tacos Locos",
    city: "Cincinnati, OH",
    lat: 39.1031,
    lng: -84.512,
    cuisine: "mexican",
    description: "A Pleasant Ridge staple since 2011, named the best food truck in Ohio in a national survey.",
    website: "https://tacoslocosfoodtruck.com",
    phone: "(513) 306-3617",
  },
  {
    name: "Duebbie Queen's Ice Cream",
    city: "Cincinnati, OH",
    lat: 39.1031,
    lng: -84.512,
    cuisine: "dessert",
    description: "A mobile soft-serve truck operating since 2017, serving sundaes, shakes, and cones at festivals and events.",
    website: "https://duebbiequeens.com",
  },
  {
    name: "Greek Street Food Truck",
    city: "Dayton, OH",
    lat: 39.7589,
    lng: -84.1916,
    cuisine: "other",
    description: "Chef Chris Spirtos serves family Greek recipes — spanakopita, souvlaki, rotisserie meats — with homemade baklava for dessert.",
    phone: "(937) 205-1018",
  },
  {
    name: "Newman's Firehouse BBQ",
    city: "Oklahoma City, OK",
    lat: 35.4676,
    lng: -97.5164,
    cuisine: "bbq",
    description: "A mobile BBQ operation serving slow-smoked pulled pork and brisket with homemade sauces.",
    website: "https://newmansfirehouse.com",
    phone: "(405) 990-9396",
  },
  {
    name: "Blue Donkey Cafe",
    city: "Oklahoma City, OK",
    lat: 35.4676,
    lng: -97.5164,
    cuisine: "mexican",
    description: "A family-owned truck based in the Arts District, known for Guatemalan-style fried tacos and homemade black bean soup.",
    phone: "(405) 434-5172",
  },
  {
    name: "OhMyGogi",
    city: "Oklahoma City, OK",
    lat: 35.4676,
    lng: -97.5164,
    cuisine: "asian",
    description: "OKC's first Korean-Mexican fusion truck, known for bulgogi tacos and the Gogi Burger.",
    website: "https://ohmygogi.com",
  },
  {
    name: "Seafood Connect",
    city: "Oklahoma City, OK",
    lat: 35.4676,
    lng: -97.5164,
    cuisine: "seafood",
    description: "A family-owned trailer since 2019 serving Cajun- and soul-inspired seafood, gumbo, and pasta.",
    phone: "(405) 227-9916",
  },
  {
    name: "Masa",
    city: "Tulsa, OK",
    lat: 36.154,
    lng: -95.9928,
    cuisine: "other",
    description: "Started in 2014, serving modern Latin fare — empanadas, arepas, and a Colombian chorizo choripán.",
    website: "https://masatulsa.com",
    phone: "(918) 764-8412",
  },
  {
    name: "Balkan Bites",
    city: "Broken Arrow, OK",
    lat: 36.0526,
    lng: -95.7969,
    cuisine: "other",
    description: "Tulsa area's first Balkan food truck, founded by two culinary-school friends from Montenegro, serving ćevapi and grilled meats.",
    website: "https://balkanbitesok.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
