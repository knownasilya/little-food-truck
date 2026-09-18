<script lang="ts">
	import { Check, GpsFix, MapPin, X } from 'phosphor-svelte';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onDestroy, onMount } from 'svelte';
	import { BASEMAP_STYLE } from '$lib/map';

	let {
		initialLat = 30.2672,
		initialLng = -97.7431,
		onCancel,
		onConfirm
	}: {
		initialLat?: number;
		initialLng?: number;
		onCancel: () => void;
		onConfirm: (coords: { lat: number; lng: number }) => void;
	} = $props();

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let locating = $state(false);
	let locationError = $state<string | null>(null);

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: BASEMAP_STYLE,
			center: [initialLng, initialLat],
			zoom: 14,
			attributionControl: false
		});
		map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
	});

	onDestroy(() => {
		map?.remove();
	});

	function useMyLocation() {
		locationError = null;
		if (!('geolocation' in navigator)) {
			locationError = 'Geolocation is not available in this browser.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				map?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 });
				locating = false;
			},
			() => {
				locationError = 'Could not read your location. Check location permissions.';
				locating = false;
			}
		);
	}

	function confirm() {
		if (!map) return;
		const { lat, lng } = map.getCenter();
		onConfirm({ lat, lng });
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
	<div class="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-4">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold">Pick a location</h2>
			<button class="text-stone-400 hover:text-stone-600" aria-label="Cancel" onclick={onCancel}>
				<X size={20} weight="bold" />
			</button>
		</div>

		<p class="text-sm text-stone-500">Drag the map so the pin sits where you'll be parked.</p>

		<div class="relative h-72 w-full overflow-hidden rounded-lg border border-stone-200">
			<div bind:this={container} class="h-full w-full"></div>
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<MapPin size={36} weight="fill" class="-mt-8 text-orange-600 drop-shadow" />
			</div>
		</div>

		<button
			type="button"
			disabled={locating}
			class="flex items-center justify-center gap-1.5 rounded border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-50"
			onclick={useMyLocation}
		>
			<GpsFix size={16} weight="bold" />
			{locating ? 'Locating…' : 'Use my current location'}
		</button>
		{#if locationError}
			<p class="text-sm text-red-600">{locationError}</p>
		{/if}

		<div class="flex justify-end gap-2">
			<button
				class="rounded border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
				onclick={onCancel}
			>
				Cancel
			</button>
			<button
				class="flex items-center gap-1.5 rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700"
				onclick={confirm}
			>
				<Check size={16} weight="bold" /> Use this spot
			</button>
		</div>
	</div>
</div>
