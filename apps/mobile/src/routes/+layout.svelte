<script lang="ts">
	import './layout.css';
	import { ensureSessionLoaded, getAuth, signOut } from '$lib/auth.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import {
		ArrowSquareOut,
		Bell,
		CaretDown,
		Heart,
		MagnifyingGlass,
		Megaphone,
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

<div class="flex min-h-screen flex-col bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="flex items-center justify-between px-4 py-3">
			<a href="/" class="flex items-center gap-2 text-lg font-bold text-orange-600">
				<img src="/images/logo-icon.png" alt="" class="h-[42px] w-[42px] rounded-full" />
				<span class="hidden sm:inline">Little Food Truck</span>
				<span class="sm:hidden">LFT</span>
			</a>
			{#if auth.session}
				<div class="relative">
					<button
						class="flex items-center gap-1 rounded-full py-1 pr-1.5 pl-1 hover:bg-stone-100"
						onclick={() => (menuOpen = !menuOpen)}
					>
						<Avatar avatarUrl={auth.session.avatarUrl} size={28} />
						<CaretDown size={14} />
					</button>

					{#if menuOpen}
						<button class="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onclick={closeMenu}
						></button>
						<div
							class="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
						>
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
									class="flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
									onclick={closeMenu}
								>
									<ArrowSquareOut size={16} weight="bold" /> View public page
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
			{/if}
		</div>
	</header>

	<main class="flex-1 overflow-y-auto px-4 py-4 pb-20">
		{@render children()}
	</main>

	<nav class="fixed inset-x-0 bottom-0 flex border-t border-stone-200 bg-white text-xs">
		<a href="/" class="flex flex-1 flex-col items-center gap-0.5 py-3 hover:bg-stone-50">
			<MagnifyingGlass size={20} />
			Browse
		</a>
		{#if auth.session?.role === 'customer'}
			<a href="/favorites" class="flex flex-1 flex-col items-center gap-0.5 py-3 hover:bg-stone-50">
				<Heart size={20} />
				Favorites
			</a>
			<a href="/feed" class="flex flex-1 flex-col items-center gap-0.5 py-3 hover:bg-stone-50">
				<Megaphone size={20} />
				Feed
			</a>
			<a
				href="/notifications"
				class="flex flex-1 flex-col items-center gap-0.5 py-3 hover:bg-stone-50"
			>
				<Bell size={20} />
				Alerts
			</a>
		{:else if auth.session?.role === 'truck'}
			<a href="/dashboard" class="flex flex-1 flex-col items-center gap-0.5 py-3 hover:bg-stone-50">
				<Truck size={20} />
				My Truck
			</a>
		{:else}
			<a href="/sign-in" class="flex flex-1 flex-col items-center gap-0.5 py-3 hover:bg-stone-50">
				<User size={20} />
				Sign in
			</a>
		{/if}
	</nav>
</div>
