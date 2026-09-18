<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// The map is now part of /browse (above the filters, collapsible) instead
	// of its own page — this just catches old links/bookmarks.
	onMount(() => {
		void goto('/browse', { replaceState: true });
	});
</script>
