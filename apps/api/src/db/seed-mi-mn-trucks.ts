import "dotenv/config";
import { closeDb } from "./client.js";
import { seedUnclaimedTrucks, type UnclaimedTruckSeed } from "./seed-unclaimed-trucks.js";

// Real, currently-operating Michigan/Minnesota food trucks — see
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
    name: "Detroit 75 Kitchen",
    city: "Detroit, MI",
    lat: 42.3314,
    lng: -83.0458,
    cuisine: "american",
    description: "A Southwest Detroit truck serving scratch-made shawarma, burgers, and BBQ-style sandwiches, started by two brothers in 2014.",
    website: "https://detroit75kitchen.com",
    phone: "(313) 843-3215",
  },
  {
    name: "TruckShuka",
    city: "Detroit, MI",
    lat: 42.3314,
    lng: -83.0458,
    cuisine: "other",
    description: "The only Israeli food truck in Michigan, serving 100% vegetarian street food like shakshuka and sabich.",
    website: "https://www.truckshuka.com",
  },
  {
    name: "Shimmy Shack",
    city: "Ferndale, MI",
    lat: 42.4606,
    lng: -83.1344,
    cuisine: "vegan",
    description: "Michigan's only all-vegan, gluten-free food truck, serving retro diner food like coneys and burgers.",
    website: "https://shimmyshack.com",
  },
  {
    name: "Uncle Honeys BBQ",
    city: "Wyandotte, MI",
    lat: 42.2142,
    lng: -83.1499,
    cuisine: "bbq",
    description: "A truck smoking meat low and slow over hickory wood, rebuilt and relaunched in August 2024.",
    website: "https://unclehoneysbbq.com",
    phone: "(734) 752-7672",
  },
  {
    name: "Dune Buggy",
    city: "Grand Rapids, MI",
    lat: 42.9634,
    lng: -85.6681,
    cuisine: "american",
    description: "A beach-themed truck serving smash burgers and dill fries, drawing lines at Riverside Park's Food Truck Fridays.",
  },
  {
    name: "Two Scotts Barbecue",
    city: "Grand Rapids, MI",
    lat: 42.9634,
    lng: -85.6681,
    cuisine: "bbq",
    description: "Slow-smoked brisket, pulled pork, and ribs from a restaurant and its catering food truck.",
    website: "https://www.twoscottsbbq.com",
    phone: "(616) 608-6756",
  },
  {
    name: "Taquero Mucho",
    city: "Lansing, MI",
    lat: 42.7325,
    lng: -84.5555,
    cuisine: "mexican",
    description: "A family-owned truck serving authentic Mexican street food, including birria tacos and gorditas.",
    website: "https://www.taqueromucholansing.com",
    phone: "(517) 303-7882",
  },
  {
    name: "Boxcar Coffee Company",
    city: "Grand Rapids, MI",
    lat: 42.9634,
    lng: -85.6681,
    cuisine: "coffee",
    description: "Grand Rapids' mobile pop-up coffee shop, serving pour-over and cold brew at farmers markets and events.",
    website: "https://boxcarcoffeecompany.com",
  },
  {
    name: "World Street Kitchen Truck",
    city: "Minneapolis, MN",
    lat: 44.9778,
    lng: -93.265,
    cuisine: "asian",
    description: "Started by two brothers in 2012, serving globally inspired street food like the Bangkok burrito.",
    website: "https://eatwsk.com",
    phone: "(612) 424-8855",
  },
  {
    name: "Hola Arepa",
    city: "Minneapolis, MN",
    lat: 44.9778,
    lng: -93.265,
    cuisine: "other",
    description: "Started as a 2011 food truck, still serving Venezuelan-style stuffed arepas made fresh daily.",
    website: "https://www.holaarepa.com",
  },
  {
    name: "Black Market StP",
    city: "St. Paul, MN",
    lat: 44.9537,
    lng: -93.09,
    cuisine: "bbq",
    description: "A West Side truck smoking brisket and ribs with a dry rub, locally regarded as some of Minnesota's best BBQ.",
    website: "https://www.blackmarketstp.com",
  },
  {
    name: "iPierogi",
    city: "Minneapolis, MN",
    lat: 44.9778,
    lng: -93.265,
    cuisine: "other",
    description: "A family-owned truck bringing authentic Polish food to the Twin Cities, including pierogi, sausage, and stuffed cabbage.",
    website: "https://ipierogi.com",
    phone: "(952) 393-7295",
  },
  {
    name: "Rebel Lobster",
    city: "Minneapolis, MN",
    lat: 44.9778,
    lng: -93.265,
    cuisine: "seafood",
    description: "A veteran-owned truck known for Maine-style and Connecticut-style lobster rolls served across the Twin Cities.",
    website: "https://www.rebellobstertruck.com",
    phone: "(612) 886-4264",
  },
  {
    name: "Taco Lab",
    city: "Rochester, MN",
    lat: 44.0121,
    lng: -92.4802,
    cuisine: "mexican",
    description: "A \"lab on wheels\" serving inventive tacos like the Mad Scientist and Kung Fu chicken.",
    website: "https://www.tacolabmn.com",
    phone: "(507) 990-9206",
  },
  {
    name: "UpDawg",
    city: "Duluth, MN",
    lat: 46.7867,
    lng: -92.1005,
    cuisine: "american",
    description: "A Duluth gourmet hot dog truck that treats each dog as a blank canvas for creative toppings.",
    website: "https://updawgduluth.com",
    phone: "(218) 324-2619",
  },
  {
    name: "MN Nice Cream",
    city: "Minneapolis, MN",
    lat: 44.9778,
    lng: -93.265,
    cuisine: "dessert",
    description: "A woman-owned truck serving glitter-topped soft serve with toppings like cookie dough and bourbon caramel.",
    website: "https://www.mnnicecream.com",
  },
];

const { failed } = await seedUnclaimedTrucks(trucks);
await closeDb();
process.exit(failed > 0 ? 1 : 0);
