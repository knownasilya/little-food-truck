<script lang="ts">
	import type { ClaimInfo } from '@little-food-truck/shared';
	import { page } from '$app/state';
	import { getClaimInfo, submitClaimRequest } from '$lib/auth.svelte';

	const token = page.url.searchParams.get('token') ?? '';

	let info = $state<ClaimInfo | null>(null);
	let loadError = $state<string | null>(null);

	if (token) {
		getClaimInfo(token)
			.then((result) => (info = result))
			.catch((err) => (loadError = err instanceof Error ? err.message : 'This claim link is invalid or expired'));
	}

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let message = $state('');
	let proofDocument = $state<File | null>(null);
	let submitting = $state(false);
	let done = $state(false);
	let error = $state<string | null>(null);

	function onFileChange(e: Event) {
		proofDocument = (e.target as HTMLInputElement).files?.[0] ?? null;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!proofDocument) {
			error = 'Attach a photo of your seller\'s permit or business license';
			return;
		}
		submitting = true;
		try {
			await submitClaimRequest(token, { name, email, phone, message, proofDocument });
			done = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not submit that claim request';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Claim your truck — Little Food Truck</title></svelte:head>

<div class="mx-auto max-w-sm">
	<h1 class="mb-4 text-xl font-bold">Claim your truck</h1>

	{#if !token}
		<p class="text-sm text-red-600">
			This claim link is missing its token. Check the link an admin sent you, or
			<a href="/sign-in" class="text-orange-600 hover:underline">sign in</a> if you already claimed it.
		</p>
	{:else if loadError}
		<p class="text-sm text-red-600">{loadError}</p>
	{:else if !info}
		<p class="text-stone-400">Loading…</p>
	{:else if done}
		<p class="rounded bg-green-50 p-3 text-sm text-green-700">
			Request submitted. An admin will review your proof document and email <strong>{email}</strong>
			once it's approved — that email will have a link to set your password and take over the listing.
		</p>
	{:else}
		<p class="mb-4 text-sm text-stone-600">
			<strong>{info.truckName}</strong> ({info.cuisine}) was added by an admin. If it's yours, tell us
			about it and attach proof of ownership below — an admin reviews every request before it's
			approved.
		</p>
		<form class="flex flex-col gap-3" onsubmit={onSubmit}>
			<input
				type="text"
				placeholder="Your name"
				bind:value={name}
				required
				class="rounded border border-stone-300 px-3 py-2"
			/>
			<input
				type="email"
				placeholder="Your email"
				bind:value={email}
				required
				class="rounded border border-stone-300 px-3 py-2"
			/>
			<input
				type="tel"
				placeholder="Phone (optional)"
				bind:value={phone}
				class="rounded border border-stone-300 px-3 py-2"
			/>
			<textarea
				placeholder="Tell us about your truck (optional) — how you operate it, since when, anything that helps confirm it's yours"
				bind:value={message}
				rows="3"
				class="rounded border border-stone-300 px-3 py-2"
			></textarea>
			<label class="flex flex-col gap-1 text-sm text-stone-600">
				Seller's permit or business license (photo or PDF)
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp,application/pdf"
					onchange={onFileChange}
					required
					class="rounded border border-stone-300 px-3 py-2 text-sm"
				/>
			</label>
			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}
			<button
				type="submit"
				disabled={submitting}
				class="rounded bg-orange-600 px-3 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
			>
				{submitting ? 'Submitting…' : 'Submit claim request'}
			</button>
		</form>
	{/if}
</div>
