<script lang="ts">
	import type { Truck } from '@little-food-truck/shared';
	import { onDestroy, onMount } from 'svelte';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { BASEMAP_STYLE } from '$lib/map';

	let {
		trucks,
		userLocation = null,
		height = '70vh'
	}: {
		trucks: Truck[];
		userLocation?: { lat: number; lng: number } | null;
		height?: string;
	} = $props();

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let markers: maplibregl.Marker[] = [];
	let ready = $state(false);

	function escapeHtml(value: string): string {
		return value.replace(
			/[&<>"']/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
		);
	}

	// Markers and popups are raw DOM/HTML, outside Svelte's render tree, so
	// Phosphor's Svelte components can't mount there — these are the same
	// "fill" weight SVG paths inlined directly (Truck and Star respectively).
	const TRUCK_ICON_PATH =
		'M255.43,117l-14-35A15.93,15.93,0,0,0,226.58,72H192V64a8,8,0,0,0-8-8H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H49a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A8.13,8.13,0,0,0,255.43,117ZM80,208a16,16,0,1,1,16-16A16,16,0,0,1,80,208ZM32,136V72H176v64Zm160,72a16,16,0,1,1,16-16A16,16,0,0,1,192,208Zm0-96V88h34.58l9.6,24Z';
	const STAR_ICON_PATH =
		'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z';

	function iconSvg(path: string, sizePx: number): string {
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 256 256" fill="currentColor"><path d="${path}"/></svg>`;
	}

	function truckMarkerEl(truck: Truck): HTMLDivElement {
		const el = document.createElement('div');
		const base =
			'flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border-2 shadow-md';
		el.className = truck.isOpen
			? `${base} border-orange-600 bg-orange-200 text-orange-700`
			: `${base} border-stone-400 bg-stone-200 text-stone-500 opacity-75`;
		el.innerHTML = iconSvg(TRUCK_ICON_PATH, 18);
		return el;
	}

	function userMarkerEl(): HTMLDivElement {
		const el = document.createElement('div');
		el.className =
			'h-4 w-4 rounded-full border-[3px] border-white bg-blue-600 shadow-[0_0_0_2px_#2563eb,0_1px_4px_rgba(0,0,0,0.4)]';
		return el;
	}

	function popupHtml(truck: Truck): string {
		const status = truck.isOpen
			? '<span class="ml-1 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">Open</span>'
			: '<span class="ml-1 inline-block rounded-full bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500">Closed</span>';
		const rating =
			truck.averageRating != null
				? `<span class="inline-flex items-center gap-0.5">${iconSvg(STAR_ICON_PATH, 11)} ${truck.averageRating.toFixed(1)} (${truck.reviewCount})</span>`
				: 'No reviews yet';
		return `
			<div class="min-w-[160px] font-sans">
				<strong>${escapeHtml(truck.name)}</strong> ${status}
				<div class="mt-0.5 text-xs text-stone-500">${escapeHtml(truck.cuisine)} · ${rating}</div>
				<a href="/trucks/${truck.id}" class="mt-1.5 inline-block text-xs font-semibold text-orange-600">View truck →</a>
			</div>
		`;
	}

	function renderMarkers() {
		if (!map) return;
		for (const marker of markers) marker.remove();
		markers = [];

		const bounds = new maplibregl.LngLatBounds();
		let hasBounds = false;

		for (const truck of trucks) {
			if (truck.lat == null || truck.lng == null) continue;
			const marker = new maplibregl.Marker({ element: truckMarkerEl(truck) })
				.setLngLat([truck.lng, truck.lat])
				.setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(popupHtml(truck)))
				.addTo(map);
			markers.push(marker);
			bounds.extend([truck.lng, truck.lat]);
			hasBounds = true;
		}

		if (userLocation) {
			const marker = new maplibregl.Marker({ element: userMarkerEl() })
				.setLngLat([userLocation.lng, userLocation.lat])
				.addTo(map);
			markers.push(marker);
			bounds.extend([userLocation.lng, userLocation.lat]);
			hasBounds = true;
		}

		if (hasBounds) {
			map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
		}
	}

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: BASEMAP_STYLE,
			center: [-97.7431, 30.2672],
			zoom: 11,
			attributionControl: false
		});
		map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
		map.on('load', () => {
			ready = true;
		});
	});

	onDestroy(() => {
		map?.remove();
	});

	$effect(() => {
		if (!ready) return;
		trucks;
		userLocation;
		renderMarkers();
	});
</script>

<div
	bind:this={container}
	style="height: {height};"
	class="w-full overflow-hidden rounded-lg border border-stone-200"
></div>
