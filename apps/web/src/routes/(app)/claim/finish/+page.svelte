<script lang="ts">
	import type { FinishClaimInfo } from '@little-food-truck/shared';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { finishClaim, getFinishClaimInfo } from '$lib/auth.svelte';

	const token = page.url.searchParams.get('token') ?? '';

	let info = $state<FinishClaimInfo | null>(null);
	let loadError = $state<string | null>(null);

	if (token) {
		getFinishClaimInfo(token)
			.then((result) => (info = result))
			.catch((err) => (loadError = err instanceof Error ? err.message : 'This link is invalid or expired'));
	}

	let password = $state('');
	let confirm = $state('');
	let submitting = $state(false);
	let done = $state(false);
	let error = $state<string | null>(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (password !== confirm) {
			error = 'Passwords do not match';
			return;
		}
		submitting = true;
		try {
			await finishClaim(token, { password });
			done = true;
			setTimeout(() => goto('/dashboard'), 1200);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not finish claiming this truck';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Set your password — Little Food Truck</title></svelte:head>

<div class="mx-auto max-w-sm">
	<h1 class="mb-4 text-xl font-bold">Set your password</h1>

	{#if !token}
		<p class="text-sm text-red-600">This link is missing its token.</p>
	{:else if loadError}
		<p class="text-sm text-red-600">{loadError}</p>
	{:else if !info}
		<p class="text-stone-400">Loading…</p>
	{:else if done}
		<p class="rounded bg-green-50 p-3 text-sm text-green-700">
			{info.truckName} is yours. Redirecting to your dashboard…
		</p>
	{:else}
		<p class="mb-4 text-sm text-stone-600">
			Your request to claim <strong>{info.truckName}</strong> was approved. Set a password for
			<strong>{info.email}</strong> to finish taking it over.
		</p>
		<form class="flex flex-col gap-3" onsubmit={onSubmit}>
			<input
				type="password"
				placeholder="Password (min 8 characters)"
				bind:value={password}
				minlength={8}
				required
				class="rounded border border-stone-300 px-3 py-2"
			/>
			<input
				type="password"
				placeholder="Confirm password"
				bind:value={confirm}
				minlength={8}
				required
				class="rounded border border-stone-300 px-3 py-2"
			/>
			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}
			<button
				type="submit"
				disabled={submitting}
				class="rounded bg-orange-600 px-3 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
			>
				{submitting ? 'Saving…' : 'Set password & claim truck'}
			</button>
		</form>
	{/if}
</div>
