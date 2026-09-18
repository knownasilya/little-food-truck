<script lang="ts">
	import { DAY_NAMES, MAX_WATCH_LOCATIONS, type WatchLocationRecord } from '@little-food-truck/shared';
	import {
		addWatchLocation,
		deleteWatchLocation,
		getAuth,
		signOut,
		updateAccount,
		uploadAvatar
	} from '$lib/auth.svelte';
	import { client } from '$lib/api';
	import Avatar from '$lib/components/Avatar.svelte';
	import ImageCropModal from '$lib/components/ImageCropModal.svelte';
	import { getPushSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from '$lib/push';
	import { listTimezones } from '$lib/time';
	import { Bell, BellSlash, GpsFix, MapPin, SignOut, Trash } from 'phosphor-svelte';

	const auth = getAuth();
	const timezones = listTimezones();

	let pushSupported = isPushSupported();
	let pushSubscribed = $state(false);
	let pushBusy = $state(false);
	let pushError = $state<string | null>(null);

	let displayName = $state('');
	let timezone = $state('America/Chicago');
	let savingName = $state(false);
	let nameInitialized = false;

	let uploadingAvatar = $state(false);
	let avatarError = $state<string | null>(null);
	let croppingAvatar = $state<File | null>(null);

	let watchLocations = $state<WatchLocationRecord[]>([]);
	let locationsLoaded = $state(false);

	let newLabel = $state('');
	let newLat = $state<number | null>(null);
	let newLng = $state<number | null>(null);
	let newRadiusMiles = $state(5);
	let limitToWindow = $state(false);
	let newActiveDays = $state<number[]>([1, 2, 3, 4, 5]);
	let newStartTime = $state('09:00');
	let newEndTime = $state('17:00');
	let locating = $state(false);
	let locationError = $state<string | null>(null);
	let adding = $state(false);
	let addError = $state<string | null>(null);

	$effect(() => {
		if (auth.session && !nameInitialized) {
			displayName = auth.session.displayName;
			if (auth.session.customerProfile) timezone = auth.session.customerProfile.timezone;
			nameInitialized = true;
		}
	});

	async function loadWatchLocations() {
		const res = await client.api.me['watch-locations'].$get();
		if (res.ok) watchLocations = await res.json();
		locationsLoaded = true;
	}

	$effect(() => {
		if (auth.session?.role === 'customer' && !locationsLoaded) loadWatchLocations();
	});

	if (pushSupported) {
		getPushSubscription().then((sub) => (pushSubscribed = sub != null));
	}

	async function togglePush() {
		pushError = null;
		pushBusy = true;
		try {
			if (pushSubscribed) {
				await unsubscribeFromPush();
				pushSubscribed = false;
			} else {
				await subscribeToPush();
				pushSubscribed = true;
			}
		} catch (err) {
			pushError = err instanceof Error ? err.message : 'Could not update push notifications.';
		} finally {
			pushBusy = false;
		}
	}

	async function saveName(e: SubmitEvent) {
		e.preventDefault();
		savingName = true;
		try {
			await updateAccount({
				displayName,
				timezone: auth.session?.role === 'customer' ? timezone : undefined
			});
		} finally {
			savingName = false;
		}
	}

	function onAvatarChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		avatarError = null;
		croppingAvatar = file;
	}

	async function onAvatarCropped(cropped: File) {
		croppingAvatar = null;
		uploadingAvatar = true;
		try {
			await uploadAvatar(cropped);
		} catch {
			avatarError = 'Could not upload photo. Try a smaller image (max 5MB).';
		} finally {
			uploadingAvatar = false;
		}
	}

	function captureLocation() {
		locationError = null;
		if (!('geolocation' in navigator)) {
			locationError = 'Geolocation is not available in this browser.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				newLat = pos.coords.latitude;
				newLng = pos.coords.longitude;
				locating = false;
			},
			() => {
				locationError = 'Could not read your location. Check location permissions.';
				locating = false;
			}
		);
	}

	function toggleDay(day: number) {
		newActiveDays = newActiveDays.includes(day)
			? newActiveDays.filter((d) => d !== day)
			: [...newActiveDays, day].sort();
	}

	async function submitLocation(e: SubmitEvent) {
		e.preventDefault();
		if (newLat == null || newLng == null) {
			addError = 'Use the button above to set this location first.';
			return;
		}
		addError = null;
		adding = true;
		try {
			await addWatchLocation({
				label: newLabel,
				lat: newLat,
				lng: newLng,
				radiusMiles: newRadiusMiles,
				activeDays: limitToWindow ? newActiveDays : [],
				...(limitToWindow ? { startTime: newStartTime, endTime: newEndTime } : {})
			});
			newLabel = '';
			newLat = null;
			newLng = null;
			newRadiusMiles = 5;
			limitToWindow = false;
			await loadWatchLocations();
		} catch (err) {
			addError = err instanceof Error ? err.message : 'Could not save that location.';
		} finally {
			adding = false;
		}
	}

	async function removeLocation(id: string) {
		await deleteWatchLocation(id);
		watchLocations = watchLocations.filter((l) => l.id !== id);
	}

	function windowSummary(loc: WatchLocationRecord): string {
		if (loc.activeDays.length === 0 && !loc.startTime) return 'Always';
		const days =
			loc.activeDays.length === 0
				? 'Every day'
				: loc.activeDays.length === 7
					? 'Every day'
					: loc.activeDays.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
		const time = loc.startTime && loc.endTime ? `${loc.startTime}–${loc.endTime}` : 'All day';
		return `${days} · ${time}`;
	}
</script>

<svelte:head><title>Account — Little Food Truck</title></svelte:head>

<h1 class="mb-4 text-xl font-bold">Account</h1>

{#if auth.session}
	<section class="mb-6 rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-3 font-semibold">Profile photo</h2>
		<div class="flex items-center gap-4">
			<Avatar avatarUrl={auth.session.avatarUrl} size={72} />
			<label
				class="cursor-pointer rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
			>
				{uploadingAvatar ? 'Uploading…' : 'Change photo'}
				<input
					type="file"
					accept="image/png,image/jpeg,image/webp,image/gif"
					class="hidden"
					disabled={uploadingAvatar}
					onchange={onAvatarChange}
				/>
			</label>
		</div>
		{#if avatarError}
			<p class="mt-2 text-sm text-red-600">{avatarError}</p>
		{/if}

		{#if croppingAvatar}
			<ImageCropModal
				file={croppingAvatar}
				aspect={1}
				shape="circle"
				outputWidth={480}
				outputHeight={480}
				onCancel={() => (croppingAvatar = null)}
				onConfirm={onAvatarCropped}
			/>
		{/if}
	</section>

	<section class="mb-6 rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-3 font-semibold">Details</h2>
		<form class="flex flex-col gap-3" onsubmit={saveName}>
			<label class="flex flex-col gap-1 text-sm">
				Display name
				<input bind:value={displayName} required class="rounded border border-stone-300 px-3 py-2" />
			</label>
			<label class="flex flex-col gap-1 text-sm">
				Email
				<input
					value={auth.session.email}
					disabled
					class="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-stone-500"
				/>
			</label>
			{#if auth.session.role === 'customer'}
				<label class="flex flex-col gap-1 text-sm">
					Timezone
					<select bind:value={timezone} class="rounded border border-stone-300 px-3 py-2">
						{#each timezones as tz (tz)}
							<option value={tz}>{tz}</option>
						{/each}
					</select>
				</label>
				<p class="-mt-1 text-xs text-stone-400">
					The start/end times on your saved places are interpreted in this timezone.
				</p>
			{/if}
			<button
				type="submit"
				disabled={savingName}
				class="self-start rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
			>
				{savingName ? 'Saving…' : 'Save'}
			</button>
		</form>
	</section>

	{#if auth.session.role === 'customer'}
		<section class="mb-6 rounded-lg border border-stone-200 bg-white p-4">
			<h2 class="mb-2 font-semibold">Notifications</h2>
			<p class="mb-3 text-sm text-stone-500">
				We use this to tell you when a favorited truck is near one of your saved places.
			</p>

			{#if pushSupported}
				<button
					disabled={pushBusy}
					class="mb-3 flex w-full items-center justify-center gap-1.5 rounded border px-4 py-2 disabled:opacity-50 {pushSubscribed
						? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
						: 'border-stone-300 hover:bg-stone-100'}"
					onclick={togglePush}
				>
					{#if pushSubscribed}
						<Bell size={18} weight="fill" /> Push notifications on
					{:else}
						<BellSlash size={18} weight="bold" />
						{pushBusy ? 'Enabling…' : 'Enable push notifications'}
					{/if}
				</button>
				{#if pushError}
					<p class="mb-3 text-sm text-red-600">{pushError}</p>
				{/if}
			{:else}
				<p class="mb-3 text-sm text-stone-400">
					Push notifications aren't supported in this browser.
				</p>
			{/if}
		</section>

		<section class="mb-6 rounded-lg border border-stone-200 bg-white p-4">
			<h2 class="mb-1 font-semibold">Watch locations</h2>
			<p class="mb-3 text-sm text-stone-500">
				Get notified when a favorited truck opens near any of these — Home, Work, wherever. Up to
				{MAX_WATCH_LOCATIONS}.
			</p>

			{#if watchLocations.length > 0}
				<ul class="mb-4 flex flex-col gap-2">
					{#each watchLocations as loc (loc.id)}
						<li class="flex items-center justify-between gap-2 rounded border border-stone-200 p-3 text-sm">
							<div class="min-w-0">
								<div class="flex items-center gap-1.5 font-medium">
									<MapPin size={14} weight="bold" class="shrink-0 text-orange-500" />
									{loc.label}
								</div>
								<p class="text-stone-500">{loc.radiusMiles} mi radius · {windowSummary(loc)}</p>
							</div>
							<button
								class="shrink-0 text-red-600"
								aria-label={`Remove ${loc.label}`}
								onclick={() => removeLocation(loc.id)}
							>
								<Trash size={16} weight="bold" />
							</button>
						</li>
					{/each}
				</ul>
			{:else if locationsLoaded}
				<p class="mb-4 text-sm text-stone-400">No saved locations yet.</p>
			{/if}

			{#if watchLocations.length < MAX_WATCH_LOCATIONS}
				<form class="flex flex-col gap-3 rounded border border-dashed border-stone-300 p-3" onsubmit={submitLocation}>
					<input
						bind:value={newLabel}
						placeholder="Label (e.g. Home, Work)"
						required
						class="rounded border border-stone-300 px-3 py-2 text-sm"
					/>

					<button
						type="button"
						disabled={locating}
						class="flex items-center justify-center gap-1.5 rounded border px-4 py-2 text-sm disabled:opacity-50 {newLat !=
						null
							? 'border-green-300 bg-green-50 text-green-700'
							: 'border-orange-300 text-orange-700 hover:bg-orange-50'}"
						onclick={captureLocation}
					>
						<GpsFix size={16} weight="bold" />
						{#if locating}
							Locating…
						{:else if newLat != null}
							Location set ({newLat.toFixed(3)}, {newLng?.toFixed(3)}) — tap to update
						{:else}
							Use my current location
						{/if}
					</button>
					{#if locationError}
						<p class="text-sm text-red-600">{locationError}</p>
					{/if}

					<label class="flex flex-col gap-1 text-sm">
						Radius (miles)
						<input
							type="number"
							min="0.5"
							max="50"
							step="0.5"
							bind:value={newRadiusMiles}
							class="w-28 rounded border border-stone-300 px-3 py-2"
						/>
					</label>

					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={limitToWindow} />
						Only notify at certain days/times
					</label>

					{#if limitToWindow}
						<div class="flex flex-col gap-2 rounded bg-stone-50 p-3">
							<div class="flex flex-wrap gap-1">
								{#each DAY_NAMES as day, i (day)}
									<button
										type="button"
										class="rounded-full border px-2 py-1 text-xs {newActiveDays.includes(i)
											? 'border-orange-400 bg-orange-50 text-orange-700'
											: 'border-stone-300 text-stone-500'}"
										onclick={() => toggleDay(i)}
									>
										{day.slice(0, 3)}
									</button>
								{/each}
							</div>
							<div class="flex items-center gap-2">
								<input
									type="time"
									bind:value={newStartTime}
									class="rounded border border-stone-300 px-2 py-1.5 text-sm"
								/>
								<span class="text-stone-400">to</span>
								<input
									type="time"
									bind:value={newEndTime}
									class="rounded border border-stone-300 px-2 py-1.5 text-sm"
								/>
							</div>
						</div>
					{/if}

					{#if addError}
						<p class="text-sm text-red-600">{addError}</p>
					{/if}

					<button
						type="submit"
						disabled={adding}
						class="self-start rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
					>
						{adding ? 'Saving…' : 'Add location'}
					</button>
				</form>
			{/if}
		</section>
	{/if}

	<button
		class="flex items-center gap-1.5 rounded border border-stone-300 px-4 py-2 text-stone-600 hover:bg-stone-100"
		onclick={() => signOut()}
	>
		<SignOut size={18} weight="bold" /> Sign out
	</button>
{/if}
