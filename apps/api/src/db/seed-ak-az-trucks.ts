import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Alaska/Arizona food trucks — see
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
    name: "Mochileros Street Food",
    city: "Anchorage, AK",
    lat: 61.2181,
    lng: -149.9003,
    cuisine: "mexican",
    description: "A family-run truck serving Guatemalan-inspired street food with an American fusion twist.",
    phone: "(907) 903-8451",
  },
  {
    name: "Jerome's Kitchen Streatery",
    city: "Anchorage, AK",
    lat: 61.2181,
    lng: -149.9003,
    cuisine: "american",
    description: "Southern soul food from family recipes, plus Cajun and Hawaiian-inspired dishes like gumbo and Huli Huli chicken.",
    website: "https://jkstreatery.com",
    phone: "(907) 313-8328",
  },
  {
    name: "El Green-Go's",
    city: "Anchorage, AK",
    lat: 61.2181,
    lng: -149.9003,
    cuisine: "mexican",
    description: "Tacos and burritos made with local, organic ingredients, including an Alaskan smoked salmon taco.",
    website: "https://elgreengosak.com",
    phone: "(907) 312-3313",
  },
  {
    name: "The Hungry Deckhand",
    city: "Anchorage, AK",
    lat: 61.2181,
    lng: -149.9003,
    cuisine: "seafood",
    description: "An Alaskan seafood truck known for cod fish and chips, king crab rolls, and salmon chowder.",
    website: "https://www.thehungrydeckhand.com",
    phone: "(907) 531-7877",
  },
  {
    name: "Koi Koi",
    city: "Anchorage, AK",
    lat: 61.2181,
    lng: -149.9003,
    cuisine: "asian",
    description: "A sushi truck offering fresh rolls such as the Koi Koi Roll and Rainbow Roll.",
    phone: "(907) 242-5561",
  },
  {
    name: "The Alaska Cheesesteak Company",
    city: "Fairbanks, AK",
    lat: 64.8378,
    lng: -147.7164,
    cuisine: "american",
    description: "A Fairbanks fixture since 2011, known for its Original Pineapple Teriyaki Cheesesteak.",
    phone: "(907) 750-9839",
  },
  {
    name: "Zorba on the Run",
    city: "Fairbanks, AK",
    lat: 64.8378,
    lng: -147.7164,
    cuisine: "other",
    description: "A seasonal truck operating since 1997, serving Greek and Middle Eastern gyros and falafel near the UAF campus.",
  },
  {
    name: "Elote Man AZ",
    city: "Glendale, AZ",
    lat: 33.5387,
    lng: -112.186,
    cuisine: "mexican",
    description: "A family-run truck specializing in Mexican street corn (elote), since 2016.",
    website: "https://elotemanaz.com",
  },
  {
    name: "Gibson's Smokehouse",
    city: "Phoenix, AZ",
    lat: 33.4484,
    lng: -112.074,
    cuisine: "bbq",
    description: "A locally owned smokehouse truck known for pulled pork, brisket, and ribs.",
    phone: "(602) 475-8730",
  },
  {
    name: "Freestyllez",
    city: "Tempe, AZ",
    lat: 33.4255,
    lng: -111.94,
    cuisine: "american",
    description: "A soul food truck known for fried catfish, cornbread, and mac and cheese.",
  },
  {
    name: "Wil's Grill",
    city: "Flagstaff, AZ",
    lat: 35.1983,
    lng: -111.6513,
    cuisine: "bbq",
    description: "A locally sourced BBQ truck known for elk and bison burgers and daily-smoked meats.",
    website: "https://www.flagstafffoodtruck.com",
    phone: "(480) 250-0763",
  },
  {
    name: "Sumaj Bolivian Street Food",
    city: "Tucson, AZ",
    lat: 32.2226,
    lng: -110.9747,
    cuisine: "other",
    description: "A mother-daughter-run truck, Tucson's only Bolivian food, known for scratch-made salteñas.",
  },
  {
    name: "El Sinaloense Hot Dog Cart",
    city: "Tucson, AZ",
    lat: 32.2226,
    lng: -110.9747,
    cuisine: "mexican",
    description: "A longtime midtown Tucson cart known for bacon-wrapped Sonoran hot dogs.",
    phone: "(520) 358-0779",
  },
  {
    name: "Dupe Loops",
    city: "Scottsdale, AZ",
    lat: 33.4942,
    lng: -111.9261,
    cuisine: "dessert",
    description: "A doughnut truck frying gluten-, dairy-, soy-, and nut-free doughnuts in rotating flavors.",
    website: "https://www.dupeloops.com",
  },
  {
    name: "Substance Diner",
    city: "Tucson, AZ",
    lat: 32.2226,
    lng: -110.9747,
    cuisine: "vegan",
    description: "An all-vegan diner-style truck known for a plant-based Sonoran dog and Beyond Meat burgers.",
    website: "https://www.substancediner.com",
  },
  {
    name: "Chickies Coffee",
    city: "Phoenix, AZ",
    lat: 33.4484,
    lng: -112.074,
    cuisine: "coffee",
    description: "A mobile coffee truck serving locally roasted coffee, pastries, and breakfast sandwiches.",
    website: "https://chickiescoffee.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
