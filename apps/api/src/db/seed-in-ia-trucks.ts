import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Indiana/Iowa food trucks — see
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
    name: "Birrieria Iturbidense Food Truck",
    city: "Indianapolis, IN",
    lat: 39.7684,
    lng: -86.1581,
    cuisine: "mexican",
    description: "A birria specialist known for birria tacos, pizzadillas, egg rolls, and ramen served with consommé for dipping.",
  },
  {
    name: "Nacho Mama's Food Truck",
    city: "Indianapolis, IN",
    lat: 39.7684,
    lng: -86.1581,
    cuisine: "mexican",
    description: "A Tex-Mex vegetarian truck known for creative loaded nachos, burritos, and bowls.",
    website: "https://nachomamasfoodtruck.com",
    phone: "(317) 374-6969",
  },
  {
    name: "Indy Porkopolis BBQ",
    city: "Indianapolis, IN",
    lat: 39.7684,
    lng: -86.1581,
    cuisine: "bbq",
    description: "A restaurant-backed BBQ truck known for smoked pulled pork, brisket, and mac and cheese at markets and events.",
    website: "https://indybbqcatering.com",
    phone: "(317) 746-6736",
  },
  {
    name: "Woody's BBQ",
    city: "Carmel, IN",
    lat: 39.9784,
    lng: -86.118,
    cuisine: "bbq",
    description: "A longtime, 20+ year local smokehouse truck known for ribs, pulled pork, and brisket.",
    website: "https://woodysflamingbbq.com",
    phone: "(574) 265-3492",
  },
  {
    name: "Planted Bloomington",
    city: "Bloomington, IN",
    lat: 39.1653,
    lng: -86.5264,
    cuisine: "vegan",
    description: "A plant-based truck known for open-faced \"flats\" sandwiches made with local seasonal vegetables.",
    website: "https://www.plantedbloomington.com",
  },
  {
    name: "One Love Food Truck",
    city: "Fort Wayne, IN",
    lat: 41.0793,
    lng: -85.1394,
    cuisine: "other",
    description: "A 7+ year Jamaican food truck known for jerk chicken, jerk pork, and fried plantains.",
    website: "https://www.onelovefoodtruck.com",
  },
  {
    name: "DonutNV Hamilton County",
    city: "Carmel, IN",
    lat: 39.9784,
    lng: -86.118,
    cuisine: "dessert",
    description: "A mobile mini-donut shop known for hot mini donuts with 20+ topping choices, plus coffee and lemonade.",
    website: "https://donutnv.com",
    phone: "(317) 900-4389",
  },
  {
    name: "O's Grill",
    city: "Cedar Rapids, IA",
    lat: 41.9779,
    lng: -91.6656,
    cuisine: "other",
    description: "A Mediterranean truck/trailer running since 2009, known for gyros, shawarma, and baklava.",
    website: "https://www.osgrill.com",
    phone: "(319) 200-3331",
  },
  {
    name: "Island Vybz Mobile Rasta-Rant",
    city: "Iowa City, IA",
    lat: 41.6611,
    lng: -91.5302,
    cuisine: "other",
    description: "A Caribbean/Jamaican truck known for jerk chicken and oxtail.",
    website: "https://www.islandvybzia.com",
  },
  {
    name: "Taqueria Veracruz",
    city: "Des Moines, IA",
    lat: 41.5868,
    lng: -93.625,
    cuisine: "mexican",
    description: "A truck bringing authentic Veracruz-style Mexican fare, known for carne asada tacos and tamales.",
    phone: "(515) 421-7995",
  },
  {
    name: "El Gringo Loco",
    city: "Washington, IA",
    lat: 41.2986,
    lng: -91.7057,
    cuisine: "mexican",
    description: "A traveling truck known for street tacos, burritos, and flautas at farmers markets and pop-ups.",
  },
  {
    name: "Banh Mi Amore",
    city: "Iowa City, IA",
    lat: 41.6611,
    lng: -91.5302,
    cuisine: "asian",
    description: "A Vietnamese sandwich truck, a 2018 Iowa City Top Chef People's Choice winner, known for its garlic-grilled banh mi.",
  },
  {
    name: "Momma Moody's Grinders",
    city: "Des Moines, IA",
    lat: 41.5868,
    lng: -93.625,
    cuisine: "american",
    description: "A family-owned sandwich truck known for hearty Italian and signature grinders at the Des Moines Farmers Market.",
    website: "https://mommamoodys.com",
    phone: "(515) 650-1122",
  },
  {
    name: "Nombo's Grub Truck",
    city: "Davenport, IA",
    lat: 41.5236,
    lng: -90.5776,
    cuisine: "american",
    description: "A comfort-food truck — a converted 1986 Chevy — known for mac and cheese, tacos, and dessert specials.",
  },
  {
    name: "Travelin' Tom's Coffee",
    city: "Cedar Rapids, IA",
    lat: 41.9779,
    lng: -91.6656,
    cuisine: "coffee",
    description: "The local branch of a mobile espresso/cold-brew truck serving events across the Cedar Rapids/Iowa City metro.",
    website: "https://travelintomscoffee.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
