<script lang="ts">
	import { DAY_NAMES, type ScheduleEntryRecord } from '@little-food-truck/shared';
	import { client } from '$lib/api';
	import { clearDefaultLocation, getAuth, setDefaultLocation } from '$lib/auth.svelte';
	import { formatTime12h } from '$lib/time';
	import { MapPin, MapTrifold, Plus, Trash, X } from 'phosphor-svelte';
	import LocationPickerModal from '../LocationPickerModal.svelte';

	let { entries, onChange }: { entries: ScheduleEntryRecord[]; onChange: () => void } = $props();

	const auth = getAuth();

	let mode = $state<'recurring' | 'special'>('recurring');
	let dayOfWeek = $state(1);
	let eventDate = $state('');
	let startTime = $state('11:00');
	let endTime = $state('14:00');
	let locationLabel = $state('');
	let pickedLat = $state<number | null>(null);
	let pickedLng = $state<number | null>(null);
	let saving = $state(false);
	let pickingEntryLocation = $state(false);

	let pickingDefaultLocation = $state(false);
	let savingDefaultLocation = $state(false);
	let defaultLabelInput = $state('');
	let defaultLocationError = $state<string | null>(null);

	const recurring = $derived(
		entries
			.filter((e) => !e.eventDate)
			.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
	);
	const special = $derived(
		entries
			.filter((e) => e.eventDate)
			.sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))
	);

	async function addEntry(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		try {
			const coords = pickedLat != null && pickedLng != null ? { lat: pickedLat, lng: pickedLng } : {};
			await client.api.me.schedule.$post({
				json:
					mode === 'recurring'
						? { dayOfWeek, startTime, endTime, locationLabel, ...coords }
						: { eventDate, startTime, endTime, locationLabel, ...coords }
			});
			locationLabel = '';
			eventDate = '';
			pickedLat = null;
			pickedLng = null;
			onChange();
		} finally {
			saving = false;
		}
	}

	async function remove(id: string) {
		await client.api.me.schedule[':id'].$delete({ param: { id } });
		onChange();
	}

	async function removeEntryLocation(id: string) {
		await client.api.me.schedule[':id'].location.$delete({ param: { id } });
		onChange();
	}

	async function saveDefaultLocation(coords: { lat: number; lng: number }) {
		pickingDefaultLocation = false;
		defaultLocationError = null;
		savingDefaultLocation = true;
		try {
			await setDefaultLocation({
				label: defaultLabelInput.trim() || 'Usual spot',
				lat: coords.lat,
				lng: coords.lng
			});
			defaultLabelInput = '';
		} catch (err) {
			defaultLocationError = err instanceof Error ? err.message : 'Could not save that location.';
		} finally {
			savingDefaultLocation = false;
		}
	}

	async function removeDefaultLocation() {
		defaultLocationError = null;
		savingDefaultLocation = true;
		try {
			await clearDefaultLocation();
		} catch (err) {
			defaultLocationError = err instanceof Error ? err.message : 'Could not clear that location.';
		} finally {
			savingDefaultLocation = false;
		}
	}

	function saveEntryLocation(coords: { lat: number; lng: number }) {
		pickingEntryLocation = false;
		pickedLat = coords.lat;
		pickedLng = coords.lng;
	}

	function clearPickedEntryLocation() {
		pickedLat = null;
		pickedLng = null;
	}
</script>

<section class="rounded-lg border border-stone-200 bg-white p-4">
	<h2 class="mb-1 font-semibold">Weekly schedule</h2>
	<p class="mb-3 text-sm text-stone-500">
		Where you regularly park, so customers know when to expect you.
	</p>

	<div class="mb-4 rounded border border-stone-200 bg-stone-50 p-3">
		<p class="mb-1 text-sm font-medium">Default location</p>
		<p class="mb-2 text-xs text-stone-500">
			Used to open for business when there's no live GPS fix and today's schedule doesn't have
			its own location set.
		</p>
		{#if auth.session?.truckProfile?.defaultLat != null}
			<div class="flex items-center justify-between gap-2 text-sm">
				<span class="flex items-center gap-1.5">
					<MapPin size={14} weight="bold" class="shrink-0 text-orange-500" />
					{auth.session.truckProfile.defaultLocationLabel}
				</span>
				<button
					disabled={savingDefaultLocation}
					class="shrink-0 text-red-600 disabled:opacity-50"
					aria-label="Clear default location"
					onclick={removeDefaultLocation}
				>
					<X size={16} weight="bold" />
				</button>
			</div>
		{:else}
			<div class="flex gap-2">
				<input
					bind:value={defaultLabelInput}
					placeholder="Label (e.g. Downtown lot)"
					class="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm"
				/>
				<button
					type="button"
					disabled={savingDefaultLocation}
					class="flex shrink-0 items-center gap-1.5 rounded border border-stone-300 px-2 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50"
					onclick={() => (pickingDefaultLocation = true)}
				>
					<MapTrifold size={16} weight="bold" /> Set on map
				</button>
			</div>
		{/if}
		{#if defaultLocationError}
			<p class="mt-2 text-sm text-red-600">{defaultLocationError}</p>
		{/if}
	</div>

	{#if pickingDefaultLocation}
		<LocationPickerModal
			initialLat={auth.session?.truckProfile?.lat ?? undefined}
			initialLng={auth.session?.truckProfile?.lng ?? undefined}
			onCancel={() => (pickingDefaultLocation = false)}
			onConfirm={saveDefaultLocation}
		/>
	{/if}

	{#if recurring.length > 0}
		<ul class="mb-4 flex flex-col gap-2">
			{#each recurring as entry (entry.id)}
				<li class="flex items-center justify-between rounded border border-stone-200 p-2 text-sm">
					<span class="flex items-center gap-1.5">
						{#if entry.lat != null}
							<MapPin size={14} weight="bold" class="shrink-0 text-orange-500" />
						{/if}
						<strong>{DAY_NAMES[entry.dayOfWeek]}</strong>
						{formatTime12h(entry.startTime)}–{formatTime12h(entry.endTime)} · {entry.locationLabel}
					</span>
					<span class="flex shrink-0 items-center gap-2">
						{#if entry.lat != null}
							<button
								class="text-stone-400 hover:text-stone-600"
								aria-label="Remove pinned location"
								title="Remove pinned location"
								onclick={() => removeEntryLocation(entry.id)}
							>
								<X size={16} weight="bold" />
							</button>
						{/if}
						<button
							class="text-red-600"
							aria-label="Delete schedule entry"
							onclick={() => remove(entry.id)}
						>
							<Trash size={16} weight="bold" />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mb-4 text-sm text-stone-400">No regular schedule set yet.</p>
	{/if}

	{#if special.length > 0}
		<h3 class="mb-1 text-sm font-semibold text-stone-700">Upcoming special events</h3>
		<ul class="mb-4 flex flex-col gap-2">
			{#each special as entry (entry.id)}
				<li class="flex items-center justify-between rounded border border-orange-200 bg-orange-50 p-2 text-sm">
					<span class="flex items-center gap-1.5">
						{#if entry.lat != null}
							<MapPin size={14} weight="bold" class="shrink-0 text-orange-500" />
						{/if}
						<strong>{new Date(`${entry.eventDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
						{formatTime12h(entry.startTime)}–{formatTime12h(entry.endTime)} · {entry.locationLabel}
					</span>
					<span class="flex shrink-0 items-center gap-2">
						{#if entry.lat != null}
							<button
								class="text-stone-400 hover:text-stone-600"
								aria-label="Remove pinned location"
								title="Remove pinned location"
								onclick={() => removeEntryLocation(entry.id)}
							>
								<X size={16} weight="bold" />
							</button>
						{/if}
						<button
							class="text-red-600"
							aria-label="Delete schedule entry"
							onclick={() => remove(entry.id)}
						>
							<Trash size={16} weight="bold" />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<form class="flex flex-col gap-2 rounded border border-dashed border-stone-300 p-3" onsubmit={addEntry}>
		<div class="flex rounded border border-stone-300 p-0.5 text-xs">
			<button
				type="button"
				class="flex-1 rounded px-2 py-1 {mode === 'recurring' ? 'bg-orange-600 text-white' : 'text-stone-600'}"
				onclick={() => (mode = 'recurring')}
			>
				Weekly stop
			</button>
			<button
				type="button"
				class="flex-1 rounded px-2 py-1 {mode === 'special' ? 'bg-orange-600 text-white' : 'text-stone-600'}"
				onclick={() => (mode = 'special')}
			>
				One-off event
			</button>
		</div>
		<div class="flex gap-2">
			{#if mode === 'recurring'}
				<select bind:value={dayOfWeek} class="rounded border border-stone-300 px-2 py-2 text-sm">
					{#each DAY_NAMES as day, i (day)}
						<option value={i}>{day}</option>
					{/each}
				</select>
			{:else}
				<input type="date" bind:value={eventDate} required class="rounded border border-stone-300 px-2 py-2 text-sm" />
			{/if}
			<input type="time" bind:value={startTime} class="rounded border border-stone-300 px-2 py-2 text-sm" />
			<input type="time" bind:value={endTime} class="rounded border border-stone-300 px-2 py-2 text-sm" />
		</div>
		<input
			bind:value={locationLabel}
			placeholder="Where (e.g. 6th & Congress, Downtown)"
			required
			class="rounded border border-stone-300 px-3 py-2 text-sm"
		/>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-sm disabled:opacity-50 {pickedLat !=
				null
					? 'border-green-300 bg-green-50 text-green-700'
					: 'border-stone-300 text-stone-600 hover:bg-stone-100'}"
				onclick={() => (pickingEntryLocation = true)}
			>
				<MapTrifold size={16} weight="bold" />
				{pickedLat != null ? 'Location set on map — tap to update' : 'Set location on map (optional)'}
			</button>
			{#if pickedLat != null}
				<button
					type="button"
					class="shrink-0 text-stone-400 hover:text-stone-600"
					aria-label="Clear picked location"
					title="Clear picked location"
					onclick={clearPickedEntryLocation}
				>
					<X size={16} weight="bold" />
				</button>
			{/if}
		</div>

		{#if pickingEntryLocation}
			<LocationPickerModal
				initialLat={pickedLat ?? auth.session?.truckProfile?.lat ?? undefined}
				initialLng={pickedLng ?? auth.session?.truckProfile?.lng ?? undefined}
				onCancel={() => (pickingEntryLocation = false)}
				onConfirm={saveEntryLocation}
			/>
		{/if}

		<button
			type="submit"
			disabled={saving}
			class="flex items-center justify-center gap-1.5 self-start rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
		>
			<Plus size={16} weight="bold" />
			{saving ? 'Adding…' : 'Add to schedule'}
		</button>
	</form>
</section>
