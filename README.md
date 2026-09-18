# Little Food Truck 🚚

A food-truck discovery app: browse trucks, favorite the ones you like, leave
reviews, and get notified when a favorited truck is open near you. Two
profile types — **customer** and **food truck** — share one account system.

## Stack

- **API** — [Hono](https://hono.dev) + [Hono RPC](https://hono.dev/docs/guides/rpc), Postgres via [Drizzle ORM](https://orm.drizzle.team), [Supabase](https://supabase.com) for the database, auth, and file storage — see "Local Supabase" below.
- **Web** — [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5 runes) as a static SPA, Tailwind CSS v4, [MapLibre GL JS](https://maplibre.org) for the map view, [Phosphor Icons](https://phosphoricons.com) for iconography.
- **Mobile** — [Tauri v2](https://v2.tauri.app) + the same SvelteKit SPA shell, for iOS/Android/desktop.
- **Shared** — `@little-food-truck/shared` holds Zod schemas, inferred types, and geo helpers used by the API and both clients. The Hono RPC client gets its types straight from the API's route tree (`AppType`) — no hand-written SDK.

## Project layout

```
apps/
  api/      Hono API + Postgres (Drizzle) + Supabase Auth/Storage
  web/      SvelteKit web app — public marketing homepage (SSR/prerendered)
            at "/", the actual app (SPA, ssr:false) grouped under (app)/
  mobile/   Tauri v2 shell wrapping the same kind of SvelteKit SPA
packages/
  shared/   Zod schemas, shared types, geo distance helper
supabase/
  config.toml   Local Supabase stack config (ports, auth settings) — see below
```

The web app's routing is split in two:

- **`apps/web/src/routes/+page.svelte`** — the public marketing homepage at
  `/`. It's the one page in the project with real SSR + prerendering turned
  on (`export const prerender = true` in its `+page.ts`), so it's actually
  crawlable — the rest of the app is a client-only SPA and would render blank
  to a crawler. See `apps/web/vite.config.ts` for the `ssr.noExternal` note
  this required (phosphor-svelte ships `.svelte` files, not precompiled JS,
  so it needs to be forced into the SSR bundle) and the adapter's fallback
  filename fix (the SPA fallback and the prerendered `index.html` collide
  unless the fallback is renamed — `200.html` here).
- **`apps/web/src/routes/(app)/`** — the actual product (browse, map,
  favorites, dashboard, account, etc.), a route group so none of this shows
  up in the URL. Its own `+layout.ts` sets `ssr:false` / `prerender:false`,
  same as it's always been — this part is a fully client-rendered SPA that
  also gets embedded as-is in Tauri for mobile.

## Getting started

Requires Node 24+ (see the note on `@supabase/supabase-js` needing native WebSocket in "Production readiness" below), pnpm, [Docker](https://docs.docker.com/get-docker/), and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`brew install supabase/tap/supabase`, or see their docs for other platforms).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

`apps/api/.env.example` already has working values for the **local** Supabase
stack (see below) — no editing needed to get running locally. Those values
are the Supabase CLI's fixed local-dev demo keys, not real secrets.

Start the local Supabase stack (Postgres + Auth + Storage, via Docker — see
"Local Supabase" below for what this actually spins up):

```bash
supabase start
```

Push the schema and seed a few demo trucks + a demo customer (this also
creates their Supabase Auth accounts, not just DB rows):

```bash
pnpm db:push
pnpm db:seed
```

Run the API and web app (in separate terminals):

```bash
pnpm dev:api    # http://localhost:8787
pnpm dev:web    # http://localhost:5173
```

Run the mobile app as a desktop window during development (fastest way to
iterate — same SPA, same API):

```bash
pnpm dev:mobile
```

## Local Supabase

`supabase start` spins up the whole backend Supabase provides — Postgres,
Auth (GoTrue), Storage, and a Studio UI — as Docker containers, using fixed
keys/ports that are the same for every local Supabase project unless you
change them (this repo remaps the default `54321-54327` port block to
`54421-54427` in `supabase/config.toml`, so it doesn't collide with any
other local Supabase project you might have running — adjust further if you
still hit a conflict). Useful bits once it's running:

- **Studio** (`http://127.0.0.1:54423`) — a full admin UI: browse/edit every
  table, inspect the `auth.users` table Supabase manages itself, and poke
  around the `uploads` Storage bucket.
- **Inbucket** (`http://127.0.0.1:54424`) — catches any email Supabase's own
  Auth flows would send (e.g. its native recovery-email path). This project
  doesn't use that path (see the Password reset note below), so it'll
  normally be empty — password-reset email goes through MailDev instead,
  see below.
- `supabase stop` tears the stack down; `supabase status` reprints the
  connection info/keys if you need them again.

### Local email testing

`pnpm dev:mail` starts [MailDev](https://github.com/maildev/maildev) — a
local SMTP server plus a web UI at `http://localhost:1080` for reading
whatever mail the app sends. Outside production, `apps/api/src/lib/email.ts`
always sends through it (`SMTP_HOST`/`SMTP_PORT` in `.env`, defaulting to
MailDev's own defaults), so password-reset email works with real send/deliver
behavior locally, no `RESEND_API_KEY` needed. If MailDev isn't running, a send
attempt fails fast and `/forgot-password` falls back to returning the reset
link directly in the response — see the Password reset note below.

None of this touches a real Supabase project — everything here is local
Docker containers. Moving to a real deployment means creating a project at
[supabase.com](https://supabase.com), pointing `DATABASE_URL` /
`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` /
`SUPABASE_JWT_SECRET` in `apps/api/.env` at that project's real values
(Settings → API and Settings → Database in the dashboard), and running
`pnpm db:push` against it once.

### Demo accounts

Every seeded account uses the same password: **`password123`**.

| Email | Role | Notes |
|---|---|---|
| `demo-customer@example.com` | customer | Two watch locations already set (Home — Austin, 5 mi, always active; Work — 2 mi, weekdays 9am–5pm only). |
| `sam-rivera@example.com` | customer | A second reviewer, so seeded reviews aren't all from the same account. |
| `taco-comet@example.com` | truck (Taco Comet) | Full menu (5 items), weekly schedule + a one-off festival event, 2 reviews (one with an owner reply), 2 updates, a website/phone. |
| `smoke-signal-bbq@example.com` | truck (Smoke Signal BBQ) | Full menu (5 items), weekly schedule, 2 reviews, 1 update. |
| `wok-this-way@example.com` | truck (Wok This Way) | Full menu (5 items), weekly schedule, 1 review, 1 update. |
| `admin@example.com` | customer, `isAdmin: true` | Gets an "Admin" link in the account dropdown → `/admin` — see "Admin dashboard" below. |

These come from `apps/api/src/db/seed.ts`, which creates both the Supabase
Auth account and the matching profile row for each — rerunning `pnpm db:seed`
against a database that already has them will fail on the duplicate email,
since it isn't written to be idempotent. To add more customers or trucks,
just use the app's own sign-up form. To start completely over, wipe the
local stack's data with `supabase stop --no-backup` (this drops the local
Postgres volume entirely, including `auth.users` — not just our own tables),
then `supabase start`, `pnpm db:push`, and `pnpm db:seed` again.

## End-to-end tests

`e2e/` has [Playwright](https://playwright.dev) smoke tests covering the five
most important flows for each account type, run against the real web app +
API + local Supabase (no mocking):

- **`e2e/customer.spec.ts`** — sign up, find a truck via search, favorite it,
  leave a review, add a watch location.
- **`e2e/truck.spec.ts`** — sign up, update the truck profile, go open with a
  real (mocked-geolocation) location, add a menu item, post an update.

Each spec runs as one serial flow with a shared page, mirroring how someone
actually uses the app in one sitting, and creates its own throwaway accounts
(unique email per run) so it never collides with seed data or a previous
run. The customer spec seeds its own fixture truck directly via the API
(not the UI) so it doesn't depend on `truck.spec.ts` having run first or on
`pnpm db:seed` having been run.

```bash
supabase start   # if not already running
pnpm dev:api     # if not already running
pnpm dev:web     # if not already running
pnpm test:e2e            # headless
pnpm test:e2e:ui         # interactive UI mode, good for writing/debugging
```

`playwright.config.ts` reuses already-running API/web dev servers if it
finds them (`reuseExistingServer: true`), or starts them itself otherwise —
either way, Supabase itself has to already be up, since it's a stateful
Docker stack this doesn't try to manage.

## How the pieces fit together

- **Auth** — [Supabase Auth](https://supabase.com/docs/guides/auth) owns credentials and sessions; our own `users` table just extends it with app-specific fields (role, displayName, avatarUrl), keyed to Supabase's `auth.users.id`. Sign-up (`apps/api/src/routes/auth.ts`) calls `supabaseAdmin.auth.admin.createUser()` with our role in `app_metadata` (readable straight off the access token, no DB round trip needed to check it), then creates the matching profile row (`truck_profiles` / `customer_profiles`). The session cookie carries Supabase's access token; `apps/api/src/lib/auth.ts#withAuth` verifies it (HS256, `SUPABASE_JWT_SECRET`) and, if it's expired, transparently refreshes it via a second httpOnly cookie holding the refresh token — Supabase's access tokens are short-lived (1 hour locally) by design, so this refresh path is what keeps someone signed in beyond that without them noticing.
- **Trucks** — a truck's `id` is its user id (one truck account = one truck). Truck owners update their own location/open state from the dashboard, which reads the browser's (or device's) geolocation. The dashboard also links out to the truck's own public page (`/trucks/[id]`) — easy to miss since `/dashboard` ("My Truck" in the nav) is the *editing* view, not what a customer sees.
- **Opening without GPS** — the dashboard's open/close button reads live geolocation when it can, but doesn't require it: if there's no location service available (checked via the Permissions API on mount, so the button honestly says "Open for business" instead of "I'm here — open for business" when it can't get a live fix) or a live request fails anyway, `POST /api/me/location` is called with `isOpen: true` and no coordinates, and `apps/api/src/lib/schedule-location.ts#resolveTodayLocation` picks a position server-side instead: a one-off event scheduled for today with its own location, else today's recurring weekly stop if it has one, else the truck's default location (see below), else the request fails with a message telling the owner to set one of those up. "Mark closed" never touches geolocation at all — just flips `isOpen`.
- **Favorites & reviews** — customer-only actions scoped to a truck id.
- **"Truck near you" notifications** — when a truck posts a location update while open, `apps/api/src/lib/notify.ts` checks every customer who favorited it against *all* of their saved watch locations (see below), and inserts a notification row the moment the truck is within radius of any one of them (with a 2-hour cooldown per truck/customer pair so a truck driving around doesn't spam). Both clients poll `GET /api/me/notifications` every 30s, and on web the same event also fires a **real Web Push notification** (see below) so it lands even if the tab isn't open.
- **Multiple watch locations, each with its own radius and active window** — `/account` lets a customer save several named locations (Home, Work, ...), up to `MAX_WATCH_LOCATIONS` (3), each with its own radius in miles. A location can also be limited to specific days and a time-of-day window (e.g. "Work, weekdays, 9am–5pm") so a favorited truck near the office at midnight doesn't page anyone — leave both unset and it's always active. Backed by the `watch_locations` table (`apps/api/src/db/schema.ts`) and `POST`/`GET`/`DELETE /api/me/watch-locations`; replaces the old single home-location + one watch-radius fields that used to live on `customer_profiles`. The active-window check is resolved in the customer's own timezone (`customer_profiles.timezone`, editable from `/account`, same mechanism as the truck-side timezone below) via the shared `zonedNow()`/`isWithinTimeWindow()` helpers in `apps/api/src/lib/time.ts` — not the server's local time.
- **Map, folded into Browse** — `/map` used to be its own page; it's now a collapsible section at the top of `/browse`'s Browse tab (web) / the Browse tab of mobile's home page, above the filters — `lib/components/TruckMap.svelte` plots every truck the *current filters* returned (search/cuisine/open-now/dietary/sort all apply to the map too, since it's fed the same `trucks` array as the list below it), plus a blue dot for your own location via a "Center on me" button (or automatically once you use "Near me"/"Sort: nearest"). The collapse state persists per-browser via `localStorage` (`lft:browse-map-collapsed`) — a per-viewer convenience, not synced anywhere. `/map` itself now just redirects to `/browse` for old links. Tiles come from OpenStreetMap's public raster tile server via a plain MapLibre raster style — no API key needed, but that server isn't meant for production traffic; swap the `OSM_STYLE` source for a vector style from MapTiler, Stadia Maps, etc. (with your own key) before shipping. `TruckMap` takes an optional `height` prop (defaults to a taller `70vh`/`65vh` for its plain-map days, now usually passed a smaller value — `40vh` in Browse, `50vh` in the truck-detail modal below) so the same component works everywhere it's used.
- **Truck location, on demand** — a truck's page shows its lat/lng as a small button (not just text); clicking it opens a modal with `TruckMap` zoomed to that one truck, including the same open/closed marker styling as `/map`, so a customer can see at a glance both where the truck is and whether it's worth going.
- **Accounts** — `/account` (both apps) holds the profile photo, display name, and email common to both roles, plus the customer's watch locations (see below) that used to live at `/settings`. It's reached from the avatar menu in the header, which is also where sign-out lives now — there's no standalone sign-out button in the nav anymore.
- **Truck content: photos, menu, schedule, updates** — a truck's dashboard (`/dashboard`) has sections to upload a photo gallery, add menu items (name/price/description/photo/dietary tags), set a schedule, and post short text+photo updates. All of it is public on the truck's own page (`/trucks/[id]`). Photos go through `apps/api/src/lib/uploads.ts`, which validates type/size and uploads to the `uploads` [Supabase Storage](https://supabase.com/docs/guides/storage) bucket (public, created automatically at server startup — see `ensureUploadsBucket()` in `index.ts`), returning the object's public URL directly.
- **Menu item dietary tags** — vegan/vegetarian/gluten-free/dairy-free/nut-free/spicy, picked from checkboxes on the dashboard's menu form. They travel over the multipart form as a comma-joined string (`dietaryTags` field) since multipart can't carry real arrays — `menuItemInputSchema` in `packages/shared/src/schemas.ts` splits/validates it back into an array on the way in, `parseDietaryTags()` in `apps/api/src/lib/trucks.ts` does the same when reading. Shown as chips on both the dashboard and the public menu tab.
- **Menu search** — the public Menu tab has a search box that filters by name or description, client-side against the already-loaded `truck.menu` array (no extra request) — see the `filteredMenu` derived value in the truck detail page.
- **Schedule: recurring stops vs. one-off events** — the dashboard's Schedule section has a toggle between a weekly recurring stop (day of week) and a one-off special event (specific date, e.g. a festival). Both live in the same `schedule_entries` table; a one-off event still gets a `dayOfWeek` written (derived from its date) so the column stays `NOT NULL`, but `eventDate` being set is what marks it special. The public and dashboard schedule views group them into separate "Upcoming special events" / "Weekly schedule" lists.
- **Schedule locations + a default location, for opening without GPS** — each schedule entry can optionally get its own lat/lng, set by dragging a map in `apps/web/src/lib/components/LocationPickerModal.svelte` (a plain MapLibre + `<canvas>`-free drag-to-center picker, mirrored in mobile — no geocoding/search box, just pan-and-confirm, with a "use my current location" shortcut to jump the map there). A truck can also set one fallback **default location** (same picker) independent of any specific day. Both feed `resolveTodayLocation()` above — a schedule entry's or the default's lat/lng can be cleared independently of deleting the entry (the × next to the pin icon) via `DELETE /api/me/schedule/:id/location` and `DELETE /api/me/truck-profile/default-location`. The idea: a truck never has to broadcast a live, exact position — just being "open" is enough to announce wherever today's schedule (or the fallback) says they usually are.
- **Timezone-aware schedules and watch windows** — `truck_profiles.timezone` (an IANA zone, e.g. `America/Chicago`; editable from the dashboard's Profile form, defaults to `America/Chicago`) is what a truck's own schedule day-of-week/time-of-day is interpreted in, and `customer_profiles.timezone` (editable from `/account`, same default) does the same job for a customer's watch-location active windows above. Both go through the same shared `zonedNow()` helper (`apps/api/src/lib/time.ts`, using `Intl.DateTimeFormat`) rather than the server's own local time: `resolveTodayLocation()` (`apps/api/src/lib/schedule-location.ts`) uses it to resolve "today"/"now" for a truck's schedule, and `notifyNearbyFavorites()` (`apps/api/src/lib/notify.ts`) uses it per-customer (joining `customer_profiles.timezone` into the favoriters query) so two customers in different zones get correctly different answers for the same watch location. Schedule and public-page times are also displayed in 12-hour form (`apps/{web,mobile}/src/lib/time.ts#formatTime12h`) — the stored `HH:MM` strings themselves stay 24-hour, that's just a display conversion.
- **Website & phone** — optional contact fields on the dashboard's Profile form, shown on the truck's public page as a clickable link (`https://` prefixed automatically if you type a bare domain like `tacocomet.com`) and a `tel:` link. Normalized server-side in the `PATCH /me/truck-profile` handler (`apps/api/src/routes/me.ts`) — an empty string clears the field to `null` rather than saving a blank string. No phone-format validation (real-world formats vary too much to enforce usefully); the `tel:` link is built from whatever was typed.
- **Wait time** — a truck can set a rough queue estimate (minutes) from the dashboard Status section; shown on truck cards, the map, and the truck's own page whenever they're open and a wait is set. Cleared by leaving the field blank.
- **Review replies** — a truck owner can reply once to each review from the dashboard's Reviews section (`PATCH /api/me/reviews/:id/reply`, `DELETE .../reply` to take it back), and can flag a review for admin attention (`POST`/`DELETE /api/me/reviews/:id/flag`) — e.g. a fake or abusive review. The reply shows inline under the review on the truck's public page. No threading — one reply per review, matching the common "business responds to review" pattern. Flagging is server-side scoped to the truck's own reviews (`requireRole("truck")` + a `WHERE truckId = <the caller>` on every one of these routes — see `routes/me.ts`), and `reviews.flaggedAt` is only ever included in the API response when the caller *is* that truck (`routes/trucks.ts`'s `GET /:id/reviews`); a customer viewing the same public listing never sees it. A flagged review shows up first in `/admin`'s Reviews tab, where an admin can ignore the flag (dismiss, keep the review) or delete the review outright — a real, irreversible `DELETE`, unlike Hide/Unhide which is soft and reversible.
- **Catering / private booking requests** — anyone viewing a truck's page (signed in or not) can send a catering request (name, email, event date, guest count, details) via `POST /api/trucks/:id/catering-request`. The truck manages incoming requests (accept/decline) from a new Catering section on the dashboard. There's no email notification when one comes in — the truck has to check the dashboard.
- **Browse: sort & filter** — `/browse` (and mobile's home tab) adds a sort dropdown (top rated / nearest / newest) and an "Open now" filter alongside the existing cuisine/search/near-me controls. Sorting by distance reuses the same geolocation prompt as "Near me"; the API attaches a `distanceMiles` field to each truck when a location is given, which sort and the truck cards both use.
- **Trending & New this week** — the default (unfiltered) `/browse` view shows two horizontal-scroll strips above the main list: "New this week" (trucks created in the last 7 days) and "Trending now" (highest `view_count`, only shown once at least one truck has a view). Both reuse `sort=trending`/`sort=newest` plus a new `limit` param on `GET /api/trucks`. They hide themselves the moment you search, filter, or change sort, so they don't clutter an intentional query.
- **Shareable truck links with real Open Graph previews** — the "Share" button on `/trucks/[id]` (both apps) copies a `GET /t/:id` link served directly by the **API**, not the web app — see `apps/api/src/routes/share.ts`. The web app is a static SPA build with no runtime server, so it can't render a per-truck page on demand (that's what the earlier prerendered attempt at this route ran into); the API, being an always-on Hono server, can — and does, straight from the database, with no rebuild ever required. The response is a small HTML page with real `<title>`/Open Graph/Twitter Card tags plus a meta-refresh + JS redirect into the actual app (`WEB_ORIGIN/trucks/:id`); a social scraper never runs the JS, so it only ever sees the static tags. Reuses the API's existing `WEB_ORIGIN` env var (already there for CORS) as the redirect target and to build an absolute URL for the fallback logo image, since scrapers won't resolve a relative one. If the clipboard write fails (blocked permissions, non-HTTPS, some embedded webviews), the button falls back to a selectable inline text field rather than `window.prompt`, which isn't available in every context either.
- **Making the share link same-origin in production** — right now `/t/:id` lives on the API's own origin (e.g. `api.yourdomain.com`), which works but looks less trustworthy pasted into a chat than the app's own domain. To make it `yourdomain.com/t/:id` instead, put a path-based rewrite in front of the web app's host that forwards just `/t/*` (and probably `/uploads/*`, for the same reason) to the API — e.g. a Netlify `_redirects` line (`/t/*  https://api.yourdomain.com/t/:splat  200`), a Vercel rewrite, or an nginx `location /t/ { proxy_pass ...; }` block. Not set up here since nothing in this project is deployed yet (see Deployment below) — this is the pattern to reach for once it is.
- **Combined feed** — `/feed` (both apps) is a single reverse-chronological list of update posts from every truck a customer has favorited, via `GET /api/me/feed`. Gives customers a reason to open the app without picking a specific truck first.
- **Profile view count** — each truck's public page view increments a `view_count` counter (`apps/api/src/lib/trucks.ts#incrementTruckView`), shown back to the truck owner on the dashboard as a rough "how many people are looking at my page" signal. It's a raw hit counter, not deduplicated by visitor — good enough for a sense of trend, not analytics-grade.
- **Web Push notifications** — customers can turn these on from `/account`. `apps/api/src/lib/push.ts` wraps the `web-push` package around a VAPID keypair (yours are already in `apps/api/.env` — generate your own with `npx web-push generate-vapid-keys`), `apps/web/static/sw.js` is the service worker that turns a push event into an actual OS notification, and `apps/web/src/lib/push.ts` handles the browser-side subscribe/unsubscribe flow. Stale subscriptions (uninstalled browser, expired token) get pruned automatically the next time a send to them 404s/410s. This is web-only — a real mobile push story needs APNs/FCM, which need Apple/Google developer accounts to set up (see Known gaps).
- **Password reset** — `/forgot-password` → `/reset-password?token=...`, backed by `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`. This uses its own short-lived token table (`password_reset_tokens`) rather than Supabase's native recovery-email flow, specifically so these two pages keep working exactly as they did before Auth moved to Supabase — the actual password mutation goes through `supabaseAdmin.auth.admin.updateUserById()`, since Supabase now owns credential storage, but the request/token/UI flow around it is still ours. Email goes through `apps/api/src/lib/email.ts` (nodemailer): outside production it always sends via local MailDev (see "Local email testing" above, no key needed); in production it sends via [Resend](https://resend.com)'s SMTP relay if `RESEND_API_KEY` is set, otherwise the request safely no-ops rather than leaking a reset token (see the comment in `apps/api/src/routes/auth.ts`). If a send attempt fails for any reason outside production (e.g. MailDev isn't running), the response falls back to returning the reset link directly instead of blocking the flow.
- **Legal pages** — `/terms` and `/privacy` are real content, not lorem ipsum, but they're placeholder boilerplate written to show the shape a real policy takes (see Known gaps) — not a substitute for one reviewed against your actual data practices and local law.
- **Photo cropping** — the avatar upload (both roles, `/account`) and the truck cover photo upload (`/dashboard`) go through `apps/web/src/lib/components/ImageCropModal.svelte` (mirrored in mobile), a drag-to-reposition + zoom-slider cropper built on a plain `<canvas>` — no cropping library. Avatars crop to a 480×480 square (displayed as a circle via CSS); the truck cover crops to a 1200×400 (3:1) banner, shown on `TruckCard`, the browse list, and the top of the truck's own page.
- **Admin dashboard** — `/admin` (web only; there's no admin surface in the mobile app) gates on `users.isAdmin`, a boolean orthogonal to the truck/customer `role` column — there's no self-serve way to become one, it's set directly in the database (`db/seed.ts` seeds one demo admin — see the Demo accounts table). `apps/api/src/routes/admin.ts` is the API side (`requireAdmin` middleware, `lib/auth.ts`); the page itself has a Trucks tab (verify/unverify — sets `truck_profiles.verified`, shown as a blue check badge next to the truck's name everywhere it's displayed) and a Reviews tab (hide/unhide — sets `reviews.hidden_at`, a soft moderation flag: a hidden review is excluded from the truck's public review list and from its `averageRating`/`reviewCount`, but stays in the database rather than being deleted). Enforced server-side (`requireAdmin` on every `/api/admin/*` route, independent of the client); the page itself also redirects a non-admin away client-side, but that's a UX nicety, not the actual gate.

## Mobile: native builds

`pnpm dev:mobile` runs the Tauri **desktop** dev build, which is enough for
day-to-day UI work. To target an actual phone:

```bash
cd apps/mobile
pnpm tauri android init   # first time only
pnpm tauri ios init       # first time only
pnpm tauri android dev
pnpm tauri ios dev
```

Geolocation on device goes through `@tauri-apps/plugin-geolocation`
(`apps/mobile/src/lib/geo.ts`), which needs location permission entries in
the generated `src-tauri/gen/apple` / `src-tauri/gen/android` projects —
`tauri android/ios init` scaffolds those; you'll still need to add the
usual `NSLocationWhenInUseUsageDescription` (iOS) and
`ACCESS_FINE_LOCATION` (Android) permission entries before shipping.

The Android emulator can't reach `localhost` for the API — use
`http://10.0.2.2:8787` in `apps/mobile/.env` instead (see the comment
there).

## Production readiness

What the API actually has in place for running as a real service, beyond
just working locally:

- **Fail-fast, validated config** — `apps/api/src/lib/env.ts` validates every
  env var the API reads (Zod) once at startup, instead of each module
  reading `process.env` with its own silent fallback. `WEB_ORIGIN` in
  particular has **no default** — an unset one would previously
  misconfigure CORS and the password-reset/share-link redirect target
  without any obvious error; now the process refuses to start and tells you
  exactly which var is missing.
- **No secret leakage in production** — `POST /api/auth/forgot-password`
  used to return and log the reset link unconditionally, which in
  production would've meant anyone could get a working password-reset
  token for any registered email straight out of the API response — a real
  account-takeover path. It's now gated on `NODE_ENV`: still returns the
  link in dev (so the flow works end-to-end without an email service), logs
  only a warning (no token) and returns a generic `{ok: true}` in
  production. This is a stopgap, not a fix — production still can't
  actually complete a password reset until a real mailer is wired up (see
  Known gaps).
- **Rate limiting on auth endpoints** — `apps/api/src/lib/rate-limit.ts`,
  applied to sign-in, sign-up, and forgot-password. A minimal in-memory
  fixed-window limiter, which is enough for a single instance but won't
  coordinate across replicas behind a load balancer — swap it for a
  Redis-backed one before running more than one instance.
- **Security headers** (`hono/secure-headers`) and a **body size cap**
  (`hono/body-limit`, 6MB) on every request — the latter is defense in
  depth alongside the 5MB check in `lib/uploads.ts`, which only runs after
  reading a whole upload into memory; this rejects an oversized request
  before that happens.
- **A health check that means something** — `GET /health` runs a real query
  against Postgres and returns 503 if it fails, instead of always returning
  200 regardless of whether the database is reachable. Point your
  orchestrator's liveness/readiness probe at it.
- **Graceful shutdown** — `SIGTERM`/`SIGINT` let in-flight requests finish
  and close the Postgres connection pool before the process exits, instead
  of connections getting cut mid-query on every deploy. Verified with
  `docker stop` (see below) — shuts down cleanly in well under a second.
- **A real, tested Dockerfile** (`apps/api/Dockerfile`) — multi-stage,
  builds the web app (`apps/web`, `adapter-static`) and the API in the same
  build stage, and the runtime image is just the pruned API +
  `@little-food-truck/shared` workspace dependency (via `pnpm deploy`) plus
  the web build's static output — not the whole monorepo's node_modules or
  devDependencies. One image, one Cloud Run service, no separate web
  container; see "Deploying to Google Cloud Run" below for why and how the
  API ends up serving the web build itself. Runs as a non-root user, has a
  `HEALTHCHECK` wired to `/health`. This was actually built and run against
  the local Supabase stack while putting this together, not just written and
  assumed to work — which is how the real bugs listed in that section got
  caught before they'd have hit a real deploy, including two from back when
  this was still API-only:
  - **Needs Node 24, not 20.** `@supabase/supabase-js` eagerly initializes a
    Realtime client even though this app only uses `.auth`/`.storage`, and
    that client requires a native `WebSocket` implementation — only present
    from Node 22 onward. The image (and this repo's `engines` field) is
    pinned to Node 24 to match what this was developed against; don't drop
    below 22 without re-testing.
  - **The container's `CMD` runs `node --import tsx src/index.ts` directly,
    not `pnpm start`.** Invoking pnpm/corepack at container runtime, as the
    non-root user, tried to re-resolve the package manager and hit a
    permission error with no write access — running the underlying command
    directly sidesteps that (and is generally the safer pattern for a
    container's entrypoint regardless).
  - Build it from the repo root: `docker build -f apps/api/Dockerfile -t
    little-food-truck .`

  Not yet done: a CI pipeline that builds and runs this image automatically
  — right now "tested" means "run by hand once," which is better than
  untested but isn't the same as covered by a pipeline that runs on every
  change.

## Deploying to Google Cloud Run

The repo is container-ready for Cloud Run's **"Continuously deploy from a
repository"** flow — connect a GitHub/GitLab/Bitbucket repo once in the Cloud
Run console and every push to the branch you pick triggers a new build +
revision automatically (Cloud Run manages the underlying Cloud Build trigger
and Artifact Registry repo for you — no `cloudbuild.yaml` needed for the
simple case). This repo doesn't commit any GCP project ID, trigger, or
credentials — that's the "I'll set that up later" part; what's here is just
what the *repo* needs to be deployable once you do.

**One Cloud Run service, one Dockerfile, one repo:** `apps/api/Dockerfile`
builds both the API and the web app (`apps/web`'s `adapter-static` output)
and the API serves the web build itself — see the `isProduction` block near
the bottom of `apps/api/src/index.ts`, which mounts
`@hono/node-server/serve-static` (with the same "exact file, else
`{path}/index.html`, else the SPA fallback" logic a static-file server like
Caddy or nginx would do) after every real API route, so those always win and
only genuinely unmatched paths fall through to it. `apps/mobile` is
unaffected by any of this — it's a separate Tauri build, not deployed to
Cloud Run at all, and keeps pointing its own `VITE_API_URL` at this
service's public URL directly (see its own build docs).

| Dockerfile | Build context | Listens on |
|---|---|---|
| `apps/api/Dockerfile` | repo root (`.`) | `$PORT` (reads it via `apps/api/src/lib/env.ts`) |

When connecting the service in the Cloud Run console, the "build
configuration" step asks for the Dockerfile path and build context/source
location — use `apps/api/Dockerfile` and repo root (`.`) for those, not the
`apps/api` subdirectory as the source location. The Dockerfile is written to
expect that (same as the existing local `docker build` command documented
above), because the pnpm workspace's lockfile and `packages/shared`
dependency live outside `apps/api`'s own folder, and the web build needs the
whole `apps/web` tree too.

Being one service now also means the session cookie's `SameSite=Lax`
requirement (see the comment in `apps/api/src/lib/auth.ts`) is a non-issue —
there's no second origin for it to fail to cross. That used to need a
custom-domain workaround when the API and web app were two separate
`*.run.app` services; not anymore.

This merged Dockerfile was actually built and run (not just written) while
putting it together, same discipline as the rest of this section — `docker
build`, then `docker run` against the local Supabase stack (via
`host.docker.internal`), then `curl` against the real container: `/` came
back as the real 22,988-byte prerendered marketing page (not the SPA
shell), `/browse` and `/trucks/abc123` both correctly fell back to the
1,163-byte SPA shell, `/api/trucks` returned real data through the same
port, `/t/:id` (the share-link route, also mounted at `/`) still rendered
its Open Graph preview instead of being swallowed by the static-file
fallback, and a hashed `/_app/immutable/*` asset came back with the
`Cache-Control: public, max-age=31536000, immutable` header intact. The one
genuine bug this same testing already caught, before the API ever served
its own web build: **the marketing homepage prerenders at *build* time by
making a real fetch to `VITE_API_URL`** (checking auth session — see
`ensureSessionLoaded()` in `apps/web/src/lib/auth.svelte.ts`), since `/`
opts into real SSR/prerender (see `apps/web/src/routes/+page.ts`). That
fetch had no `.catch`, so an unreachable API at build time crashed the whole
build with an unhandled rejection instead of just rendering the signed-out
version — which is what should happen either way, since prerendering never
has a real user's session. Fixed by catching the failure and falling back
to `session = null` (same fix applied to `apps/mobile`'s copy of this
function, since it's the same pattern even though mobile has no
prerendering to crash). This still matters here: `VITE_API_URL` now
defaults to `""` (same origin — nothing to prepend, since the API serves
this app itself) rather than a real absolute URL, so that build-time fetch
is *always* an unreachable relative path during the Docker build — the
catch is what keeps that from crashing every build, not just a
misconfigured one.

### Order of operations (first deploy)

1. **Create a real Supabase project** at [supabase.com](https://supabase.com)
   (Database + Auth + Storage) — Cloud Run has no database of its own, and
   this app is built directly on Supabase Auth/Storage, not just Postgres.
   Run `pnpm db:push` against it once (point `DATABASE_URL` in a local
   `.env` at the cloud project temporarily to do this), then check Auth's
   Site URL / redirect allow-list and JWT expiry in that project's dashboard
   — the values in `supabase/config.toml` are local-dev-only fakes.
2. **Deploy the service**, with `WEB_ORIGIN` set to a placeholder (you don't
   have its real URL yet on the first deploy) and the real Supabase/Resend
   values (see the env var table below).
3. **Redeploy** with `WEB_ORIGIN` updated to the URL Cloud Run actually
   assigned (or a custom domain you've mapped to it). Cloud Run makes this a
   one-click "deploy new revision," not a rebuild from scratch, since it's
   just an env var change. `WEB_ORIGIN` still matters even same-origin — it
   feeds the `/t/:id` share-link route's Open Graph `appUrl`/`imageUrl`
   (`apps/api/src/routes/share.ts`) and the CORS allow-list for Tauri's
   mobile/desktop origins (`apps/api/src/index.ts`).

`VITE_API_URL`, the one Docker build arg from before, is no longer something
you need to set for this — it defaults to `""` (same origin) in
`apps/api/Dockerfile`, which is correct for this single-service setup as-is.
Only pass `--build-arg VITE_API_URL=https://...` if the web build ever needs
to be deployed somewhere other than this same API.

### Environment variables

Set these as the service's env vars in Cloud Run — put anything
secret-shaped (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
`DATABASE_URL`, `RESEND_API_KEY`, `VAPID_PRIVATE_KEY`) in **Secret Manager**
and reference it from the service config rather than typing it in as a
plain env var, which is visible in the Cloud Run console/`gcloud` output to
anyone with viewer access on the project:

| Var | Where it comes from |
|---|---|
| `WEB_ORIGIN` | this service's own real URL (custom domain, or the `*.run.app` URL Cloud Run assigns it) |
| `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | your cloud Supabase project's Settings → API / Database |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | resend.com, for real password-reset email in production — see "Local email testing" above for what happens if this is unset |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys` — don't reuse the local dev keypair already in `apps/api/.env.example` |

### Other Cloud Run–specific notes

- **Min instances.** Cloud Run scales to zero by default, which means a
  cold start (container boot + this app's Postgres connection) on the
  first request after idle. Set min instances to 1 on the API service if
  that's not acceptable — it costs more (always-on), which is why it's not
  the default here.
- **Concurrency & the in-memory rate limiter.** `apps/api/src/lib/rate-limit.ts`
  is single-instance-only (see "Production readiness" above) — this was
  already true before Cloud Run, but Cloud Run autoscaling makes it easy to
  end up with several API instances, each with its own independent
  rate-limit counters. Swap it for a Redis-backed limiter (e.g. Memorystore)
  before relying on it under real traffic with more than one instance.
- **Uploads already bypass the container filesystem.** Cloud Run containers
  are stateless/ephemeral by design; this app already writes uploads to
  Supabase Storage rather than local disk (see `apps/api/src/lib/uploads.ts`),
  so there's nothing extra to do here — this would be a hard blocker if it
  still saved to `apps/api/data/uploads/` like early in this project's
  history.

## Known gaps / next steps

This is a working scaffold, not a finished product. What's still missing
before this could hold up as a real, publicly-launched app — roughly in the
order it'd bite you:

- **Mobile push still needs APNs/FCM.** Web Push is real and working (see
  above); a truck's notification reaching someone's *phone* while the app is
  closed needs Apple Push Notification service and Firebase Cloud
  Messaging, both of which need developer accounts and credentials only you
  can provide — that's genuinely outside what could be wired up without you.
- **Real email sending needs a `RESEND_API_KEY` in production.** Password
  reset sends real mail locally (via MailDev) and in production (via Resend,
  once that key is set) — see the note above. Still missing: email
  verification on sign-up, so nothing confirms an account's email is real or
  owned by the person who typed it.
- **No proof behind a "verified" badge, and no reporting path.** Anyone can
  still sign up as a "truck" with no proof of anything — the `/admin`
  verified toggle (see below) is a badge an admin can grant, not something
  backed by an actual verification process (business license, ID, etc.).
  There's also no way for a customer to report a fake/abandoned listing or a
  problem review other than an admin noticing it themselves in `/admin`.
- **No ordering.** The menu is display-only — there's no cart, pre-order, or
  payment flow. Adding one means a payment processor (Stripe et al.), which
  again needs an account only you can create.
- **Deployment.** Nothing here is hosted anywhere yet; it only exists on
  localhost, backed by a *local* Supabase (Docker). The repo is
  container-ready for Google Cloud Run's git-based continuous deployment —
  see "Deploying to Google Cloud Run" above for the full runbook (env vars,
  bootstrap order, the single-Dockerfile setup). Nothing about
  `apps/api/Dockerfile` is Cloud-Run-specific though, so a small VM, Fly.io,
  Railway, etc. work too. The web app doesn't have to be served by the API
  either — `apps/web`'s `adapter-static` output is plain static files, so
  any static host (Vercel, Netlify, Cloudflare Pages — just wire `200.html`
  as the SPA fallback, not the default `index.html`) works too, passing the
  deployed API's real URL as the `VITE_API_URL` build arg instead of the
  same-origin default.
- **Map tiles for production.** The map view uses OpenStreetMap's free tile
  server, which is fine for development but not for real traffic — see the
  note above.
