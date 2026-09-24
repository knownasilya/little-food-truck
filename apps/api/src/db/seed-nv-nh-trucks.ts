import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Nevada/New Hampshire food trucks — see
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
    name: "Fuku Burger",
    city: "Las Vegas, NV",
    lat: 36.1699,
    lng: -115.1398,
    cuisine: "american",
    description: "Las Vegas's original food truck, est. 2011, known for Japanese-inspired gourmet burgers.",
    website: "https://fukuburger.com",
    phone: "(702) 262-6995",
  },
  {
    name: "Lucky Cat BBQ",
    city: "North Las Vegas, NV",
    lat: 36.1989,
    lng: -115.1175,
    cuisine: "bbq",
    description: "Smoked BBQ blending Hawaiian, Texas, and Korean styles, known for tender brisket.",
  },
  {
    name: "Dragon Grille",
    city: "Las Vegas, NV",
    lat: 36.1699,
    lng: -115.1398,
    cuisine: "asian",
    description: "A Korean-American fusion truck with multiple \"Best Food Truck\" wins from Las Vegas Weekly and Review-Journal.",
  },
  {
    name: "Two Cat Coffee",
    city: "Las Vegas, NV",
    lat: 36.1699,
    lng: -115.1398,
    cuisine: "coffee",
    description: "A woman-owned mobile espresso and coffee truck serving events across the valley.",
    website: "https://twocatcoffee.com",
    phone: "(702) 850-1165",
  },
  {
    name: "Good Bad Delicious",
    city: "Las Vegas, NV",
    lat: 36.1699,
    lng: -115.1398,
    cuisine: "vegan",
    description: "A food trailer offering vegan, vegetarian, and gluten-free global street food.",
  },
  {
    name: "The Meat Wagon",
    city: "Las Vegas, NV",
    lat: 36.1699,
    lng: -115.1398,
    cuisine: "american",
    description: "A family-owned truck, est. 2022, for smoked-meat handhelds, a regular stop at Millennium Fandom Bar.",
  },
  {
    name: "The Codfather",
    city: "Reno, NV",
    lat: 39.5296,
    lng: -119.8138,
    cuisine: "seafood",
    description: "A fish and chips and fried seafood truck.",
  },
  {
    name: "King Reno Tacos",
    city: "Reno, NV",
    lat: 39.5296,
    lng: -119.8138,
    cuisine: "mexican",
    description: "Award-winning modern Mexican tacos, a 2016 and 2019 award winner.",
    phone: "(775) 232-8605",
  },
  {
    name: "B's Tacos",
    city: "Manchester, NH",
    lat: 42.9956,
    lng: -71.4548,
    cuisine: "mexican",
    description: "Tex-Mex tacos, burritos, and rice bowls, serving since 2013.",
    website: "https://www.nhtacotruck.com",
    phone: "(603) 622-8200",
  },
  {
    name: "Hickory Stix BBQ",
    city: "Londonderry, NH",
    lat: 42.8654,
    lng: -71.3737,
    cuisine: "bbq",
    description: "A Texas-style BBQ truck known for ribs and brisket.",
    website: "https://hickorystixbbq.rocks",
    phone: "(603) 425-8003",
  },
  {
    name: "One Happy Clam",
    city: "Derry, NH",
    lat: 42.8809,
    lng: -71.3273,
    cuisine: "seafood",
    description: "Lobster rolls, clam rolls, and fish and chips.",
    phone: "(603) 548-5870",
  },
  {
    name: "Miss Polly's Traveling Treats",
    city: "Concord, NH",
    lat: 43.2081,
    lng: -71.5376,
    cuisine: "dessert",
    description: "A vintage-style ice cream truck with 40+ novelty treats.",
    website: "https://misspollystravelingtreats.com",
    phone: "(603) 219-0418",
  },
  {
    name: "Pressed For Time Mobile Cafe",
    city: "Derry, NH",
    lat: 42.8809,
    lng: -71.3273,
    cuisine: "coffee",
    description: "Sweet crepes, breakfast sandwiches, and coffee drinks.",
    website: "https://www.pressedfortimecoffee.com",
    phone: "(603) 395-3256",
  },
  {
    name: "Somerset Grille",
    city: "Hooksett, NH",
    lat: 43.0665,
    lng: -71.4451,
    cuisine: "american",
    description: "Burgers, hot dogs, tenders, and classic American comfort food.",
    phone: "(603) 340-3006",
  },
  {
    name: "Clyde's Cupcakes",
    city: "Exeter, NH",
    lat: 42.9814,
    lng: -70.9481,
    cuisine: "dessert",
    description: "A mobile bakery serving cupcakes and desserts since 2007, with a fleet of dessert trucks.",
    website: "https://clydescupcakes.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
