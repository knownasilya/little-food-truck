<script lang="ts">
	import { DIETARY_TAGS, type CuisineType, type DietaryTag, type Truck } from '@little-food-truck/shared';
	import { client } from '$lib/api';
	import { getAuth } from '$lib/auth.svelte';
	import TruckCard from '$lib/components/TruckCard.svelte';
	import TruckMap from '$lib/components/TruckMap.svelte';
	import { CaretDown, CaretUp, GpsFix, MagnifyingGlass, Sparkle, TrendUp } from 'phosphor-svelte';

	type Tab = 'browse' | 'new' | 'trending';

	const auth = getAuth();

	const MAP_COLLAPSED_KEY = 'lft:browse-map-collapsed';
	let mapExpanded = $state(true);
	try {
		mapExpanded = localStorage.getItem(MAP_COLLAPSED_KEY) !== 'true';
	} catch {
		// localStorage can throw (private mode, blocked) — default stays expanded.
	}
	function toggleMap() {
		mapExpanded = !mapExpanded;
		try {
			localStorage.setItem(MAP_COLLAPSED_KEY, mapExpanded ? 'false' : 'true');
		} catch {
			// Per-viewer convenience only — fine if it doesn't persist.
		}
	}

	let userLocation = $state<{ lat: number; lng: number } | null>(null);
	let locatingMap = $state(false);
	let mapLocationError = $state<string | null>(null);

	function locateMe() {
		mapLocationError = null;
		if (!('geolocation' in navigator)) {
			mapLocationError = 'Geolocation is not available in this browser.';
			return;
		}
		locatingMap = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				locatingMap = false;
			},
			() => {
				mapLocationError = 'Could not read your location. Check location permissions.';
				locatingMap = false;
			}
		);
	}

	const NEW_WITHIN_DAYS = 7;
	const HIGHLIGHT_LIMIT = '20';

	const cuisines: CuisineType[] = [
		'american',
		'mexican',
		'asian',
		'bbq',
		'dessert',
		'coffee',
		'vegan',
		'seafood',
		'other',
	];

	let activeTab = $state<Tab>('browse');

	let trucks = $state<Truck[]>([]);
	let favoriteIds = $state<Set<string>>(new Set());
	let search = $state('');
	let cuisine = $state<CuisineType | ''>('');
	let nearMe = $state(false);
	let openOnly = $state(false);
	let dietary = $state<DietaryTag[]>([]);
	let sort = $state<'relevant' | 'rating' | 'distance' | 'newest'>('relevant');
	let loading = $state(true);
	let error = $state<string | null>(null);

	function toggleDietary(tag: DietaryTag) {
		dietary = dietary.includes(tag) ? dietary.filter((t) => t !== tag) : [...dietary, tag];
		loadTrucks();
	}

	let trending = $state<Truck[]>([]);
	let newThisWeek = $state<Truck[]>([]);
	let highlightsLoaded = $state(false);

	async function loadHighlights() {
		const [trendingRes, newestRes] = await Promise.all([
			client.api.trucks.$get({ query: { sort: 'trending', limit: HIGHLIGHT_LIMIT } }),
			client.api.trucks.$get({ query: { sort: 'newest', limit: HIGHLIGHT_LIMIT } }),
		]);
		if (trendingRes.ok) {
			const rows = await trendingRes.json();
			trending = rows.filter((t) => t.viewCount > 0);
		}
		if (newestRes.ok) {
			const rows = await newestRes.json();
			const cutoff = Date.now() - NEW_WITHIN_DAYS * 24 * 60 * 60 * 1000;
			newThisWeek = rows.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
		}
		highlightsLoaded = true;
	}

	async function loadFavorites() {
		if (auth.session?.role !== 'customer') return;
		const res = await client.api.me.favorites.$get();
		if (res.ok) {
			const favs = await res.json();
			favoriteIds = new Set(favs.map((t) => t.id));
		}
	}

	async function loadTrucks() {
		loading = true;
		error = null;
		try {
			const query: Record<string, string> = {};
			if (search) query.q = search;
			if (cuisine) query.cuisine = cuisine;
			if (openOnly) query.openOnly = 'true';
			if (dietary.length > 0) query.dietary = dietary.join(',');
			if (sort !== 'relevant') query.sort = sort;

			if (nearMe || sort === 'distance') {
				if (!('geolocation' in navigator)) {
					error = 'Geolocation is not available in this browser.';
					return;
				}
				try {
					const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
						navigator.geolocation.getCurrentPosition(resolve, reject),
					);
					query.lat = String(pos.coords.latitude);
					query.lng = String(pos.coords.longitude);
					query.radiusMiles = nearMe ? '10' : '500';
					userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				} catch {
					error = 'Could not get your location. Check location permissions for this site.';
					return;
				}
			}

			const res = await client.api.trucks.$get({ query });
			if (res.ok) trucks = await res.json();
			else error = 'Could not load trucks. Is the API running?';
		} catch {
			error = 'Could not load trucks. Is the API running?';
		} finally {
			loading = false;
		}
	}

	async function toggleFavorite(truck: Truck) {
		if (favoriteIds.has(truck.id)) {
			await client.api.trucks[':id'].favorite.$delete({ param: { id: truck.id } });
			favoriteIds.delete(truck.id);
		} else {
			await client.api.trucks[':id'].favorite.$post({ param: { id: truck.id } });
			favoriteIds.add(truck.id);
		}
		favoriteIds = new Set(favoriteIds);
	}

	$effect(() => {
		loadTrucks();
	});

	$effect(() => {
		if (auth.session) loadFavorites();
	});

	loadHighlights();
</script>

<svelte:head><title>Little Food Truck</title></svelte:head>

<div class="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
	<button
		type="button"
		class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
		'browse'
			? 'border-orange-600 text-orange-600'
			: 'border-transparent text-stone-500 hover:text-stone-700'}"
		onclick={() => (activeTab = 'browse')}
	>
		<MagnifyingGlass size={16} weight="bold" /> Browse
	</button>
	<button
		type="button"
		class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
		'new'
			? 'border-orange-600 text-orange-600'
			: 'border-transparent text-stone-500 hover:text-stone-700'}"
		onclick={() => (activeTab = 'new')}
	>
		<Sparkle size={16} weight="fill" /> New this week
		{#if newThisWeek.length > 0}<span class="text-xs text-stone-400">{newThisWeek.length}</span>{/if}
	</button>
	<button
		type="button"
		class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
		'trending'
			? 'border-orange-600 text-orange-600'
			: 'border-transparent text-stone-500 hover:text-stone-700'}"
		onclick={() => (activeTab = 'trending')}
	>
		<TrendUp size={16} weight="bold" /> Trending
		{#if trending.length > 0}<span class="text-xs text-stone-400">{trending.length}</span>{/if}
	</button>
</div>

{#if activeTab === 'browse'}
	<div class="mb-4">
		<div class="mb-2 flex items-center justify-between">
			<button
				type="button"
				class="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-orange-600"
				onclick={toggleMap}
			>
				{#if mapExpanded}
					<CaretUp size={16} weight="bold" />
				{:else}
					<CaretDown size={16} weight="bold" />
				{/if}
				Map
			</button>
			{#if mapExpanded}
				<button
					disabled={locatingMap}
					class="flex items-center gap-1.5 rounded border border-orange-300 px-3 py-1.5 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50"
					onclick={locateMe}
				>
					<GpsFix size={16} weight="bold" />
					{locatingMap ? 'Locating…' : 'Center on me'}
				</button>
			{/if}
		</div>
		{#if mapExpanded}
			{#if mapLocationError}
				<p class="mb-2 rounded bg-orange-50 p-2 text-sm text-orange-700">{mapLocationError}</p>
			{/if}
			<TruckMap {trucks} {userLocation} height="40vh" />
		{/if}
	</div>

	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			bind:value={search}
			onchange={loadTrucks}
			type="search"
			placeholder="Search trucks…"
			class="flex-1 rounded border border-stone-300 px-3 py-2"
		/>
		<select
			bind:value={cuisine}
			onchange={loadTrucks}
			class="rounded border border-stone-300 px-3 py-2"
		>
			<option value="">All cuisines</option>
			{#each cuisines as c (c)}
				<option value={c}>{c}</option>
			{/each}
		</select>
		<select
			bind:value={sort}
			onchange={loadTrucks}
			class="rounded border border-stone-300 px-3 py-2"
		>
			<option value="relevant">Sort: relevant</option>
			<option value="rating">Sort: top rated</option>
			<option value="distance">Sort: nearest</option>
			<option value="newest">Sort: newest</option>
		</select>
		<label class="flex items-center gap-2 whitespace-nowrap text-sm">
			<input type="checkbox" bind:checked={openOnly} onchange={loadTrucks} />
			Open now
		</label>
		<label class="flex items-center gap-2 whitespace-nowrap text-sm">
			<input type="checkbox" bind:checked={nearMe} onchange={loadTrucks} />
			Near me
		</label>
	</div>

	<div class="mb-6 flex flex-wrap gap-2">
		{#each DIETARY_TAGS as tag (tag)}
			<button
				type="button"
				class="rounded-full border px-2.5 py-1 text-xs {dietary.includes(tag)
					? 'border-green-400 bg-green-50 text-green-700'
					: 'border-stone-300 text-stone-500 hover:bg-stone-100'}"
				onclick={() => toggleDietary(tag)}
			>
				{tag}
			</button>
		{/each}
	</div>

	{#if error}
		<p class="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
	{:else if loading}
		<p class="text-stone-400">Loading trucks…</p>
	{:else if trucks.length === 0}
		<p class="text-stone-400">No trucks found. Try a different search.</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each trucks as truck (truck.id)}
				<TruckCard
					{truck}
					showFavorite={auth.session?.role === 'customer'}
					favorited={favoriteIds.has(truck.id)}
					onToggleFavorite={toggleFavorite}
				/>
			{/each}
		</div>
	{/if}
{:else if activeTab === 'new'}
	{#if !highlightsLoaded}
		<p class="text-stone-400">Loading…</p>
	{:else if newThisWeek.length === 0}
		<p class="text-stone-400">No new trucks in the last {NEW_WITHIN_DAYS} days.</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each newThisWeek as truck (truck.id)}
				<TruckCard
					{truck}
					showFavorite={auth.session?.role === 'customer'}
					favorited={favoriteIds.has(truck.id)}
					onToggleFavorite={toggleFavorite}
				/>
			{/each}
		</div>
	{/if}
{:else if activeTab === 'trending'}
	{#if !highlightsLoaded}
		<p class="text-stone-400">Loading…</p>
	{:else if trending.length === 0}
		<p class="text-stone-400">Nothing trending yet — check back once trucks start getting views.</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each trending as truck (truck.id)}
				<TruckCard
					{truck}
					showFavorite={auth.session?.role === 'customer'}
					favorited={favoriteIds.has(truck.id)}
					onToggleFavorite={toggleFavorite}
				/>
			{/each}
		</div>
	{/if}
{/if}
