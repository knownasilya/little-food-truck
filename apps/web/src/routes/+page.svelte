<script lang="ts">
	import type { Truck } from '@little-food-truck/shared';
	import TruckCard from '$lib/components/TruckCard.svelte';
	import { ensureSessionLoaded, getAuth } from '$lib/auth.svelte';
	import {
		Bell,
		CalendarBlank,
		DeviceMobile,
		ForkKnife,
		Heart,
		ImageSquare,
		MagnifyingGlass,
		MapTrifold,
		Megaphone,
		Star
	} from 'phosphor-svelte';

	const auth = getAuth();
	ensureSessionLoaded();

	// Real TruckCard component with representative data — a live product
	// preview, not a hand-drawn fake screenshot.
	const previewTrucks: Truck[] = [
		{
			id: 'preview-1',
			ownerId: 'preview-1',
			name: 'Taco Comet',
			description: '',
			cuisine: 'mexican',
			photoUrl: null,
			isOpen: true,
			lat: 30.2672,
			lng: -97.7431,
			locationUpdatedAt: null,
			waitMinutes: 8,
			viewCount: 0,
			favoriteCount: 128,
			averageRating: 4.8,
			reviewCount: 46,
			createdAt: '',
			verified: true,
			website: null,
			phone: null,
			state: 'TX'
		},
		{
			id: 'preview-2',
			ownerId: 'preview-2',
			name: 'Smoke Signal BBQ',
			description: '',
			cuisine: 'bbq',
			photoUrl: null,
			isOpen: true,
			lat: 30.2711,
			lng: -97.7437,
			locationUpdatedAt: null,
			waitMinutes: null,
			viewCount: 0,
			favoriteCount: 94,
			averageRating: 4.6,
			reviewCount: 31,
			createdAt: '',
			verified: false,
			website: null,
			phone: null,
			state: 'TX'
		},
		{
			id: 'preview-3',
			ownerId: 'preview-3',
			name: 'Wok This Way',
			description: '',
			cuisine: 'asian',
			photoUrl: null,
			isOpen: false,
			lat: 30.265,
			lng: -97.7455,
			locationUpdatedAt: null,
			waitMinutes: null,
			viewCount: 0,
			favoriteCount: 61,
			averageRating: 4.5,
			reviewCount: 19,
			createdAt: '',
			verified: false,
			website: null,
			phone: null,
			state: 'TX'
		}
	];
</script>

<svelte:head>
	<title>Little Food Truck — Find your favorite trucks nearby</title>
	<meta
		name="description"
		content="Browse local food trucks, save your favorites, and get notified the moment they open near you. Free for customers and truck owners."
	/>
</svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<nav class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
			<a href="/" class="flex items-center gap-2 text-lg font-bold text-orange-600">
				<img src="/images/logo-icon.png" alt="" class="h-12 w-12 rounded-full" />
				<span class="hidden sm:inline">Little Food Truck</span>
				<span class="sm:hidden">LFT</span>
			</a>
			<div class="flex items-center gap-4 text-sm">
				{#if auth.session}
					<a
						href="/browse"
						class="rounded-full bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
					>
						Go to app
					</a>
				{:else if !auth.loading}
					<a href="/sign-in" class="hidden text-stone-600 hover:text-orange-600 sm:inline">Sign in</a>
					<a
						href="/sign-up"
						class="rounded-full bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
					>
						Get started
					</a>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		<!-- Hero: asymmetric split, headline + subtext + CTAs left, live product preview right -->
		<section class="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-16 pb-20 sm:pt-20 md:grid-cols-2 md:gap-16">
			<div class="landing-hero-in">
				<h1 class="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
					Know when your favorite truck is nearby
				</h1>
				<p class="mt-5 max-w-[46ch] text-lg text-stone-600">
					Browse local food trucks, save your favorites, and get notified the moment they roll up
					near you.
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a
						href="/browse"
						class="rounded-full bg-orange-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-orange-700"
					>
						Browse trucks
					</a>
					<a
						href="/sign-up"
						class="rounded-full border border-stone-300 bg-white px-6 py-3 font-medium text-stone-700 hover:bg-stone-100"
					>
						Sign up free
					</a>
				</div>
			</div>

			<div class="landing-hero-in landing-hero-in-delay">
				<div
					class="pointer-events-none flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl"
				>
					{#each previewTrucks as truck (truck.id)}
						<TruckCard {truck} showFavorite favorited={truck.name === 'Taco Comet'} />
					{/each}
				</div>
			</div>
		</section>

		<!-- How it works: 3-up icon list, different layout family from the hero split -->
		<section class="border-t border-stone-200 bg-white py-16">
			<div class="mx-auto max-w-6xl px-4">
				<h2 class="mb-10 text-center text-2xl font-bold">How it works</h2>
				<div class="grid gap-8 sm:grid-cols-3">
					<div class="text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
							<MagnifyingGlass size={22} weight="bold" />
						</div>
						<h3 class="font-semibold">Search by cuisine or map</h3>
						<p class="mt-1 text-sm text-stone-500">
							Filter by cuisine, search by name, or browse the live map to see who's open now.
						</p>
					</div>
					<div class="text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
							<Heart size={22} weight="bold" />
						</div>
						<h3 class="font-semibold">Save your favorites</h3>
						<p class="mt-1 text-sm text-stone-500">
							Favorite the trucks you love so they're always one tap away.
						</p>
					</div>
					<div class="text-center">
						<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
							<Bell size={22} weight="bold" />
						</div>
						<h3 class="font-semibold">Get notified nearby</h3>
						<p class="mt-1 text-sm text-stone-500">
							We'll alert you the moment a favorited truck opens within your watch radius.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- For truck owners: full-width band, deliberately a different layout family (no image/text split) -->
		<section class="bg-stone-900 py-16 text-stone-50">
			<div class="mx-auto max-w-6xl px-4 text-center">
				<h2 class="text-2xl font-bold sm:text-3xl">Run a food truck? List it free.</h2>
				<p class="mx-auto mt-3 max-w-[50ch] text-stone-300">
					Post your menu and photos, set a weekly schedule, and let your regulars know the second
					you're open.
				</p>
				<div class="mt-8 grid gap-6 sm:grid-cols-3">
					<div class="flex flex-col items-center gap-2">
						<ForkKnife size={24} weight="bold" class="text-orange-400" />
						<span class="text-sm text-stone-200">Menu &amp; photos</span>
					</div>
					<div class="flex flex-col items-center gap-2">
						<CalendarBlank size={24} weight="bold" class="text-orange-400" />
						<span class="text-sm text-stone-200">Weekly schedule</span>
					</div>
					<div class="flex flex-col items-center gap-2">
						<Megaphone size={24} weight="bold" class="text-orange-400" />
						<span class="text-sm text-stone-200">Post live updates</span>
					</div>
				</div>
				<a
					href="/sign-up"
					class="mt-8 inline-block rounded-full bg-orange-600 px-6 py-3 font-medium text-white hover:bg-orange-500"
				>
					List your truck
				</a>
			</div>
		</section>

		<!-- Feature bento: 4 items, 4 cells, at least 2 with real visual variation -->
		<section class="bg-white py-16">
			<div class="mx-auto max-w-6xl px-4">
				<h2 class="mb-10 text-center text-2xl font-bold">Everything you need, in one app</h2>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-2xl bg-orange-50 p-6">
						<MapTrifold size={26} weight="bold" class="text-orange-600" />
						<h3 class="mt-3 font-semibold">Live map</h3>
						<p class="mt-1 text-sm text-stone-600">
							See every open truck near you, plotted in real time with OpenStreetMap.
						</p>
					</div>
					<div class="rounded-2xl bg-stone-100 p-6">
						<Star size={26} weight="bold" class="text-amber-500" />
						<h3 class="mt-3 font-semibold">Reviews &amp; ratings</h3>
						<p class="mt-1 text-sm text-stone-600">
							Read honest reviews from other customers before you get in line.
						</p>
					</div>
					<div class="rounded-2xl bg-stone-100 p-6">
						<ImageSquare size={26} weight="bold" class="text-stone-700" />
						<h3 class="mt-3 font-semibold">Menus &amp; photo galleries</h3>
						<p class="mt-1 text-sm text-stone-600">
							Browse a truck's menu and photos before you decide what to order.
						</p>
					</div>
					<div class="rounded-2xl bg-orange-50 p-6">
						<DeviceMobile size={26} weight="bold" class="text-orange-600" />
						<h3 class="mt-3 font-semibold">Web &amp; mobile</h3>
						<p class="mt-1 text-sm text-stone-600">
							Use it in your browser or install the app on iOS, Android, or desktop.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Closing CTA -->
		<section class="border-t border-stone-200 py-20 text-center">
			<img src="/images/logo-icon.png" alt="" class="mx-auto mb-5 h-14 w-14 rounded-full" />
			<h2 class="text-2xl font-bold sm:text-3xl">Ready to find your next favorite truck?</h2>
			<a
				href="/sign-up"
				class="mt-6 inline-block rounded-full bg-orange-600 px-8 py-3 font-medium text-white shadow-sm hover:bg-orange-700"
			>
				Sign up free
			</a>
		</section>
	</main>

	<footer class="border-t border-stone-200 bg-white py-8 text-center text-sm text-stone-400">
		<p>
			<a href="/terms" class="hover:text-stone-600 hover:underline">Terms of Service</a>
			<span class="mx-2">·</span>
			<a href="/privacy" class="hover:text-stone-600 hover:underline">Privacy Policy</a>
		</p>
		<p class="mt-2">© 2026 Little Food Truck</p>
	</footer>
</div>

<style>
	/* Simple, SSR-safe entrance motion — no JS, so it can't jank on
	   hydration, and it's gated behind prefers-reduced-motion at the media
	   query level rather than a runtime check. */
	@media (prefers-reduced-motion: no-preference) {
		.landing-hero-in {
			animation: landing-hero-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
		}
		.landing-hero-in-delay {
			animation-delay: 0.12s;
		}
	}

	@keyframes landing-hero-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
