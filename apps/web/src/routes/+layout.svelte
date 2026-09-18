<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/images/favicon-32.png" />
	<link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
</svelte:head>

{@render children()}
