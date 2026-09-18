<script lang="ts">
	import { forgotPassword } from '$lib/auth.svelte';

	let email = $state('');
	let submitting = $state(false);
	let sent = $state(false);
	let devResetUrl = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;
		try {
			devResetUrl = await forgotPassword({ email });
			sent = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Forgot password — Little Food Truck</title></svelte:head>

<div class="mx-auto max-w-sm">
	<h1 class="mb-2 text-xl font-bold">Reset your password</h1>
	<p class="mb-4 text-sm text-stone-500">
		Enter your email and we'll send you a link to set a new password.
	</p>

	{#if sent}
		<p class="rounded bg-green-50 p-3 text-sm text-green-700">
			If an account exists for {email}, a reset link is on its way.
		</p>
		{#if devResetUrl}
			<p class="mt-3 rounded bg-orange-50 p-3 text-xs text-orange-700">
				No email service is wired up in this dev build, so here's the link directly:
				<a href={devResetUrl} class="break-all font-medium underline">{devResetUrl}</a>
			</p>
		{/if}
	{:else}
		<form class="flex flex-col gap-3" onsubmit={onSubmit}>
			<input
				type="email"
				placeholder="Email"
				bind:value={email}
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
				{submitting ? 'Sending…' : 'Send reset link'}
			</button>
		</form>
	{/if}

	<p class="mt-4 text-sm text-stone-500">
		<a href="/sign-in" class="text-orange-600 hover:underline">Back to sign in</a>
	</p>
</div>
