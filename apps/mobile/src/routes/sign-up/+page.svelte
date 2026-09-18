<script lang="ts">
	import type { UserRole } from '@little-food-truck/shared';
	import { goto } from '$app/navigation';
	import { ensureSessionLoaded, getAuth, signUp } from '$lib/auth.svelte';

	const auth = getAuth();
	ensureSessionLoaded();

	$effect(() => {
		if (!auth.loading && auth.session) {
			void goto(auth.session.role === 'truck' ? '/dashboard' : '/');
		}
	});

	let role = $state<UserRole>('customer');
	let displayName = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;
		try {
			await signUp({ role, displayName, email, password });
			await goto(role === 'truck' ? '/dashboard' : '/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign up failed';
		} finally {
			submitting = false;
		}
	}
</script>

<h1 class="mb-4 text-xl font-bold">Sign up</h1>

<div class="mb-4 flex rounded border border-stone-300 p-1 text-sm">
	<button
		type="button"
		class="flex-1 rounded px-3 py-1.5 {role === 'customer' ? 'bg-orange-600 text-white' : 'text-stone-600'}"
		onclick={() => (role = 'customer')}
	>
		I'm a customer
	</button>
	<button
		type="button"
		class="flex-1 rounded px-3 py-1.5 {role === 'truck' ? 'bg-orange-600 text-white' : 'text-stone-600'}"
		onclick={() => (role = 'truck')}
	>
		I run a food truck
	</button>
</div>

<form class="flex flex-col gap-3" onsubmit={onSubmit}>
	<input
		type="text"
		placeholder={role === 'truck' ? 'Truck name' : 'Your name'}
		bind:value={displayName}
		required
		class="rounded border border-stone-300 px-3 py-2"
	/>
	<input
		type="email"
		placeholder="Email"
		bind:value={email}
		required
		class="rounded border border-stone-300 px-3 py-2"
	/>
	<input
		type="password"
		placeholder="Password (min 8 characters)"
		bind:value={password}
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
		{submitting ? 'Creating account…' : 'Create account'}
	</button>
</form>
<p class="mt-4 text-sm text-stone-500">
	Already have an account? <a href="/sign-in" class="text-orange-600 hover:underline">Sign in</a>
</p>
