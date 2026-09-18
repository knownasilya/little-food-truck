<script lang="ts">
	import type { Truck } from '@little-food-truck/shared';
	import { client } from '$lib/api';
	import TruckCard from '$lib/components/TruckCard.svelte';

	let trucks = $state<Truck[]>([]);
	let loading = $state(true);

	async function load() {
		loading = true;
		const res = await client.api.me.favorites.$get();
		if (res.ok) trucks = await res.json();
		loading = false;
	}

	async function unfavorite(truck: Truck) {
		await client.api.trucks[':id'].favorite.$delete({ param: { id: truck.id } });
		trucks = trucks.filter((t) => t.id !== truck.id);
	}

	load();
</script>

<h1 class="mb-4 text-xl font-bold">Your favorites</h1>

{#if loading}
	<p class="text-stone-400">Loading…</p>
{:else if trucks.length === 0}
	<p class="text-stone-400">You haven't favorited any trucks yet.</p>
{:else}
	<div class="flex flex-col gap-3">
		{#each trucks as truck (truck.id)}
			<TruckCard {truck} showFavorite favorited onToggleFavorite={unfavorite} />
		{/each}
	</div>
{/if}
