import "dotenv/config";
import { db } from "./client.js";
import {
  customerProfiles,
  menuItems,
  reviews,
  scheduleEntries,
  truckPosts,
  truckProfiles,
  users,
  watchLocations,
} from "./schema.js";
import { newId } from "../lib/id.js";
import { supabaseAdmin } from "../lib/supabase.js";

const DEMO_PASSWORD = "password123";

// Creates the Supabase Auth user first (owns credentials + role in
// app_metadata — see routes/auth.ts) and returns its id, which our own
// `users` row below is keyed to.
async function createAuthUser(email: string, role: "truck" | "customer", displayName: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { displayName },
  });
  if (error || !data.user) {
    throw new Error(`Could not create auth user ${email}: ${error?.message}`);
  }
  return data.user.id;
}

// Downtown Austin-ish coordinates, spread out a few blocks apart. Each
// truck also gets a menu, weekly schedule (+ one has a one-off special
// event), a couple of reviews, and an update post — see below — so a fresh
// install has something to actually look at instead of empty sections.
const trucks = [
  {
    name: "Taco Comet",
    cuisine: "mexican" as const,
    lat: 30.2672,
    lng: -97.7431,
    website: "https://tacocomet.com",
    phone: "(512) 555-0100",
    menu: [
      { name: "Al Pastor Taco", price: "$3.50", description: "Pineapple, cilantro, onion", dietaryTags: [] as string[] },
      { name: "Carne Asada Taco", price: "$3.75", description: "Grilled steak, salsa verde", dietaryTags: [] },
      { name: "Veggie Taco", price: "$3.25", description: "Grilled nopales, black beans, queso fresco", dietaryTags: ["vegetarian"] },
      { name: "Elote", price: "$4.00", description: "Grilled corn, crema, cotija, chili powder", dietaryTags: ["vegetarian", "gluten-free"] },
      { name: "Horchata", price: "$3.00", description: "House-made rice milk, cinnamon", dietaryTags: ["vegan", "gluten-free"] },
    ],
    schedule: {
      recurring: [
        { days: [1, 2, 3, 4, 5], startTime: "11:00", endTime: "14:00", locationLabel: "6th & Congress, Downtown", lat: 30.2672, lng: -97.7431 },
        { days: [6], startTime: "12:00", endTime: "16:00", locationLabel: "Zilker Park Farmers Market", lat: 30.2669, lng: -97.7728 },
      ],
      special: [
        { eventDate: "2026-09-27", startTime: "11:00", endTime: "20:00", locationLabel: "Austin Food Truck Festival, Auditorium Shores", lat: 30.2637, lng: -97.7562 },
      ],
    },
    reviews: [
      { reviewer: "demo" as const, rating: 5, comment: "Best tacos in Austin! The al pastor is unreal.", reply: "Thank you so much! See you again soon 🌮" },
      { reviewer: "sam" as const, rating: 4, comment: "Great flavor, but the lunch line gets long fast — go early." },
    ],
    posts: [
      "Selling out fast today! Come get 'em while they're hot 🌮",
      "New menu item: elote is here! Grilled corn perfection.",
    ],
  },
  {
    name: "Smoke Signal BBQ",
    cuisine: "bbq" as const,
    lat: 30.2711,
    lng: -97.7437,
    website: null,
    phone: null,
    menu: [
      { name: "Brisket Plate", price: "$16.00", description: "14-hour smoked brisket, two sides", dietaryTags: [] },
      { name: "Pulled Pork Sandwich", price: "$9.50", description: "Slow-smoked pork, house slaw, brioche bun", dietaryTags: [] },
      { name: "Half Rack Ribs", price: "$14.00", description: "Dry-rubbed St. Louis ribs", dietaryTags: ["gluten-free"] },
      { name: "Mac & Cheese", price: "$4.50", description: "Three-cheese blend, toasted breadcrumbs", dietaryTags: ["vegetarian"] },
      { name: "Cornbread", price: "$3.00", description: "Honey butter cornbread", dietaryTags: ["vegetarian"] },
    ],
    schedule: {
      recurring: [
        { days: [2, 4, 5], startTime: "11:00", endTime: "15:00", locationLabel: "2nd Street District", lat: 30.2648, lng: -97.7472 },
        { days: [0], startTime: "12:00", endTime: "18:00", locationLabel: "South Congress", lat: 30.2492, lng: -97.75 },
      ],
      special: [],
    },
    reviews: [
      { reviewer: "demo" as const, rating: 5, comment: "Fall-off-the-bone ribs. Worth the wait every time." },
      { reviewer: "sam" as const, rating: 3, comment: "Good smoke flavor but a bit pricey for the portion size." },
    ],
    posts: ["Smoking a fresh batch of brisket — ready by 11am, first come first served!"],
  },
  {
    name: "Wok This Way",
    cuisine: "asian" as const,
    lat: 30.265,
    lng: -97.7455,
    website: null,
    phone: null,
    menu: [
      { name: "Pad Thai", price: "$10.00", description: "Rice noodles, egg, peanuts, tamarind sauce", dietaryTags: [] },
      { name: "General Tso's Chicken", price: "$11.00", description: "Crispy chicken, sweet-spicy glaze", dietaryTags: [] },
      { name: "Vegetable Fried Rice", price: "$8.50", description: "Wok-tossed rice, seasonal veggies", dietaryTags: ["vegetarian", "vegan"] },
      { name: "Spring Rolls", price: "$5.00", description: "Crispy vegetable rolls, sweet chili dip", dietaryTags: ["vegetarian"] },
      { name: "Dumplings (6pc)", price: "$7.00", description: "Pan-seared pork dumplings", dietaryTags: [] },
    ],
    schedule: {
      recurring: [
        { days: [3, 5], startTime: "11:30", endTime: "14:00", locationLabel: "The Domain", lat: 30.4022, lng: -97.7255 },
        { days: [6], startTime: "17:00", endTime: "21:00", locationLabel: "Rainey Street", lat: 30.2601, lng: -97.7369 },
      ],
      special: [],
    },
    reviews: [
      { reviewer: "demo" as const, rating: 4, comment: "Solid pad thai, generous portions for the price." },
    ],
    posts: ["Back at The Domain today — come say hi! 🥡"],
  },
];

const truckIds = new Map<string, string>();

for (const truck of trucks) {
  const email = `${truck.name.toLowerCase().replace(/\s+/g, "-")}@example.com`;
  const userId = await createAuthUser(email, "truck", truck.name);
  truckIds.set(truck.name, userId);

  await db.insert(users).values({ id: userId, email, role: "truck", displayName: truck.name });
  await db.insert(truckProfiles).values({
    userId,
    name: truck.name,
    description: `${truck.name} — a great little food truck.`,
    cuisine: truck.cuisine,
    isOpen: true,
    lat: truck.lat,
    lng: truck.lng,
    locationUpdatedAt: new Date(),
    website: truck.website,
    phone: truck.phone,
  });
  console.log(`seeded truck ${truck.name} (${userId})`);
}

const customerEmail = "demo-customer@example.com";
const customerId = await createAuthUser(customerEmail, "customer", "Demo Customer");

await db.insert(users).values({
  id: customerId,
  email: customerEmail,
  role: "customer",
  displayName: "Demo Customer",
});
await db.insert(customerProfiles).values({ userId: customerId });
await db.insert(watchLocations).values([
  {
    id: newId(),
    customerId,
    label: "Home",
    lat: 30.2672,
    lng: -97.7431,
    radiusMiles: 5,
  },
  {
    id: newId(),
    customerId,
    label: "Work",
    lat: 30.2711,
    lng: -97.7437,
    radiusMiles: 2,
    activeDays: "1,2,3,4,5",
    startTime: "09:00",
    endTime: "17:00",
  },
]);
console.log(`seeded customer ${customerEmail} (${customerId})`);

// A second reviewer, purely so seeded reviews aren't all from the same
// account — makes the truck pages look like a real product, not a fixture.
const samEmail = "sam-rivera@example.com";
const samId = await createAuthUser(samEmail, "customer", "Sam Rivera");
await db.insert(users).values({ id: samId, email: samEmail, role: "customer", displayName: "Sam Rivera" });
await db.insert(customerProfiles).values({ userId: samId });
console.log(`seeded customer ${samEmail} (${samId})`);

const reviewerIds = { demo: customerId, sam: samId };

// Menu, schedule, reviews, and updates — added after every account exists,
// since reviews need a customer id. See the `trucks` array above for the
// actual content.
for (const truck of trucks) {
  const truckId = truckIds.get(truck.name)!;

  if (truck.menu.length > 0) {
    await db.insert(menuItems).values(
      truck.menu.map((item) => ({
        id: newId(),
        truckId,
        name: item.name,
        price: item.price,
        description: item.description,
        dietaryTags: item.dietaryTags.join(","),
      })),
    );
  }

  const scheduleRows = [];
  for (const r of truck.schedule.recurring) {
    for (const day of r.days) {
      scheduleRows.push({
        id: newId(),
        truckId,
        dayOfWeek: day,
        startTime: r.startTime,
        endTime: r.endTime,
        locationLabel: r.locationLabel,
        lat: r.lat,
        lng: r.lng,
      });
    }
  }
  for (const s of truck.schedule.special) {
    scheduleRows.push({
      id: newId(),
      truckId,
      dayOfWeek: new Date(`${s.eventDate}T00:00:00Z`).getUTCDay(),
      eventDate: s.eventDate,
      startTime: s.startTime,
      endTime: s.endTime,
      locationLabel: s.locationLabel,
      lat: s.lat,
      lng: s.lng,
    });
  }
  if (scheduleRows.length > 0) await db.insert(scheduleEntries).values(scheduleRows);

  for (const r of truck.reviews) {
    await db.insert(reviews).values({
      id: newId(),
      truckId,
      customerId: reviewerIds[r.reviewer],
      rating: r.rating,
      comment: r.comment,
      ...("reply" in r && r.reply ? { ownerReply: r.reply, ownerRepliedAt: new Date() } : {}),
    });
  }

  if (truck.posts.length > 0) {
    await db.insert(truckPosts).values(truck.posts.map((message) => ({ id: newId(), truckId, message })));
  }

  console.log(
    `  ${truck.name}: ${truck.menu.length} menu items, ${scheduleRows.length} schedule entries, ${truck.reviews.length} reviews, ${truck.posts.length} posts`,
  );
}

// A regular customer account that also gets /admin access (see
// lib/auth.ts#requireAdmin and routes/admin.ts). isAdmin is orthogonal to
// role, so this could just as easily be a truck account — customer was
// picked arbitrarily.
const adminEmail = "admin@example.com";
const adminId = await createAuthUser(adminEmail, "customer", "Admin");
await db.insert(users).values({
  id: adminId,
  email: adminEmail,
  role: "customer",
  displayName: "Admin",
  isAdmin: true,
});
await db.insert(customerProfiles).values({ userId: adminId });
console.log(`seeded admin ${adminEmail} (${adminId})`);

console.log(`all seed accounts use password: ${DEMO_PASSWORD}`);

// postgres-js keeps the connection pool alive for reuse; explicitly exit so
// this one-off script doesn't hang after seeding.
process.exit(0);
