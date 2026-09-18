<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resetPassword } from '$lib/auth.svelte';

	const token = page.url.searchParams.get('token') ?? '';

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
			await resetPassword({ token, password });
			done = true;
			setTimeout(() => goto('/sign-in'), 1500);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not reset password';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Set a new password — Little Food Truck</title></svelte:head>

<div class="mx-auto max-w-sm">
	<h1 class="mb-4 text-xl font-bold">Set a new password</h1>

	{#if !token}
		<p class="text-sm text-red-600">
			This reset link is missing its token. Request a new one from the
			<a href="/forgot-password" class="text-orange-600 hover:underline">forgot password</a> page.
		</p>
	{:else if done}
		<p class="rounded bg-green-50 p-3 text-sm text-green-700">
			Password updated. Redirecting to sign in…
		</p>
	{:else}
		<form class="flex flex-col gap-3" onsubmit={onSubmit}>
			<input
				type="password"
				placeholder="New password (min 8 characters)"
				bind:value={password}
				minlength={8}
				required
				class="rounded border border-stone-300 px-3 py-2"
			/>
			<input
				type="password"
				placeholder="Confirm new password"
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
				{submitting ? 'Saving…' : 'Set new password'}
			</button>
		</form>
	{/if}
</div>
