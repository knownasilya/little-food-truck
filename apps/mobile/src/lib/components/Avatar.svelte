<script lang="ts">
	import { resolveUploadUrl } from '$lib/api';
	import { User } from 'phosphor-svelte';

	let {
		avatarUrl,
		size = 32
	}: {
		avatarUrl?: string | null;
		size?: number;
	} = $props();
</script>

{#if avatarUrl}
	<img
		src={resolveUploadUrl(avatarUrl)}
		alt=""
		class="shrink-0 rounded-full object-cover"
		style="width: {size}px; height: {size}px;"
	/>
{:else}
	<div
		class="flex shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500"
		style="width: {size}px; height: {size}px;"
	>
		<User size={size * 0.6} weight="fill" />
	</div>
{/if}
