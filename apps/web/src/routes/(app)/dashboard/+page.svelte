<script lang="ts">
	import type {
		CateringRequestRecord,
		CuisineType,
		ReviewRecord,
		TruckDetail,
		UsStateCode
	} from '@little-food-truck/shared';
	import { US_STATES } from '@little-food-truck/shared';
	import { onMount } from 'svelte';
	import { client, resolveUploadUrl } from '$lib/api';
	import { getAuth, loadSession, uploadTruckCoverPhoto } from '$lib/auth.svelte';
	import { listTimezones } from '$lib/time';
	import { ArrowSquareOut, Camera, GpsFix, Truck as TruckIcon } from 'phosphor-svelte';
	import ImageCropModal from '$lib/components/ImageCropModal.svelte';
	import DashboardCatering from '$lib/components/dashboard/DashboardCatering.svelte';
	import DashboardMenu from '$lib/components/dashboard/DashboardMenu.svelte';
	import DashboardPhotos from '$lib/components/dashboard/DashboardPhotos.svelte';
	import DashboardPosts from '$lib/components/dashboard/DashboardPosts.svelte';
	import DashboardReviews from '$lib/components/dashboard/DashboardReviews.svelte';
	import DashboardSchedule from '$lib/components/dashboard/DashboardSchedule.svelte';

	const auth = getAuth();

	let detail = $state<TruckDetail | null>(null);
	let reviews = $state<ReviewRecord[]>([]);
	let cateringRequests = $state<CateringRequestRecord[]>([]);

	async function loadDetail() {
		if (auth.session?.role !== 'truck') return;
		const [detailRes, reviewsRes, cateringRes] = await Promise.all([
			client.api.trucks[':id'].$get({ param: { id: auth.session.id } }),
			client.api.trucks[':id'].reviews.$get({ param: { id: auth.session.id } }),
			client.api.me['catering-requests'].$get()
		]);
		if (detailRes.ok) detail = await detailRes.json();
		if (reviewsRes.ok) reviews = await reviewsRes.json();
		if (cateringRes.ok) cateringRequests = await cateringRes.json();
	}

	$effect(() => {
		if (auth.session?.role === 'truck') loadDetail();
	});

	const cuisines: CuisineType[] = [
		'american',
		'mexican',
		'asian',
		'bbq',
		'dessert',
		'coffee',
		'vegan',
		'seafood',
		'other',
	];
	const timezones = listTimezones();

	let name = $state('');
	let description = $state('');
	let cuisine = $state<CuisineType>('other');
	let timezone = $state('America/Chicago');
	let website = $state('');
	let phone = $state('');
	// Named stateCode, not state — "state" as a variable name collides with
	// Svelte's own $state rune in its compiler's scope analysis.
	let stateCode = $state<UsStateCode | ''>('');
	let savingProfile = $state(false);
	let updatingLocation = $state(false);
	let locationError = $state<string | null>(null);
	let hasLocationService = $state(true);
	let initialized = false;

	onMount(() => {
		// Best-effort capability check so the button can honestly say "Open
		// for business" instead of "I'm here" when there's no way to get a
		// live position — the Permissions API isn't supported everywhere, so
		// this defaults to assuming it's available and just lets the actual
		// getCurrentPosition() call fail at click time in that case.
		if (!('geolocation' in navigator)) {
			hasLocationService = false;
			return;
		}
		if (!navigator.permissions?.query) return;
		navigator.permissions
			.query({ name: 'geolocation' })
			.then((status) => {
				hasLocationService = status.state !== 'denied';
				status.onchange = () => {
					hasLocationService = status.state !== 'denied';
				};
			})
			.catch(() => {});
	});
	let waitMinutes = $state('');
	let savingWait = $state(false);
	let uploadingCoverPhoto = $state(false);
	let coverPhotoError = $state<string | null>(null);
	let croppingCoverPhoto = $state<File | null>(null);

	function onCoverPhotoChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		coverPhotoError = null;
		croppingCoverPhoto = file;
	}

	async function onCoverPhotoCropped(cropped: File) {
		croppingCoverPhoto = null;
		uploadingCoverPhoto = true;
		try {
			await uploadTruckCoverPhoto(cropped);
		} catch {
			coverPhotoError = 'Could not upload photo. Try a smaller image (max 5MB).';
		} finally {
			uploadingCoverPhoto = false;
		}
	}

	async function saveWaitTime(e: SubmitEvent) {
		e.preventDefault();
		savingWait = true;
		try {
			await client.api.me['wait-time'].$post({
				json: { waitMinutes: waitMinutes === '' ? null : Number(waitMinutes) }
			});
			await loadSession();
		} finally {
			savingWait = false;
		}
	}

	$effect(() => {
		const profile = auth.session?.truckProfile;
		if (profile && !initialized) {
			name = profile.name;
			description = profile.description;
			cuisine = profile.cuisine as CuisineType;
			timezone = profile.timezone;
			website = profile.website ?? '';
			phone = profile.phone ?? '';
			stateCode = (profile.state as UsStateCode | null) ?? '';
			waitMinutes = profile.waitMinutes != null ? String(profile.waitMinutes) : '';
			initialized = true;
		}
	});

	async function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		savingProfile = true;
		try {
			await client.api.me['truck-profile'].$patch({
				json: { name, description, cuisine, timezone, website, phone, state: stateCode },
			});
			await loadSession();
		} finally {
			savingProfile = false;
		}
	}

	async function postLocation(json: { lat?: number; lng?: number; isOpen: boolean }) {
		const res = await client.api.me.location.$post({ json });
		if (!res.ok) {
			const body = await res.json().catch(() => null);
			throw new Error(
				(body && 'message' in body && String(body.message)) || 'Could not update status.',
			);
		}
		await loadSession();
	}

	async function updateLocation(isOpen: boolean) {
		locationError = null;
		updatingLocation = true;
		try {
			// Closing doesn't need a fresh position — only opening does.
			// Requesting geolocation just to mark closed would needlessly
			// re-prompt for location permission every time.
			if (!isOpen) {
				await postLocation({ isOpen: false });
				return;
			}

			// With no location service available, skip straight to opening
			// without a live position — the API falls back to today's
			// schedule location or the truck's default location (see
			// lib/schedule-location.ts) instead of requiring GPS.
			if (!hasLocationService) {
				await postLocation({ isOpen: true });
				return;
			}

			try {
				const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
					navigator.geolocation.getCurrentPosition(resolve, reject),
				);
				await postLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, isOpen: true });
			} catch {
				// The up-front capability check said this should work but the
				// live request failed anyway (denied at the prompt, timed out,
				// ...) — fall back the same way as "no location service" rather
				// than just erroring, so opening still isn't blocked.
				await postLocation({ isOpen: true });
			}
		} catch (err) {
			locationError = err instanceof Error ? err.message : 'Could not update status.';
		} finally {
			updatingLocation = false;
		}
	}
</script>

<svelte:head><title>My truck — Little Food Truck</title></svelte:head>

<div class="mb-4 flex items-center justify-between gap-3">
	<h1 class="text-xl font-bold">My truck</h1>
	{#if auth.session}
		<a
			href={`/trucks/${auth.session.id}`}
			target="_blank"
			rel="noopener"
			class="flex shrink-0 items-center gap-1.5 rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
		>
			<ArrowSquareOut size={16} weight="bold" /> View public page
		</a>
	{/if}
</div>

{#if auth.session}
	<section class="mb-6 rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-2 font-semibold">Status</h2>
		<p class="mb-3 text-sm text-stone-500">
			Go open when you're set up and serving — favoriters within their watch radius get notified.
		</p>
		<div class="flex flex-wrap items-center gap-3">
			<button
				disabled={updatingLocation}
				class="flex items-center gap-1.5 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
				onclick={() => updateLocation(true)}
			>
				<GpsFix size={18} weight="bold" />
				{updatingLocation
					? 'Updating…'
					: hasLocationService
						? "I'm here — open for business"
						: 'Open for business'}
			</button>
			<button
				disabled={updatingLocation}
				class="rounded border border-stone-300 px-4 py-2 hover:bg-stone-100 disabled:opacity-50"
				onclick={() => updateLocation(false)}
			>
				Mark closed
			</button>
		</div>
		{#if locationError}
			<p class="mt-2 text-sm text-red-600">{locationError}</p>
		{/if}
		{#if auth.session.truckProfile}
			<p class="mt-3 text-sm text-stone-500">
				Currently {auth.session.truckProfile.isOpen ? 'open' : 'closed'}
				{#if auth.session.truckProfile.locationUpdatedAt}
					· last updated {new Date(auth.session.truckProfile.locationUpdatedAt).toLocaleString()}
				{/if}
				· {auth.session.truckProfile.viewCount} profile views
			</p>
		{/if}

		<form class="mt-3 flex items-end gap-2" onsubmit={saveWaitTime}>
			<label class="flex flex-col gap-1 text-sm">
				Current wait time (minutes)
				<input
					type="number"
					min="0"
					max="180"
					bind:value={waitMinutes}
					placeholder="e.g. 10"
					class="w-32 rounded border border-stone-300 px-3 py-2"
				/>
			</label>
			<button
				type="submit"
				disabled={savingWait}
				class="rounded border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-50"
			>
				{savingWait ? 'Saving…' : 'Update wait'}
			</button>
		</form>
		<p class="mt-1 text-xs text-stone-400">
			Shown to customers while you're open. Leave blank to hide it.
		</p>
	</section>

	<section class="mb-6 rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-3 font-semibold">Profile</h2>

		<div class="mb-4 flex items-center gap-4">
			<label
				class="group relative flex h-20 w-36 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-orange-50 text-orange-400"
			>
				{#if auth.session.truckProfile?.photoUrl}
					<img
						src={resolveUploadUrl(auth.session.truckProfile.photoUrl)}
						alt=""
						class="h-full w-full object-cover"
					/>
				{:else}
					<TruckIcon size={32} weight="fill" />
				{/if}
				<span
					class="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 {uploadingCoverPhoto
						? 'opacity-100'
						: ''}"
				>
					<Camera size={20} weight="bold" />
				</span>
				<input
					type="file"
					accept="image/png,image/jpeg,image/webp,image/gif"
					class="hidden"
					disabled={uploadingCoverPhoto}
					onchange={onCoverPhotoChange}
				/>
			</label>
			<div>
				<p class="text-sm font-medium">Cover photo</p>
				<p class="text-sm text-stone-500">
					{uploadingCoverPhoto ? 'Uploading…' : 'Shown on your truck card and public page.'}
				</p>
				{#if coverPhotoError}
					<p class="mt-1 text-sm text-red-600">{coverPhotoError}</p>
				{/if}
			</div>
		</div>

		{#if croppingCoverPhoto}
			<ImageCropModal
				file={croppingCoverPhoto}
				aspect={3}
				shape="rect"
				outputWidth={1200}
				outputHeight={400}
				onCancel={() => (croppingCoverPhoto = null)}
				onConfirm={onCoverPhotoCropped}
			/>
		{/if}

		<form class="flex flex-col gap-3" onsubmit={saveProfile}>
			<label class="flex flex-col gap-1 text-sm">
				Truck name
				<input bind:value={name} required class="rounded border border-stone-300 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Description
				<textarea bind:value={description} rows="3" class="rounded border border-stone-300 px-3 py-2"
				></textarea>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Cuisine
				<select bind:value={cuisine} class="rounded border border-stone-300 px-3 py-2">
					{#each cuisines as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Timezone
				<select bind:value={timezone} class="rounded border border-stone-300 px-3 py-2">
					{#each timezones as tz (tz)}
						<option value={tz}>{tz}</option>
					{/each}
				</select>
			</label>
			<p class="-mt-1 text-xs text-stone-400">
				The day/time you set on your weekly schedule is interpreted in this timezone.
			</p>
			<label class="flex flex-col gap-1 text-sm">
				Website
				<input
					type="text"
					bind:value={website}
					placeholder="yourtruck.com"
					class="rounded border border-stone-300 px-3 py-2"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Phone
				<input
					type="tel"
					bind:value={phone}
					placeholder="(512) 555-0100"
					class="rounded border border-stone-300 px-3 py-2"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				State
				<select bind:value={stateCode} class="rounded border border-stone-300 px-3 py-2">
					<option value="">Not set</option>
					{#each US_STATES as s (s.code)}
						<option value={s.code}>{s.name}</option>
					{/each}
				</select>
			</label>
			<p class="-mt-1 text-xs text-stone-400">Lets customers find you with Browse's state filter.</p>
			<button
				type="submit"
				disabled={savingProfile}
				class="self-start rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
			>
				{savingProfile ? 'Saving…' : 'Save profile'}
			</button>
		</form>
	</section>

	{#if detail}
		<div class="mb-6">
			<DashboardPhotos photos={detail.photos} onChange={loadDetail} />
		</div>
		<div class="mb-6">
			<DashboardMenu items={detail.menu} onChange={loadDetail} />
		</div>
		<div class="mb-6">
			<DashboardSchedule entries={detail.schedule} onChange={loadDetail} />
		</div>
		<div class="mb-6">
			<DashboardPosts posts={detail.posts} onChange={loadDetail} />
		</div>
		<div class="mb-6">
			<DashboardCatering requests={cateringRequests} onChange={loadDetail} />
		</div>
		<DashboardReviews {reviews} onChange={loadDetail} />
	{/if}
{/if}
