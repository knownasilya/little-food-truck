<script lang="ts">
	import type { Truck } from '@little-food-truck/shared';
	import { resolveUploadUrl } from '$lib/api';
	import { Heart, MapPin, SealCheck, Star, Timer, Truck as TruckIcon } from 'phosphor-svelte';

	let {
		truck,
		showFavorite = false,
		favorited = false,
		onToggleFavorite,
	}: {
		truck: Truck;
		showFavorite?: boolean;
		favorited?: boolean;
		onToggleFavorite?: (truck: Truck) => void;
	} = $props();
</script>

<a
	href={`/trucks/${truck.id}`}
	class="flex h-full items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow"
>
	<div
		class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-orange-600"
	>
		{#if truck.photoUrl}
			<img src={resolveUploadUrl(truck.photoUrl)} alt="" class="h-full w-full object-cover" />
		{:else}
			<TruckIcon size={28} weight="fill" />
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<h3 class="truncate font-semibold">{truck.name}</h3>
			{#if truck.verified}
				<SealCheck size={16} weight="fill" class="shrink-0 text-blue-500" aria-label="Verified" />
			{/if}
			<span
				class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {truck.isOpen
					? 'bg-green-100 text-green-700'
					: 'bg-stone-100 text-stone-500'}"
			>
				{truck.isOpen ? 'Open' : 'Closed'}
			</span>
		</div>
		<p class="truncate text-sm text-stone-500">{truck.cuisine} · {truck.favoriteCount} favorites</p>
		<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
			{#if truck.averageRating != null}
				<p class="flex items-center gap-1 text-sm text-amber-600">
					<Star size={14} weight="fill" />
					{truck.averageRating.toFixed(1)} ({truck.reviewCount})
				</p>
			{:else}
				<p class="text-sm text-stone-400">No reviews yet</p>
			{/if}
			{#if truck.isOpen && truck.waitMinutes != null}
				<p class="flex items-center gap-1 text-sm text-stone-500">
					<Timer size={14} weight="bold" /> ~{truck.waitMinutes} min wait
				</p>
			{/if}
			{#if truck.distanceMiles != null}
				<p class="flex items-center gap-1 text-sm text-stone-500">
					<MapPin size={14} weight="bold" /> {truck.distanceMiles.toFixed(1)} mi
				</p>
			{/if}
		</div>
	</div>

	{#if showFavorite}
		<button
			class="shrink-0 {favorited ? 'text-red-500' : 'text-stone-300'}"
			aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
			onclick={(e) => {
				e.preventDefault();
				onToggleFavorite?.(truck);
			}}
		>
			<Heart size={26} weight={favorited ? 'fill' : 'regular'} />
		</button>
	{/if}
</a>
