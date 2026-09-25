import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		port: 5173
	},
	// Vite's dep optimizer pre-bundles maplibre-gl's main thread code but
	// misses its worker chunk (maplibre-gl-worker.mjs), which 404s at
	// runtime — breaking anything that needs the worker (e.g. clustering on
	// a GeoJSON source, which never finishes loading without it). Excluding
	// the package from pre-bundling avoids the broken split.
	optimizeDeps: {
		exclude: ['maplibre-gl']
	},
	// maplibre-gl's worker is itself an ES module (it has its own imports),
	// but Vite's default worker output format is 'iife', which can't
	// represent that — the production build silently fails to emit the
	// worker chunk at all when left on the default (clustering, which needs
	// the worker, then just hangs forever with no error). This is
	// MapLibre's own documented Vite requirement.
	worker: {
		format: 'es'
	},
	// The `(app)` route group is a fully client-rendered SPA (ssr:false — see
	// its +layout.ts): the same static build embeds in Tauri for mobile, and
	// every app page reads its session via a client-side fetch with
	// credentials anyway. The marketing homepage at "/" is the one page that
	// opts back into real SSR/prerendering for SEO (see its +page.ts), which
	// is why phosphor-svelte — a Svelte-component icon library, not
	// pre-compiled JS — needs to be forced into the SSR bundle here instead
	// of being treated as an external Node import.
	ssr: {
		noExternal: ['phosphor-svelte']
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Named 200.html (not index.html) so the SPA fallback doesn't
			// clobber the real prerendered index.html from the marketing
			// homepage at "/". Most static hosts (Netlify, GitHub Pages, etc.)
			// support wiring a custom fallback filename for unmatched routes;
			// see the deployment note in the README.
			adapter: adapter({ fallback: '200.html' })
		})
	]
});
