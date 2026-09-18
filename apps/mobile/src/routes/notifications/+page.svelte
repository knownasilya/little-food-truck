<script lang="ts">
	import type { NotificationRecord } from '@little-food-truck/shared';
	import { onDestroy } from 'svelte';
	import { client } from '$lib/api';

	let notifications = $state<NotificationRecord[]>([]);
	let loading = $state(true);

	async function load() {
		const res = await client.api.me.notifications.$get();
		if (res.ok) notifications = await res.json();
		loading = false;
	}

	async function markRead(n: NotificationRecord) {
		if (n.readAt) return;
		await client.api.me.notifications[':id'].read.$post({ param: { id: n.id } });
		n.readAt = new Date().toISOString();
	}

	load();
	// Poll for new "truck nearby" alerts — this is the scaffold's stand-in for
	// real push notifications, which would need APNs/FCM wiring for this app.
	const interval = setInterval(load, 30_000);
	onDestroy(() => clearInterval(interval));
</script>

<h1 class="mb-4 text-xl font-bold">Notifications</h1>

{#if loading}
	<p class="text-stone-400">Loading…</p>
{:else if notifications.length === 0}
	<p class="text-stone-400">
		Nothing yet. Favorite a truck and set your home location in Settings to get alerted when it's
		nearby.
	</p>
{:else}
	<ul class="flex flex-col gap-2">
		{#each notifications as n (n.id)}
			<li>
				<button
					class="w-full rounded-lg border p-3 text-left {n.readAt
						? 'border-stone-200 bg-white text-stone-500'
						: 'border-orange-300 bg-orange-50'}"
					onclick={() => markRead(n)}
				>
					<div class="flex items-center justify-between">
						<span class="font-medium">{n.truckName}</span>
						<span class="text-xs text-stone-400">{new Date(n.createdAt).toLocaleString()}</span>
					</div>
					<p class="text-sm">{n.message}</p>
				</button>
			</li>
		{/each}
	</ul>
{/if}
