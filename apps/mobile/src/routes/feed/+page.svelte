<script lang="ts">
	import type { FeedPost } from '@little-food-truck/shared';
	import { client, resolveUploadUrl } from '$lib/api';
	import { Megaphone } from 'phosphor-svelte';

	let posts = $state<FeedPost[]>([]);
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			const res = await client.api.me.feed.$get();
			if (res.ok) posts = await res.json();
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});
</script>

<svelte:head><title>Feed — Little Food Truck</title></svelte:head>

<h1 class="mb-4 text-xl font-bold">Feed</h1>
<p class="mb-4 text-sm text-stone-500">Recent updates from trucks you've favorited.</p>

{#if loading}
	<p class="text-stone-400">Loading…</p>
{:else if posts.length === 0}
	<div class="rounded-lg border border-dashed border-stone-300 p-6 text-center text-stone-400">
		<Megaphone size={28} class="mx-auto mb-2" />
		<p>No updates yet. Favorite a few trucks to see their posts here.</p>
		<a href="/browse" class="mt-2 inline-block text-orange-600 hover:underline">Browse trucks</a>
	</div>
{:else}
	<ul class="flex flex-col gap-3">
		{#each posts as post (post.id)}
			<li class="rounded-lg border border-stone-200 bg-white p-4">
				<a href={`/trucks/${post.truckId}`} class="flex items-center gap-2 text-sm font-medium hover:text-orange-600">
					{#if post.truckPhotoUrl}
						<img src={resolveUploadUrl(post.truckPhotoUrl)} alt="" class="h-6 w-6 rounded-full object-cover" />
					{/if}
					{post.truckName}
				</a>
				<p class="mt-1 text-stone-700">{post.message}</p>
				{#if post.photoUrl}
					<img src={resolveUploadUrl(post.photoUrl)} alt="" class="mt-2 max-h-48 rounded-lg" />
				{/if}
				<p class="mt-1 text-xs text-stone-400">{new Date(post.createdAt).toLocaleString()}</p>
			</li>
		{/each}
	</ul>
{/if}
