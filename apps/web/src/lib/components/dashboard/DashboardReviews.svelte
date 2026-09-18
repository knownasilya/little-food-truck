<script lang="ts">
	import type { ReviewRecord } from '@little-food-truck/shared';
	import { client } from '$lib/api';
	import { Flag, PaperPlaneTilt, Star, Trash, X } from 'phosphor-svelte';

	let { reviews, onChange }: { reviews: ReviewRecord[]; onChange: () => void } = $props();

	let replyDrafts = $state<Record<string, string>>({});
	let busyId = $state<string | null>(null);

	async function submitReply(reviewId: string) {
		const reply = replyDrafts[reviewId]?.trim();
		if (!reply) return;
		busyId = reviewId;
		try {
			await client.api.me.reviews[':id'].reply.$patch({ param: { id: reviewId }, json: { reply } });
			onChange();
		} finally {
			busyId = null;
		}
	}

	async function deleteReply(reviewId: string) {
		busyId = reviewId;
		try {
			await client.api.me.reviews[':id'].reply.$delete({ param: { id: reviewId } });
			onChange();
		} finally {
			busyId = null;
		}
	}

	async function toggleFlag(review: ReviewRecord) {
		busyId = review.id;
		try {
			const endpoint = review.flaggedAt
				? client.api.me.reviews[':id'].flag.$delete
				: client.api.me.reviews[':id'].flag.$post;
			await endpoint({ param: { id: review.id } });
			onChange();
		} finally {
			busyId = null;
		}
	}
</script>

<section class="rounded-lg border border-stone-200 bg-white p-4">
	<h2 class="mb-3 font-semibold">Reviews</h2>

	{#if reviews.length === 0}
		<p class="text-sm text-stone-400">No reviews yet.</p>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each reviews as review (review.id)}
				<li class="rounded border p-3 text-sm {review.flaggedAt ? 'border-red-200 bg-red-50/40' : 'border-stone-200'}">
					<div class="flex items-center justify-between">
						<span class="font-medium">{review.customerName}</span>
						<span class="flex items-center gap-0.5 text-amber-500">
							{#each [1, 2, 3, 4, 5] as n (n)}
								<Star size={13} weight={n <= review.rating ? 'fill' : 'regular'} />
							{/each}
						</span>
					</div>
					{#if review.comment}
						<p class="mt-1 text-stone-700">{review.comment}</p>
					{/if}

					{#if review.ownerReply}
						<div class="mt-2 flex items-start justify-between gap-2 rounded bg-stone-50 p-2 text-stone-600">
							<div class="min-w-0">
								<p class="text-xs font-medium text-stone-400">Your reply</p>
								<p>{review.ownerReply}</p>
							</div>
							<button
								disabled={busyId === review.id}
								onclick={() => deleteReply(review.id)}
								aria-label="Delete reply"
								title="Delete reply"
								class="shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50"
							>
								<Trash size={14} weight="bold" />
							</button>
						</div>
					{:else}
						<div class="mt-2 flex gap-2">
							<input
								bind:value={replyDrafts[review.id]}
								placeholder="Reply to this review…"
								class="flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
							/>
							<button
								disabled={busyId === review.id}
								onclick={() => submitReply(review.id)}
								class="flex items-center gap-1 rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
							>
								<PaperPlaneTilt size={14} weight="bold" />
								Reply
							</button>
						</div>
					{/if}

					<button
						disabled={busyId === review.id}
						onclick={() => toggleFlag(review)}
						class="mt-2 flex items-center gap-1 text-xs disabled:opacity-50 {review.flaggedAt
							? 'text-red-600 hover:text-red-700'
							: 'text-stone-400 hover:text-stone-600'}"
					>
						{#if review.flaggedAt}
							<X size={13} weight="bold" /> Unflag
						{:else}
							<Flag size={13} weight="bold" /> Flag for admin review
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
