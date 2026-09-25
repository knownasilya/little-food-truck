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
	let userMarker: maplibregl.Marker | undefined;
	// Keyed by "truck-<id>" or "cluster-<cluster_id>" — reused across
	// updateMarkers() calls so an unchanged point's DOM element (and its
	// open popup, if any) isn't torn down and rebuilt on every pan/zoom.
	let markersByKey = new Map<string, maplibregl.Marker>();
	let trucksById = new Map<string, Truck>();
	let ready = $state(false);

	const SOURCE_ID = 'trucks';
	// How close "zoom closer to the user" actually zooms — well past the
	// fitBounds-across-everything cap below, close enough to read individual
	// nearby streets/trucks without being pinned to one block.
	const USER_ZOOM = 13;

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

	// Size/darken step with cluster size so a cluster of 50 trucks visibly
	// reads as "bigger" than one of 3 — same idea as the default
	// Mapbox/MapLibre cluster-circle examples, just rendered as an HTML
	// marker instead of a native circle+symbol layer so it can reuse this
	// component's existing DOM-marker/popup machinery.
	function clusterMarkerEl(count: number): HTMLDivElement {
		const el = document.createElement('div');
		const size = count < 10 ? 36 : count < 50 ? 44 : 52;
		el.className =
			'flex cursor-pointer items-center justify-center rounded-full border-2 border-white bg-orange-600 font-semibold text-white shadow-md';
		el.style.width = `${size}px`;
		el.style.height = `${size}px`;
		el.style.fontSize = size >= 44 ? '14px' : '13px';
		el.textContent = count > 99 ? '99+' : String(count);
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

	// A plain object shape, not the `geojson` package's types — avoids
	// depending on whatever ambient GeoJSON types maplibre-gl happens to
	// re-export; `as never` at the two call sites below satisfies
	// `GeoJSONSourceSpecification.data`'s stricter type without pulling in
	// an extra type dependency for a shape this simple.
	type TruckFeatureCollection = {
		type: 'FeatureCollection';
		features: {
			type: 'Feature';
			properties: { id: string };
			geometry: { type: 'Point'; coordinates: [number, number] };
		}[];
	};

	function truckFeatureCollection(list: Truck[]): TruckFeatureCollection {
		return {
			type: 'FeatureCollection',
			features: list
				.filter((t) => t.lat != null && t.lng != null)
				.map((t) => ({
					type: 'Feature',
					properties: { id: t.id },
					geometry: { type: 'Point', coordinates: [t.lng as number, t.lat as number] }
				}))
		};
	}

	// The clustering itself (grouping nearby points at the current zoom) is
	// computed by MapLibre/supercluster inside the GeoJSON source — this
	// just mirrors whatever it currently reports into DOM markers, reusing
	// this component's existing rich-HTML truck markers/popups for
	// unclustered points (which native circle/symbol layers can't render).
	// Standard "HTML markers on a clustered source" pattern; see MapLibre's
	// own cluster-html example.
	function updateMarkers() {
		if (!map || !map.getSource(SOURCE_ID)) return;
		const seen = new Set<string>();
		const features = map.querySourceFeatures(SOURCE_ID);

		for (const feature of features) {
			if (feature.geometry.type !== 'Point') continue;
			const [lng, lat] = feature.geometry.coordinates as [number, number];
			const props = feature.properties as {
				cluster?: boolean;
				cluster_id?: number;
				point_count?: number;
				id?: string;
			};

			if (props.cluster && props.cluster_id != null) {
				const key = `cluster-${props.cluster_id}`;
				// querySourceFeatures can return the same feature more than
				// once (once per tile it intersects) — skip repeats.
				if (seen.has(key)) continue;
				seen.add(key);

				let marker = markersByKey.get(key);
				if (!marker) {
					const clusterId = props.cluster_id;
					const el = clusterMarkerEl(props.point_count ?? 0);
					el.addEventListener('click', () => {
						const source = map!.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
						source
							.getClusterExpansionZoom(clusterId)
							.then((zoom) => map!.easeTo({ center: [lng, lat], zoom }))
							.catch(() => {});
					});
					marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]);
					markersByKey.set(key, marker);
				} else {
					marker.setLngLat([lng, lat]);
				}
			} else if (props.id) {
				const key = `truck-${props.id}`;
				if (seen.has(key)) continue;
				seen.add(key);

				if (!markersByKey.has(key)) {
					const truck = trucksById.get(props.id);
					if (!truck) continue;
					const marker = new maplibregl.Marker({ element: truckMarkerEl(truck) })
						.setLngLat([lng, lat])
						.setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(popupHtml(truck)));
					markersByKey.set(key, marker);
				}
			}
		}

		for (const [key, marker] of markersByKey) {
			if (seen.has(key)) {
				marker.addTo(map);
			} else {
				marker.remove();
				markersByKey.delete(key);
			}
		}
	}

	function fitToTrucks() {
		if (!map) return;
		const bounds = new maplibregl.LngLatBounds();
		let hasBounds = false;
		for (const truck of trucks) {
			if (truck.lat == null || truck.lng == null) continue;
			bounds.extend([truck.lng, truck.lat]);
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
			// The compact attribution control re-expands itself once the
			// basemap tile source's attribution text becomes known (which
			// happens asynchronously as the style loads) — collapse it back
			// down to just the "i" icon only after that settles.
			container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

			map!.addSource(SOURCE_ID, {
				type: 'geojson',
				data: truckFeatureCollection(trucks) as never,
				cluster: true,
				clusterMaxZoom: 14,
				clusterRadius: 50
			});
			// MapLibre only loads/clusters tiles for a source that's actually
			// referenced by a style layer — with only HTML markers reading
			// back via querySourceFeatures() and no layer, the source is
			// never marked "used" and no tiles (or clusters) are ever
			// computed. This layer exists purely to keep the source active;
			// it renders nothing.
			map!.addLayer({
				id: `${SOURCE_ID}-layer`,
				type: 'circle',
				source: SOURCE_ID,
				paint: { 'circle-radius': 0, 'circle-opacity': 0 }
			});
			map!.on('sourcedata', (e) => {
				if (e.sourceId !== SOURCE_ID || !e.isSourceLoaded) return;
				updateMarkers();
			});
			map!.on('moveend', updateMarkers);
			fitToTrucks();
			ready = true;
		});
	});

	onDestroy(() => {
		map?.remove();
	});

	// Trucks list changed (filters, a fresh load, ...) — refresh the
	// clustered source and re-fit the view to whatever's now showing.
	$effect(() => {
		if (!ready) return;
		trucks;
		trucksById = new Map(trucks.map((t) => [t.id, t]));
		const source = map?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
		source?.setData(truckFeatureCollection(trucks) as never);
		fitToTrucks();
	});

	// userLocation changing is its own effect, deliberately separate from
	// the trucks-driven one above: every way location becomes available
	// (the "Center on me" button, the "Near me" filter, sorting by
	// distance) should zoom in close on the user, not widen back out to a
	// bounds-fit across every currently-listed truck.
	$effect(() => {
		if (!ready || !map) return;
		userMarker?.remove();
		userMarker = undefined;
		if (userLocation) {
			userMarker = new maplibregl.Marker({ element: userMarkerEl() })
				.setLngLat([userLocation.lng, userLocation.lat])
				.addTo(map);
			map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: USER_ZOOM });
		}
	});
</script>

<div
	bind:this={container}
	style="height: {height};"
	class="w-full overflow-hidden rounded-lg border border-stone-200"
></div>
