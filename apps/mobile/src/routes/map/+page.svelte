<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// The map is now part of the Browse tab (above the filters, collapsible)
	// instead of its own page — this just catches old links.
	onMount(() => {
		void goto('/', { replaceState: true });
	});
</script>
