import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// maplibre-gl resolves its own worker script at runtime by string-concatenating
// a filename onto its *own* module URL (not a static `new URL(literal,
// import.meta.url)` Vite/Rollup can detect and bundle) — so the production
// build never emits maplibre-gl-worker.mjs as an asset, and the map silently
// hangs forever the moment anything needs the worker (e.g. clustering).
// A plain `?url` import isn't enough either: it copies the file verbatim
// without following ITS OWN internal import of a sibling chunk
// (maplibre-gl-shared.mjs), so the worker script 404s on that sibling the
// instant it runs and silently never responds — no console error, no
// network-tab flag, just every setData() call hanging forever. `?worker&url`
// runs the file through Vite's worker-bundling pipeline instead, which
// resolves that transitive import too, and gives back a URL that actually
// works. setWorkerUrl() then points maplibre at it explicitly instead of
// the (wrong) URL it would otherwise guess at runtime.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

// Free basemap tiles from Esri's public World Street Map service — no API
// key/signup needed, and no watermark, unlike the free tiers of most
// alternatives (tried CARTO's basemaps.cartocdn.com first; despite older
// docs describing it as keyless, it now overlays an "API KEY" watermark
// without one — confirmed by actually loading a tile, not just reading
// Esri's/CARTO's docs). Also unlike OSM's own tile server
// (tile.openstreetmap.org), Esri's is explicitly meant to be used this way
// by other sites' production traffic, not just local dev. Note the tile
// path is {z}/{y}/{x} (y before x) — Esri's own REST convention, different
// from the {z}/{x}/{y} order most other tile servers use. Swap for a
// vector style from MapTiler/Stadia Maps/etc. (with your own key) if you
// need something Esri's free tier doesn't cover. Shared by every map on
// this app (TruckMap.svelte, LocationPickerModal.svelte) so there's one
// place to make that swap.
export const BASEMAP_STYLE: maplibregl.StyleSpecification = {
	version: 8,
	sources: {
		esri: {
			type: 'raster',
			tiles: [
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
			],
			tileSize: 256,
			attribution:
				'Tiles &copy; <a href="https://www.esri.com" target="_blank">Esri</a> — Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, and the GIS User Community'
		}
	},
	layers: [{ id: 'esri', type: 'raster', source: 'esri' }]
};
