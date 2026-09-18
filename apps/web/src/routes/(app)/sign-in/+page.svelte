<script lang="ts">
	import { goto } from '$app/navigation';
	import { ensureSessionLoaded, getAuth, signIn } from '$lib/auth.svelte';

	const auth = getAuth();
	ensureSessionLoaded();

	$effect(() => {
		if (!auth.loading && auth.session) {
			void goto(auth.session.role === 'truck' ? '/dashboard' : '/browse');
		}
	});

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;
		try {
			await signIn({ email, password });
			await goto('/browse');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign in failed';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Sign in — Little Food Truck</title></svelte:head>

<div class="mx-auto max-w-sm">
	<h1 class="mb-4 text-xl font-bold">Sign in</h1>
	<form class="flex flex-col gap-3" onsubmit={onSubmit}>
		<input
			type="email"
			placeholder="Email"
			bind:value={email}
			required
			class="rounded border border-stone-300 px-3 py-2"
		/>
		<input
			type="password"
			placeholder="Password"
			bind:value={password}
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
			{submitting ? 'Signing in…' : 'Sign in'}
		</button>
	</form>
	<p class="mt-3 text-sm">
		<a href="/forgot-password" class="text-orange-600 hover:underline">Forgot password?</a>
	</p>
	<p class="mt-2 text-sm text-stone-500">
		No account? <a href="/sign-up" class="text-orange-600 hover:underline">Sign up</a>
	</p>
</div>
