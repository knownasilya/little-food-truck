<script lang="ts">
	import { DAY_NAMES, type ReviewRecord, type TruckDetail } from '@little-food-truck/shared';
	import { page } from '$app/state';
	import { apiBaseUrl, client, resolveUploadUrl } from '$lib/api';
	import { getAuth } from '$lib/auth.svelte';
	import { formatTime12h } from '$lib/time';
	import TruckMap from '$lib/components/TruckMap.svelte';
	import {
		CalendarBlank,
		Check,
		ForkKnife,
		Globe,
		Heart,
		LinkSimple,
		MapPin,
		Megaphone,
		PaperPlaneTilt,
		Phone,
		SealCheck,
		Star,
		Timer,
		X
	} from 'phosphor-svelte';

	type Tab = 'updates' | 'menu' | 'schedule' | 'reviews';

	const auth = getAuth();
	const truckId = page.params.id as string;

	let truck = $state<TruckDetail | null>(null);
	let reviews = $state<ReviewRecord[]>([]);
	let favorited = $state(false);
	let notFound = $state(false);
	let activeTab = $state<Tab>('updates');
	let tabInitialized = false;
	let linkCopied = $state(false);
	let shareUrlFallback = $state<string | null>(null);
	let showLocationMap = $state(false);
	let menuSearch = $state('');

	const filteredMenu = $derived.by(() => {
		if (!truck) return [];
		const q = menuSearch.trim().toLowerCase();
		if (!q) return truck.menu;
		return truck.menu.filter(
			(item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
		);
	});

	// The share link is served by the API, not the SPA — see
	// apps/api/src/routes/share.ts. Unlike the SPA (adapter-static, no
	// runtime server), the API can render a real, always-current Open Graph
	// preview for any truck, including ones created seconds ago. In
	// production apiBaseUrl is "" (same origin — the API serves this app
	// itself), so the shareable link needs the page's own origin instead;
	// in local dev apiBaseUrl is already the API's own absolute URL, which
	// is genuinely a different origin from the web dev server.
	const shareUrl = `${apiBaseUrl || window.location.origin}/t/${truckId}`;

	async function copyShareLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			linkCopied = true;
			setTimeout(() => (linkCopied = false), 2000);
		} catch {
			// Clipboard access can be blocked (permissions, non-HTTPS, some
			// embedded webviews) — fall back to a selectable link instead of
			// window.prompt, which isn't available in every context either.
			shareUrlFallback = shareUrl;
		}
	}

	let rating = $state(5);
	let comment = $state('');
	let submitting = $state(false);

	let showCateringForm = $state(false);
	let cateringName = $state('');
	let cateringEmail = $state('');
	let cateringEventDate = $state('');
	let cateringGuestCount = $state('');
	let cateringDetails = $state('');
	let cateringSubmitting = $state(false);
	let cateringSubmitted = $state(false);

	async function load() {
		const [truckRes, reviewsRes] = await Promise.all([
			client.api.trucks[':id'].$get({ param: { id: truckId } }),
			client.api.trucks[':id'].reviews.$get({ param: { id: truckId } }),
		]);
		if (!truckRes.ok) {
			notFound = true;
			return;
		}
		truck = await truckRes.json();
		reviews = reviewsRes.ok ? await reviewsRes.json() : [];

		// Land on whichever tab actually has something to show, checked once
		// on first load — don't yank the user back after that.
		if (!tabInitialized) {
			if (truck.posts.length > 0) activeTab = 'updates';
			else if (truck.menu.length > 0) activeTab = 'menu';
			else if (truck.schedule.length > 0) activeTab = 'schedule';
			else activeTab = 'reviews';
			tabInitialized = true;
		}

		if (auth.session?.role === 'customer') {
			const favRes = await client.api.me.favorites.$get();
			if (favRes.ok) {
				const favs = await favRes.json();
				favorited = favs.some((t) => t.id === truckId);
			}
		}
	}

	async function toggleFavorite() {
		if (favorited) {
			await client.api.trucks[':id'].favorite.$delete({ param: { id: truckId } });
		} else {
			await client.api.trucks[':id'].favorite.$post({ param: { id: truckId } });
		}
		favorited = !favorited;
		await load();
	}

	async function submitReview(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		try {
			await client.api.trucks[':id'].reviews.$post({
				param: { id: truckId },
				json: { rating, comment },
			});
			comment = '';
			await load();
		} finally {
			submitting = false;
		}
	}

	async function submitCateringRequest(e: SubmitEvent) {
		e.preventDefault();
		cateringSubmitting = true;
		try {
			await client.api.trucks[':id']['catering-request'].$post({
				param: { id: truckId },
				json: {
					name: cateringName,
					email: cateringEmail,
					eventDate: cateringEventDate,
					...(cateringGuestCount ? { guestCount: Number(cateringGuestCount) } : {}),
					details: cateringDetails,
				},
			});
			cateringSubmitted = true;
			showCateringForm = false;
		} finally {
			cateringSubmitting = false;
		}
	}

	$effect(() => {
		load();
	});
</script>

<svelte:head><title>{truck?.name ?? 'Truck'} — Little Food Truck</title></svelte:head>

{#if notFound}
	<p class="text-stone-500">Truck not found.</p>
{:else if !truck}
	<p class="text-stone-400">Loading…</p>
{:else}
	{#if truck.photoUrl}
		<img
			src={resolveUploadUrl(truck.photoUrl)}
			alt=""
			class="mb-4 h-40 w-full rounded-lg object-cover sm:h-56"
		/>
	{/if}
	<div class="rounded-lg border border-stone-200 bg-white p-5">
		<div class="flex items-start justify-between gap-4">
			<div>
				<div class="flex items-center gap-1.5">
					<h1 class="text-2xl font-bold">{truck.name}</h1>
					{#if truck.verified}
						<SealCheck size={20} weight="fill" class="shrink-0 text-blue-500" aria-label="Verified" />
					{/if}
				</div>
				<p class="text-sm text-stone-500">{truck.cuisine}</p>
			</div>
			<span
				class="shrink-0 rounded-full px-3 py-1 text-sm font-medium {truck.isOpen
					? 'bg-green-100 text-green-700'
					: 'bg-stone-100 text-stone-500'}"
			>
				{truck.isOpen ? 'Open now' : 'Closed'}
			</span>
		</div>

		{#if truck.description}
			<p class="mt-3 text-stone-700">{truck.description}</p>
		{/if}

		{#if truck.website || truck.phone}
			<div class="mt-2 flex flex-wrap items-center gap-4 text-sm">
				{#if truck.website}
					<a
						href={truck.website}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-1 text-orange-600 hover:underline"
					>
						<Globe size={16} weight="bold" />
						{truck.website.replace(/^https?:\/\//, '')}
					</a>
				{/if}
				{#if truck.phone}
					<a href={`tel:${truck.phone}`} class="flex items-center gap-1 text-orange-600 hover:underline">
						<Phone size={16} weight="bold" />
						{truck.phone}
					</a>
				{/if}
			</div>
		{/if}

		<div class="mt-3 flex items-center gap-4 text-sm text-stone-500">
			<span class="flex items-center gap-1">
				<Heart size={16} weight="fill" /> {truck.favoriteCount} favorites
			</span>
			{#if truck.averageRating != null}
				<span class="flex items-center gap-1 text-amber-600">
					<Star size={16} weight="fill" /> {truck.averageRating.toFixed(1)} ({truck.reviewCount} reviews)
				</span>
			{/if}
			{#if truck.lat != null && truck.lng != null}
				<button
					type="button"
					class="flex items-center gap-1 hover:text-orange-600 hover:underline"
					onclick={() => (showLocationMap = true)}
				>
					<MapPin size={16} weight="fill" /> {truck.lat.toFixed(3)}, {truck.lng.toFixed(3)}
				</button>
			{/if}
			{#if truck.isOpen && truck.waitMinutes != null}
				<span class="flex items-center gap-1 font-medium text-stone-700">
					<Timer size={16} weight="fill" /> ~{truck.waitMinutes} min wait
				</span>
			{/if}
		</div>

		<div class="mt-4 flex flex-wrap gap-2">
			{#if auth.session?.role === 'customer'}
				<button
					class="flex items-center gap-1.5 rounded border border-orange-300 px-4 py-2 text-orange-700 hover:bg-orange-50"
					onclick={toggleFavorite}
				>
					<Heart size={18} weight={favorited ? 'fill' : 'regular'} />
					{favorited ? 'Favorited' : 'Add to favorites'}
				</button>
			{/if}
			{#if auth.session?.role !== 'truck'}
				<button
					class="flex items-center gap-1.5 rounded border border-stone-300 px-4 py-2 text-stone-700 hover:bg-stone-100"
					onclick={() => (showCateringForm = !showCateringForm)}
				>
					<PaperPlaneTilt size={18} /> Request catering
				</button>
			{/if}
			<button
				class="flex items-center gap-1.5 rounded border border-stone-300 px-4 py-2 text-stone-700 hover:bg-stone-100"
				onclick={copyShareLink}
			>
				{#if linkCopied}
					<Check size={18} weight="bold" class="text-green-600" /> Link copied
				{:else}
					<LinkSimple size={18} /> Share
				{/if}
			</button>
		</div>

		{#if shareUrlFallback}
			<div class="mt-2 flex items-center gap-2">
				<input
					readonly
					value={shareUrlFallback}
					onclick={(e) => e.currentTarget.select()}
					class="flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-600"
				/>
				<button class="text-sm text-stone-400 hover:text-stone-600" onclick={() => (shareUrlFallback = null)}>
					Dismiss
				</button>
			</div>
		{/if}

		{#if cateringSubmitted}
			<p class="mt-3 rounded bg-green-50 p-3 text-sm text-green-700">
				Request sent! {truck.name} will reach out at the email you gave.
			</p>
		{:else if showCateringForm}
			<form class="mt-3 flex flex-col gap-2 rounded border border-stone-200 p-3" onsubmit={submitCateringRequest}>
				<div class="flex gap-2">
					<input
						bind:value={cateringName}
						placeholder="Your name"
						required
						class="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
					/>
					<input
						type="email"
						bind:value={cateringEmail}
						placeholder="Email"
						required
						class="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
					/>
				</div>
				<div class="flex gap-2">
					<input
						type="date"
						bind:value={cateringEventDate}
						required
						class="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
					/>
					<input
						type="number"
						min="1"
						bind:value={cateringGuestCount}
						placeholder="Guests (optional)"
						class="w-40 rounded border border-stone-300 px-3 py-2 text-sm"
					/>
				</div>
				<textarea
					bind:value={cateringDetails}
					placeholder="Tell them about your event…"
					rows="2"
					class="rounded border border-stone-300 px-3 py-2 text-sm"
				></textarea>
				<button
					type="submit"
					disabled={cateringSubmitting}
					class="self-start rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
				>
					{cateringSubmitting ? 'Sending…' : 'Send request'}
				</button>
			</form>
		{/if}
	</div>

	{#if showLocationMap && truck.lat != null && truck.lng != null}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div class="flex w-full max-w-lg flex-col gap-3 rounded-lg bg-white p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 font-semibold">
						{truck.name}
						<span
							class="rounded-full px-2 py-0.5 text-xs font-medium {truck.isOpen
								? 'bg-green-100 text-green-700'
								: 'bg-stone-100 text-stone-500'}"
						>
							{truck.isOpen ? 'Open now' : 'Closed'}
						</span>
					</div>
					<button
						class="text-stone-400 hover:text-stone-600"
						aria-label="Close"
						onclick={() => (showLocationMap = false)}
					>
						<X size={20} weight="bold" />
					</button>
				</div>
				<TruckMap trucks={[truck]} height="50vh" />
			</div>
		</div>
	{/if}

	{#if truck.photos.length > 0}
		<div class="mt-6 flex gap-2 overflow-x-auto pb-1">
			{#each truck.photos as photo (photo.id)}
				<img
					src={resolveUploadUrl(photo.url)}
					alt=""
					class="h-32 w-32 shrink-0 rounded-lg object-cover"
				/>
			{/each}
		</div>
	{/if}

	<div class="mt-8">
		<div class="flex gap-1 overflow-x-auto border-b border-stone-200">
			<button
				type="button"
				class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
				'updates'
					? 'border-orange-600 text-orange-600'
					: 'border-transparent text-stone-500 hover:text-stone-700'}"
				onclick={() => (activeTab = 'updates')}
			>
				<Megaphone size={16} weight="bold" /> Updates
				{#if truck.posts.length > 0}<span class="text-xs text-stone-400">{truck.posts.length}</span>{/if}
			</button>
			<button
				type="button"
				class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
				'menu'
					? 'border-orange-600 text-orange-600'
					: 'border-transparent text-stone-500 hover:text-stone-700'}"
				onclick={() => (activeTab = 'menu')}
			>
				<ForkKnife size={16} weight="bold" /> Menu
				{#if truck.menu.length > 0}<span class="text-xs text-stone-400">{truck.menu.length}</span>{/if}
			</button>
			<button
				type="button"
				class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
				'schedule'
					? 'border-orange-600 text-orange-600'
					: 'border-transparent text-stone-500 hover:text-stone-700'}"
				onclick={() => (activeTab = 'schedule')}
			>
				<CalendarBlank size={16} weight="bold" /> Schedule
			</button>
			<button
				type="button"
				class="flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium {activeTab ===
				'reviews'
					? 'border-orange-600 text-orange-600'
					: 'border-transparent text-stone-500 hover:text-stone-700'}"
				onclick={() => (activeTab = 'reviews')}
			>
				<Star size={16} weight="bold" /> Reviews
				{#if truck.reviewCount > 0}<span class="text-xs text-stone-400">{truck.reviewCount}</span>{/if}
			</button>
		</div>

		<div class="mt-4">
			{#if activeTab === 'updates'}
				{#if truck.posts.length === 0}
					<p class="text-stone-400">No updates posted yet.</p>
				{:else}
					<ul class="flex flex-col gap-3">
						{#each truck.posts as post (post.id)}
							<li class="rounded-lg border border-stone-200 bg-white p-4">
								<p class="text-stone-700">{post.message}</p>
								{#if post.photoUrl}
									<img src={resolveUploadUrl(post.photoUrl)} alt="" class="mt-2 max-h-48 rounded-lg" />
								{/if}
								<p class="mt-1 text-xs text-stone-400">{new Date(post.createdAt).toLocaleString()}</p>
							</li>
						{/each}
					</ul>
				{/if}
			{:else if activeTab === 'menu'}
				{#if truck.menu.length === 0}
					<p class="text-stone-400">No menu items yet.</p>
				{:else}
					<input
						bind:value={menuSearch}
						type="search"
						placeholder="Search menu…"
						class="mb-3 w-full rounded border border-stone-300 px-3 py-2 text-sm"
					/>
					{#if filteredMenu.length === 0}
						<p class="text-stone-400">No menu items match "{menuSearch}".</p>
					{/if}
					<ul class="flex flex-col gap-2">
						{#each filteredMenu as item (item.id)}
							<li class="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
								{#if item.photoUrl}
									<img
										src={resolveUploadUrl(item.photoUrl)}
										alt=""
										class="h-14 w-14 shrink-0 rounded object-cover"
									/>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="flex items-center justify-between gap-2">
										<span class="font-medium">{item.name}</span>
										{#if item.price}<span class="text-sm text-stone-500">{item.price}</span>{/if}
									</div>
									{#if item.description}
										<p class="text-sm text-stone-500">{item.description}</p>
									{/if}
									{#if item.dietaryTags.length > 0}
										<div class="mt-1 flex flex-wrap gap-1">
											{#each item.dietaryTags as tag (tag)}
												<span class="rounded-full bg-green-50 px-1.5 py-0.5 text-xs text-green-700">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			{:else if activeTab === 'schedule'}
				{#if truck.schedule.length === 0}
					<p class="text-stone-400">No regular schedule set yet.</p>
				{:else}
					{@const recurring = truck.schedule.filter((e) => !e.eventDate)}
					{@const special = truck.schedule
						.filter((e) => e.eventDate)
						.sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))}
					{#if special.length > 0}
						<h3 class="mb-1 text-sm font-semibold text-stone-700">Upcoming special events</h3>
						<ul class="mb-4 flex flex-col gap-2">
							{#each special as entry (entry.id)}
								<li class="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
									<strong>
										{new Date(`${entry.eventDate}T00:00:00`).toLocaleDateString(undefined, {
											weekday: 'short',
											month: 'short',
											day: 'numeric'
										})}
									</strong>
									{formatTime12h(entry.startTime)}–{formatTime12h(entry.endTime)} · {entry.locationLabel}
								</li>
							{/each}
						</ul>
					{/if}
					{#if recurring.length > 0}
						<h3 class="mb-1 text-sm font-semibold text-stone-700">Weekly schedule</h3>
						<ul class="flex flex-col gap-2">
							{#each recurring as entry (entry.id)}
								<li class="rounded-lg border border-stone-200 bg-white p-3 text-sm">
									<strong>{DAY_NAMES[entry.dayOfWeek]}</strong>
									{formatTime12h(entry.startTime)}–{formatTime12h(entry.endTime)} · {entry.locationLabel}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			{:else}
				{#if auth.session?.role === 'customer'}
					<form
						class="mb-4 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4"
						onsubmit={submitReview}
					>
						<div class="flex items-center gap-2">
							<span class="text-sm text-stone-500">Rating</span>
							{#each [1, 2, 3, 4, 5] as n (n)}
								<button
									type="button"
									class={n <= rating ? 'text-amber-500' : 'text-stone-300'}
									onclick={() => (rating = n)}
								>
									<Star size={22} weight={n <= rating ? 'fill' : 'regular'} />
								</button>
							{/each}
						</div>
						<textarea
							bind:value={comment}
							placeholder="Share your experience…"
							rows="2"
							class="rounded border border-stone-300 px-3 py-2"
						></textarea>
						<button
							type="submit"
							disabled={submitting}
							class="self-start rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
						>
							{submitting ? 'Saving…' : 'Post review'}
						</button>
					</form>
				{/if}

				{#if reviews.length === 0}
					<p class="text-stone-400">No reviews yet.</p>
				{:else}
					<ul class="flex flex-col gap-3">
						{#each reviews as review (review.id)}
							<li class="rounded-lg border border-stone-200 bg-white p-4">
								<div class="flex items-center justify-between">
									<span class="font-medium">{review.customerName}</span>
									<span class="flex items-center gap-0.5 text-amber-500">
										{#each [1, 2, 3, 4, 5] as n (n)}
											<Star size={14} weight={n <= review.rating ? 'fill' : 'regular'} />
										{/each}
									</span>
								</div>
								{#if review.comment}
									<p class="mt-1 text-stone-700">{review.comment}</p>
								{/if}
								{#if review.ownerReply}
									<div class="mt-2 rounded bg-stone-50 p-2 text-sm text-stone-600">
										<p class="text-xs font-medium text-stone-400">Reply from {truck.name}</p>
										<p>{review.ownerReply}</p>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	</div>
{/if}
