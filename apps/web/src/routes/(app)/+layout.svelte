<script lang="ts">
	import '../layout.css';
	import { ensureSessionLoaded, getAuth, signOut } from '$lib/auth.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import {
		ArrowSquareOut,
		Bell,
		CaretDown,
		Heart,
		MagnifyingGlass,
		Megaphone,
		ShieldCheck,
		SignOut,
		Truck,
		User
	} from 'phosphor-svelte';

	let { children } = $props();
	const auth = getAuth();
	let menuOpen = $state(false);

	ensureSessionLoaded();

	function closeMenu() {
		menuOpen = false;
	}
</script>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<nav class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<a href="/" class="flex shrink-0 items-center gap-2 text-lg font-bold text-orange-600">
				<img src="/images/logo-icon.png" alt="" class="h-[42px] w-[42px] rounded-full" />
				<span class="hidden min-[420px]:inline">Little Food Truck</span>
				<span class="min-[420px]:hidden">LFT</span>
			</a>

			<div class="flex shrink-0 items-center gap-1 text-sm">
				<a
					href="/browse"
					class="flex items-center gap-1.5 rounded p-2 hover:bg-stone-100 hover:text-orange-600"
					title="Browse"
					aria-label="Browse"
				>
					<MagnifyingGlass size={20} weight="bold" />
					<span class="hidden sm:inline">Browse</span>
				</a>
				{#if auth.loading}
					<span class="px-2 text-stone-400">…</span>
				{:else if auth.session}
					{#if auth.session.role === 'customer'}
						<a
							href="/feed"
							class="flex items-center gap-1.5 rounded p-2 hover:bg-stone-100 hover:text-orange-600"
							title="Feed"
							aria-label="Feed"
						>
							<Megaphone size={20} weight="bold" />
							<span class="hidden sm:inline">Feed</span>
						</a>
						<a
							href="/favorites"
							class="flex items-center gap-1.5 rounded p-2 hover:bg-stone-100 hover:text-orange-600"
							title="Favorites"
							aria-label="Favorites"
						>
							<Heart size={20} weight="bold" />
							<span class="hidden sm:inline">Favorites</span>
						</a>
						<a
							href="/notifications"
							class="flex items-center gap-1.5 rounded p-2 hover:bg-stone-100 hover:text-orange-600"
							title="Notifications"
							aria-label="Notifications"
						>
							<Bell size={20} weight="bold" />
							<span class="hidden sm:inline">Notifications</span>
						</a>
					{:else}
						<a
							href="/dashboard"
							class="flex items-center gap-1.5 rounded p-2 hover:bg-stone-100 hover:text-orange-600"
							title="My Truck"
							aria-label="My Truck"
						>
							<Truck size={20} weight="bold" />
							<span class="hidden sm:inline">My Truck</span>
						</a>
					{/if}

					<div class="relative ml-1">
						<button
							class="flex items-center gap-1 rounded-full p-1 hover:bg-stone-100"
							onclick={() => (menuOpen = !menuOpen)}
							aria-label="Account menu"
						>
							<Avatar avatarUrl={auth.session.avatarUrl} size={28} />
							<CaretDown size={14} />
						</button>

						{#if menuOpen}
							<button
								class="fixed inset-0 z-40 cursor-default"
								aria-label="Close menu"
								onclick={closeMenu}
							></button>
							<div
								class="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
							>
								<p class="truncate border-b border-stone-100 px-3 py-2 text-xs text-stone-400">
									{auth.session.displayName}
								</p>
								<a
									href="/account"
									class="flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
									onclick={closeMenu}
								>
									<User size={16} weight="bold" /> Account
								</a>
								{#if auth.session.role === 'truck'}
									<a
										href={`/trucks/${auth.session.id}`}
										target="_blank"
										rel="noopener"
										class="flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
										onclick={closeMenu}
									>
										<ArrowSquareOut size={16} weight="bold" /> View public page
									</a>
								{/if}
								{#if auth.session.isAdmin}
									<a
										href="/admin"
										class="flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
										onclick={closeMenu}
									>
										<ShieldCheck size={16} weight="bold" /> Admin
									</a>
								{/if}
								<button
									class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-stone-50"
									onclick={() => {
										closeMenu();
										signOut();
									}}
								>
									<SignOut size={16} weight="bold" /> Sign out
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<a href="/sign-in" class="rounded px-2 py-2 hover:bg-stone-100 hover:text-orange-600">Sign in</a>
					<a
						href="/sign-up"
						class="rounded bg-orange-600 px-3 py-1.5 text-white hover:bg-orange-700"
					>
						Sign up
					</a>
				{/if}
			</div>
		</nav>
	</header>

	<main class="mx-auto max-w-3xl px-4 py-6">
		{@render children()}
	</main>

	<footer class="mt-8 border-t border-stone-200 px-4 py-6 text-center text-xs text-stone-400">
		<a href="/terms" class="hover:text-stone-600 hover:underline">Terms of Service</a>
		<span class="mx-2">·</span>
		<a href="/privacy" class="hover:text-stone-600 hover:underline">Privacy Policy</a>
	</footer>
</div>
