<script lang="ts">
	import type { CateringRequestRecord } from '@little-food-truck/shared';
	import { client } from '$lib/api';
	import { Check, X } from 'phosphor-svelte';

	let { requests, onChange }: { requests: CateringRequestRecord[]; onChange: () => void } =
		$props();

	async function setStatus(id: string, status: 'accepted' | 'declined') {
		await client.api.me['catering-requests'][':id'].$patch({ param: { id }, json: { status } });
		onChange();
	}

	const statusStyle: Record<string, string> = {
		new: 'bg-amber-100 text-amber-700',
		accepted: 'bg-green-100 text-green-700',
		declined: 'bg-stone-100 text-stone-500'
	};
</script>

<section class="rounded-lg border border-stone-200 bg-white p-4">
	<h2 class="mb-1 font-semibold">Catering requests</h2>
	<p class="mb-3 text-sm text-stone-500">Private event and booking requests from your page.</p>

	{#if requests.length === 0}
		<p class="text-sm text-stone-400">No requests yet.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each requests as req (req.id)}
				<li class="rounded border border-stone-200 p-3 text-sm">
					<div class="flex items-center justify-between gap-2">
						<span class="font-medium">{req.name}</span>
						<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {statusStyle[req.status]}">
							{req.status}
						</span>
					</div>
					<p class="text-stone-500">
						{req.email} · {new Date(`${req.eventDate}T00:00:00`).toLocaleDateString()}
						{#if req.guestCount}· {req.guestCount} guests{/if}
					</p>
					{#if req.details}
						<p class="mt-1 text-stone-700">{req.details}</p>
					{/if}
					{#if req.status === 'new'}
						<div class="mt-2 flex gap-2">
							<button
								onclick={() => setStatus(req.id, 'accepted')}
								class="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
							>
								<Check size={14} weight="bold" /> Accept
							</button>
							<button
								onclick={() => setStatus(req.id, 'declined')}
								class="flex items-center gap-1 rounded border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100"
							>
								<X size={14} weight="bold" /> Decline
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
