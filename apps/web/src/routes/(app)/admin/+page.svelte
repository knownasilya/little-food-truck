<script lang="ts">
	import type { AdminClaimRequest, AdminReview, AdminTruck, CuisineType, UsStateCode } from '@little-food-truck/shared';
	import { US_STATES } from '@little-food-truck/shared';
	import { goto } from '$app/navigation';
	import { client, resolveUploadUrl } from '$lib/api';
	import { ensureSessionLoaded, getAuth } from '$lib/auth.svelte';
	import {
		Check,
		Copy,
		Envelope,
		Eye,
		EyeSlash,
		FileText,
		Flag,
		Plus,
		SealCheck,
		Star,
		Trash,
		Truck as TruckIcon,
		X
	} from 'phosphor-svelte';

	const cuisines: CuisineType[] = [
		'american',
		'mexican',
		'asian',
		'bbq',
		'dessert',
		'coffee',
		'vegan',
		'seafood',
		'other'
	];

	const auth = getAuth();
	ensureSessionLoaded();

	$effect(() => {
		if (!auth.loading && (!auth.session || !auth.session.isAdmin)) {
			void goto('/browse');
		}
	});

	type Tab = 'trucks' | 'claims' | 'reviews';
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

	let showAddTruck = $state(false);
	let newTruckName = $state('');
	let newTruckCuisine = $state<CuisineType>('other');
	let newTruckCity = $state('');
	let newTruckState = $state<UsStateCode | ''>('');
	let newTruckOwnerEmail = $state('');
	let addingTruck = $state(false);
	let addTruckError = $state<string | null>(null);
	let lastClaimUrl = $state<string | null>(null);
	let lastClaimEmailed = $state(false);

	async function addTruck(e: SubmitEvent) {
		e.preventDefault();
		addTruckError = null;
		addingTruck = true;
		try {
			const res = await client.api.admin.trucks.$post({
				json: {
					name: newTruckName,
					cuisine: newTruckCuisine,
					description: newTruckCity ? `Usually found around ${newTruckCity}.` : undefined,
					ownerEmail: newTruckOwnerEmail || undefined,
					state: newTruckState || undefined
				}
			});
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				throw new Error((body && 'message' in body && String(body.message)) || 'Could not add truck');
			}
			const body = await res.json();
			lastClaimUrl = body.claimUrl;
			lastClaimEmailed = body.emailed;
			newTruckName = '';
			newTruckCity = '';
			newTruckState = '';
			newTruckOwnerEmail = '';
			newTruckCuisine = 'other';
			trucksLoaded = false;
			await loadTrucks();
		} catch (err) {
			addTruckError = err instanceof Error ? err.message : 'Could not add truck';
		} finally {
			addingTruck = false;
		}
	}

	async function copyClaimLink(url: string) {
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			// Clipboard access can be blocked (permissions, non-HTTPS) —
			// the link is still shown inline, so this failing silently is fine.
		}
	}

	async function resendClaim(truck: AdminTruck) {
		busyTruckId = truck.id;
		try {
			const res = await client.api.admin.trucks[':id']['resend-claim'].$post({
				param: { id: truck.id }
			});
			if (res.ok) {
				const body = await res.json();
				lastClaimUrl = body.claimUrl;
				lastClaimEmailed = body.emailed;
				trucksLoaded = false;
				await loadTrucks();
			}
		} finally {
			busyTruckId = null;
		}
	}

	let claimRequests = $state<AdminClaimRequest[]>([]);
	let claimRequestsLoaded = $state(false);
	let busyClaimRequestId = $state<string | null>(null);
	let lastFinishUrl = $state<string | null>(null);
	let lastFinishEmailed = $state(false);

	async function loadClaimRequests() {
		const res = await client.api.admin['claim-requests'].$get();
		if (res.ok) claimRequests = await res.json();
		claimRequestsLoaded = true;
	}

	async function approveClaimRequest(request: AdminClaimRequest) {
		busyClaimRequestId = request.id;
		try {
			const res = await client.api.admin['claim-requests'][':id'].approve.$post({
				param: { id: request.id }
			});
			if (res.ok) {
				const body = await res.json();
				lastFinishUrl = body.finishUrl;
				lastFinishEmailed = body.emailed;
				claimRequestsLoaded = false;
				trucksLoaded = false;
				await Promise.all([loadClaimRequests(), loadTrucks()]);
			}
		} finally {
			busyClaimRequestId = null;
		}
	}

	async function denyClaimRequest(request: AdminClaimRequest) {
		if (!confirm(`Deny ${request.requesterName}'s request to claim ${request.truckName}?`)) return;
		busyClaimRequestId = request.id;
		try {
			const res = await client.api.admin['claim-requests'][':id'].deny.$post({
				param: { id: request.id }
			});
			if (res.ok) {
				claimRequests = claimRequests.map((r) =>
					r.id === request.id ? { ...r, status: 'denied', decidedAt: new Date().toISOString() } : r,
				);
			}
		} finally {
			busyClaimRequestId = null;
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
		if (auth.session?.isAdmin && !claimRequestsLoaded) loadClaimRequests();
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
			'claims'
				? 'border-orange-600 text-orange-600'
				: 'border-transparent text-stone-500 hover:text-stone-700'}"
			onclick={() => (activeTab = 'claims')}
		>
			<FileText size={16} weight="bold" /> Claim requests
			{#if claimRequests.filter((r) => r.status === 'pending').length > 0}
				<span class="rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">
					{claimRequests.filter((r) => r.status === 'pending').length}
				</span>
			{/if}
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
		<div class="mb-4 flex items-center justify-between">
			<button
				type="button"
				class="flex items-center gap-1.5 rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
				onclick={() => (showAddTruck = !showAddTruck)}
			>
				<Plus size={14} weight="bold" />
				{showAddTruck ? 'Cancel' : 'Add truck'}
			</button>
		</div>

		{#if showAddTruck}
			<form
				class="mb-4 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-3"
				onsubmit={addTruck}
			>
				<p class="text-sm text-stone-500">
					Creates an unclaimed listing. Whoever gets this link submits a claim request with proof
					of ownership (a seller's permit or business license) — you approve or deny it under
					"Claim requests" before they get real access. Sent by email now if you give one below,
					otherwise you'll get a link here to share yourself.
				</p>
				<input
					type="text"
					placeholder="Truck name"
					bind:value={newTruckName}
					required
					class="rounded border border-stone-300 px-3 py-2"
				/>
				<select
					bind:value={newTruckCuisine}
					aria-label="Cuisine"
					class="rounded border border-stone-300 px-3 py-2"
				>
					{#each cuisines as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
				<input
					type="text"
					placeholder="City / area (optional)"
					bind:value={newTruckCity}
					class="rounded border border-stone-300 px-3 py-2"
				/>
				<select
					bind:value={newTruckState}
					aria-label="State"
					class="rounded border border-stone-300 px-3 py-2"
				>
					<option value="">State (optional)</option>
					{#each US_STATES as s (s.code)}
						<option value={s.code}>{s.name}</option>
					{/each}
				</select>
				<input
					type="email"
					placeholder="Owner email (optional — emails them the claim link)"
					bind:value={newTruckOwnerEmail}
					class="rounded border border-stone-300 px-3 py-2"
				/>
				{#if addTruckError}
					<p class="text-sm text-red-600">{addTruckError}</p>
				{/if}
				<button
					type="submit"
					disabled={addingTruck}
					class="rounded bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
				>
					{addingTruck ? 'Adding…' : 'Add unclaimed truck'}
				</button>
			</form>
		{/if}

		{#if lastClaimUrl}
			<div class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
				{#if lastClaimEmailed}
					<Envelope size={16} weight="bold" class="shrink-0" />
					<span>Claim link emailed to the owner.</span>
				{:else}
					<span class="min-w-0 flex-1 truncate">Claim link: {lastClaimUrl}</span>
					<button
						type="button"
						class="flex shrink-0 items-center gap-1 rounded border border-blue-300 px-2 py-1 hover:bg-blue-100"
						onclick={() => lastClaimUrl && copyClaimLink(lastClaimUrl)}
					>
						<Copy size={13} weight="bold" /> Copy
					</button>
				{/if}
				<button type="button" class="shrink-0 text-blue-400 hover:text-blue-600" onclick={() => (lastClaimUrl = null)}>
					<X size={14} weight="bold" />
				</button>
			</div>
		{/if}

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
								{#if !truck.claimed}
									<span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
										Unclaimed
									</span>
								{/if}
								{#if truck.pendingRequestCount > 0}
									<button
										type="button"
										class="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200"
										onclick={() => (activeTab = 'claims')}
									>
										{truck.pendingRequestCount} pending request{truck.pendingRequestCount === 1 ? '' : 's'}
									</button>
								{/if}
							</div>
							{#if truck.claimed}
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
							{:else}
								<p class="truncate text-sm text-stone-500">
									{truck.cuisine}
									{#if truck.claimEmail}
										· invited: {truck.claimEmail}
									{/if}
								</p>
								{#if truck.claimUrl}
									<p class="truncate text-xs text-stone-400">{truck.claimUrl}</p>
								{/if}
							{/if}
						</div>
						<div class="flex shrink-0 flex-col items-stretch gap-1.5">
							{#if !truck.claimed}
								<div class="flex gap-1.5">
									{#if truck.claimUrl}
										<button
											type="button"
											class="flex items-center gap-1 rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
											onclick={() => truck.claimUrl && copyClaimLink(truck.claimUrl)}
										>
											<Copy size={13} weight="bold" />
										</button>
									{/if}
									<button
										type="button"
										disabled={busyTruckId === truck.id}
										class="flex items-center gap-1 rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50"
										onclick={() => resendClaim(truck)}
									>
										{truck.claimEmail ? 'Resend' : 'New link'}
									</button>
								</div>
							{/if}
							<button
								disabled={busyTruckId === truck.id}
								class="shrink-0 rounded border px-3 py-1.5 text-sm disabled:opacity-50 {truck.verified
									? 'border-stone-300 text-stone-600 hover:bg-stone-100'
									: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'}"
								onclick={() => toggleVerified(truck)}
							>
								{truck.verified ? 'Unverify' : 'Verify'}
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if activeTab === 'claims'}
		{#if lastFinishUrl}
			<div class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
				{#if lastFinishEmailed}
					<Envelope size={16} weight="bold" class="shrink-0" />
					<span>Approved — a "set your password" link was emailed to the requester.</span>
				{:else}
					<span class="min-w-0 flex-1 truncate">Approved — set-password link: {lastFinishUrl}</span>
					<button
						type="button"
						class="flex shrink-0 items-center gap-1 rounded border border-blue-300 px-2 py-1 hover:bg-blue-100"
						onclick={() => lastFinishUrl && copyClaimLink(lastFinishUrl)}
					>
						<Copy size={13} weight="bold" /> Copy
					</button>
				{/if}
				<button type="button" class="shrink-0 text-blue-400 hover:text-blue-600" onclick={() => (lastFinishUrl = null)}>
					<X size={14} weight="bold" />
				</button>
			</div>
		{/if}

		{#if !claimRequestsLoaded}
			<p class="text-stone-400">Loading…</p>
		{:else if claimRequests.length === 0}
			<p class="text-stone-400">No claim requests yet.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each claimRequests as request (request.id)}
					<li
						class="rounded-lg border bg-white p-3 {request.status === 'pending'
							? 'border-amber-200 bg-amber-50/40'
							: request.status === 'denied'
								? 'border-red-200 bg-red-50/40'
								: 'border-stone-200'}"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-medium">{request.requesterName}</span>
									<span class="text-sm text-stone-400">wants {request.truckName}</span>
									{#if request.status === 'approved'}
										<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Approved</span>
									{:else if request.status === 'denied'}
										<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Denied</span>
									{/if}
								</div>
								<p class="text-sm text-stone-500">
									{request.requesterEmail}{#if request.requesterPhone}
										· {request.requesterPhone}
									{/if}
								</p>
								{#if request.message}
									<p class="mt-1 text-sm text-stone-700">{request.message}</p>
								{/if}
								{#if request.proofDocumentUrl}
									<a
										href={request.proofDocumentUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="mt-1 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
									>
										<FileText size={14} weight="bold" /> View proof document
									</a>
								{:else}
									<p class="mt-1 text-sm text-stone-400">Proof document unavailable</p>
								{/if}
							</div>
							{#if request.status === 'pending'}
								<div class="flex shrink-0 flex-col items-stretch gap-1.5">
									<button
										disabled={busyClaimRequestId === request.id}
										class="flex items-center justify-center gap-1.5 rounded border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 disabled:opacity-50"
										onclick={() => approveClaimRequest(request)}
									>
										<Check size={14} weight="bold" /> Approve
									</button>
									<button
										disabled={busyClaimRequestId === request.id}
										class="flex items-center justify-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
										onclick={() => denyClaimRequest(request)}
									>
										<X size={14} weight="bold" /> Deny
									</button>
								</div>
							{/if}
						</div>
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
