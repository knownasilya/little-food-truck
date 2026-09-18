<script lang="ts">
	import type { AdminReview, AdminTruck } from '@little-food-truck/shared';
	import { goto } from '$app/navigation';
	import { client, resolveUploadUrl } from '$lib/api';
	import { ensureSessionLoaded, getAuth } from '$lib/auth.svelte';
	import { Eye, EyeSlash, Flag, SealCheck, Star, Trash, Truck as TruckIcon, X } from 'phosphor-svelte';

	const auth = getAuth();
	ensureSessionLoaded();

	$effect(() => {
		if (!auth.loading && (!auth.session || !auth.session.isAdmin)) {
			void goto('/browse');
		}
	});

	type Tab = 'trucks' | 'reviews';
	let activeTab = $state<Tab>('trucks');

	let trucks = $state<AdminTruck[]>([]);
	let trucksLoaded = $state(false);
	let busyTruckId = $state<string | null>(null);

	async function loadTrucks() {
		const res = await client.api.admin.trucks.$get();
		if (res.ok) trucks = await res.json();
		trucksLoaded = true;
	}

	async function toggleVerified(truck: AdminTruck) {
		busyTruckId = truck.id;
		try {
			const endpoint = truck.verified
				? client.api.admin.trucks[':id'].unverify
				: client.api.admin.trucks[':id'].verify;
			const res = await endpoint.$post({ param: { id: truck.id } });
			if (res.ok) {
				trucks = trucks.map((t) => (t.id === truck.id ? { ...t, verified: !t.verified } : t));
			}
		} finally {
			busyTruckId = null;
		}
	}

	let reviews = $state<AdminReview[]>([]);
	let reviewsLoaded = $state(false);
	let busyReviewId = $state<string | null>(null);

	async function loadReviews() {
		const res = await client.api.admin.reviews.$get();
		if (res.ok) reviews = await res.json();
		reviewsLoaded = true;
	}

	async function toggleHidden(review: AdminReview) {
		busyReviewId = review.id;
		try {
			const endpoint = review.hiddenAt
				? client.api.admin.reviews[':id'].unhide
				: client.api.admin.reviews[':id'].hide;
			const res = await endpoint.$post({ param: { id: review.id } });
			if (res.ok) {
				reviews = reviews.map((r) =>
					r.id === review.id ? { ...r, hiddenAt: r.hiddenAt ? null : new Date().toISOString() } : r,
				);
			}
		} finally {
			busyReviewId = null;
		}
	}

	async function ignoreFlag(review: AdminReview) {
		busyReviewId = review.id;
		try {
			const res = await client.api.admin.reviews[':id']['ignore-flag'].$post({
				param: { id: review.id },
			});
			if (res.ok) reviews = reviews.map((r) => (r.id === review.id ? { ...r, flaggedAt: null } : r));
		} finally {
			busyReviewId = null;
		}
	}

	async function deleteReview(review: AdminReview) {
		if (!confirm(`Permanently delete this review from ${review.customerName}? This can't be undone.`)) {
			return;
		}
		busyReviewId = review.id;
		try {
			const res = await client.api.admin.reviews[':id'].$delete({ param: { id: review.id } });
			if (res.ok) reviews = reviews.filter((r) => r.id !== review.id);
		} finally {
			busyReviewId = null;
		}
	}

	$effect(() => {
		if (auth.session?.isAdmin && !trucksLoaded) loadTrucks();
	});
	$effect(() => {
		if (auth.session?.isAdmin && !reviewsLoaded) loadReviews();
	});
</script>

<svelte:head><title>Admin — Little Food Truck</title></svelte:head>

{#if auth.session?.isAdmin}
	<h1 class="mb-4 text-xl font-bold">Admin</h1>

	<div class="mb-6 flex gap-1 border-b border-stone-200">
		<button
			type="button"
			class="flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
			'trucks'
				? 'border-orange-600 text-orange-600'
				: 'border-transparent text-stone-500 hover:text-stone-700'}"
			onclick={() => (activeTab = 'trucks')}
		>
			<TruckIcon size={16} weight="bold" /> Trucks
			{#if trucks.length > 0}<span class="text-xs text-stone-400">{trucks.length}</span>{/if}
		</button>
		<button
			type="button"
			class="flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
			'reviews'
				? 'border-orange-600 text-orange-600'
				: 'border-transparent text-stone-500 hover:text-stone-700'}"
			onclick={() => (activeTab = 'reviews')}
		>
			<Star size={16} weight="bold" /> Reviews
			{#if reviews.length > 0}<span class="text-xs text-stone-400">{reviews.length}</span>{/if}
		</button>
	</div>

	{#if activeTab === 'trucks'}
		{#if !trucksLoaded}
			<p class="text-stone-400">Loading…</p>
		{:else if trucks.length === 0}
			<p class="text-stone-400">No trucks yet.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each trucks as truck (truck.id)}
					<li class="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-orange-600"
						>
							{#if truck.photoUrl}
								<img src={resolveUploadUrl(truck.photoUrl)} alt="" class="h-full w-full object-cover" />
							{:else}
								<TruckIcon size={22} weight="fill" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-1.5">
								<span class="truncate font-medium">{truck.name}</span>
								{#if truck.verified}
									<SealCheck size={16} weight="fill" class="shrink-0 text-blue-500" />
								{/if}
							</div>
							<p class="truncate text-sm text-stone-500">
								{truck.cuisine} · {truck.ownerEmail}
							</p>
							<p class="text-sm text-stone-500">
								{truck.favoriteCount} favorites
								{#if truck.averageRating != null}
									· {truck.averageRating.toFixed(1)}★ ({truck.reviewCount})
								{:else}
									· No reviews
								{/if}
							</p>
						</div>
						<button
							disabled={busyTruckId === truck.id}
							class="shrink-0 rounded border px-3 py-1.5 text-sm disabled:opacity-50 {truck.verified
								? 'border-stone-300 text-stone-600 hover:bg-stone-100'
								: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'}"
							onclick={() => toggleVerified(truck)}
						>
							{truck.verified ? 'Unverify' : 'Verify'}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if activeTab === 'reviews'}
		{#if !reviewsLoaded}
			<p class="text-stone-400">Loading…</p>
		{:else if reviews.length === 0}
			<p class="text-stone-400">No reviews yet.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each reviews as review (review.id)}
					<li
						class="rounded-lg border bg-white p-3 {review.flaggedAt
							? 'border-orange-300 bg-orange-50/40'
							: review.hiddenAt
								? 'border-red-200 bg-red-50/40'
								: 'border-stone-200'}"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-medium">{review.customerName}</span>
									<span class="text-sm text-stone-400">on {review.truckName}</span>
									{#if review.flaggedAt}
										<span class="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
											<Flag size={11} weight="fill" /> Flagged
										</span>
									{/if}
									{#if review.hiddenAt}
										<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Hidden</span>
									{/if}
								</div>
								<span class="flex items-center gap-0.5 text-amber-500">
									{#each [1, 2, 3, 4, 5] as n (n)}
										<Star size={13} weight={n <= review.rating ? 'fill' : 'regular'} />
									{/each}
								</span>
								{#if review.comment}
									<p class="mt-1 text-sm text-stone-700">{review.comment}</p>
								{/if}
							</div>
							<div class="flex shrink-0 flex-col items-stretch gap-1.5">
								{#if review.flaggedAt}
									<button
										disabled={busyReviewId === review.id}
										class="flex items-center justify-center gap-1.5 rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
										onclick={() => ignoreFlag(review)}
									>
										<X size={14} weight="bold" /> Ignore flag
									</button>
								{/if}
								<button
									disabled={busyReviewId === review.id}
									class="flex items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-sm disabled:opacity-50 {review.hiddenAt
										? 'border-stone-300 text-stone-600 hover:bg-stone-100'
										: 'border-red-300 text-red-700 hover:bg-red-50'}"
									onclick={() => toggleHidden(review)}
								>
									{#if review.hiddenAt}
										<Eye size={14} weight="bold" /> Unhide
									{:else}
										<EyeSlash size={14} weight="bold" /> Hide
									{/if}
								</button>
								<button
									disabled={busyReviewId === review.id}
									class="flex items-center justify-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
									onclick={() => deleteReview(review)}
								>
									<Trash size={14} weight="bold" /> Delete
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
{/if}
