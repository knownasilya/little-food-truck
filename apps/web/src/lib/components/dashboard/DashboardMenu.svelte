<script lang="ts">
	import { DIETARY_TAGS, type DietaryTag, type MenuItemRecord } from '@little-food-truck/shared';
	import { client, resolveUploadUrl } from '$lib/api';
	import { Camera, ForkKnife, Plus, Trash } from 'phosphor-svelte';
	import PhotoField from './PhotoField.svelte';

	let { items, onChange }: { items: MenuItemRecord[]; onChange: () => void } = $props();

	let name = $state('');
	let price = $state('');
	let description = $state('');
	let photo = $state<File | null>(null);
	let dietaryTags = $state<DietaryTag[]>([]);
	let saving = $state(false);
	let updatingPhotoId = $state<string | null>(null);

	function toggleTag(tag: DietaryTag) {
		dietaryTags = dietaryTags.includes(tag)
			? dietaryTags.filter((t) => t !== tag)
			: [...dietaryTags, tag];
	}

	async function addItem(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		try {
			await client.api.me['menu-items'].$post({
				form: {
					name,
					price,
					description,
					dietaryTags: dietaryTags.join(','),
					...(photo ? { photo } : {})
				}
			});
			name = '';
			price = '';
			description = '';
			photo = null;
			dietaryTags = [];
			onChange();
		} finally {
			saving = false;
		}
	}

	async function updatePhoto(id: string, file: File) {
		updatingPhotoId = id;
		try {
			await client.api.me['menu-items'][':id'].$patch({
				param: { id },
				form: { photo: file }
			});
			onChange();
		} finally {
			updatingPhotoId = null;
		}
	}

	async function remove(id: string) {
		await client.api.me['menu-items'][':id'].$delete({ param: { id } });
		onChange();
	}
</script>

<section class="rounded-lg border border-stone-200 bg-white p-4">
	<h2 class="mb-3 font-semibold">Menu</h2>

	{#if items.length > 0}
		<ul class="mb-4 flex flex-col gap-2">
			{#each items as item (item.id)}
				<li class="flex items-center gap-3 rounded border border-stone-200 p-2">
					<label
						class="group relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded bg-orange-50 text-orange-400"
					>
						{#if item.photoUrl}
							<img
								src={resolveUploadUrl(item.photoUrl)}
								alt=""
								class="h-full w-full object-cover"
							/>
						{:else}
							<ForkKnife size={20} />
						{/if}
						<span
							class="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 {updatingPhotoId ===
							item.id
								? 'opacity-100'
								: ''}"
						>
							<Camera size={16} weight="bold" />
						</span>
						<input
							type="file"
							accept="image/png,image/jpeg,image/webp,image/gif"
							class="hidden"
							disabled={updatingPhotoId === item.id}
							onchange={(e) => {
								const file = (e.currentTarget as HTMLInputElement).files?.[0];
								if (file) updatePhoto(item.id, file);
								(e.currentTarget as HTMLInputElement).value = '';
							}}
						/>
					</label>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate font-medium">{item.name}</span>
							{#if item.price}<span class="text-sm text-stone-500">{item.price}</span>{/if}
						</div>
						{#if item.description}
							<p class="truncate text-sm text-stone-500">{item.description}</p>
						{/if}
						{#if item.dietaryTags.length > 0}
							<div class="mt-1 flex flex-wrap gap-1">
								{#each item.dietaryTags as tag (tag)}
									<span class="rounded-full bg-green-50 px-1.5 py-0.5 text-xs text-green-700">{tag}</span>
								{/each}
							</div>
						{/if}
					</div>
					<button
						class="shrink-0 text-red-600"
						aria-label="Delete menu item"
						onclick={() => remove(item.id)}
					>
						<Trash size={18} weight="bold" />
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mb-4 text-sm text-stone-400">No menu items yet.</p>
	{/if}

	<form class="flex flex-col gap-2 rounded border border-dashed border-stone-300 p-3" onsubmit={addItem}>
		<div class="flex gap-2">
			<input
				bind:value={name}
				placeholder="Item name"
				required
				class="flex-1 rounded border border-stone-300 px-3 py-2 text-sm"
			/>
			<input
				bind:value={price}
				placeholder="$8.00"
				class="w-24 rounded border border-stone-300 px-3 py-2 text-sm"
			/>
		</div>
		<input
			bind:value={description}
			placeholder="Description (optional)"
			class="rounded border border-stone-300 px-3 py-2 text-sm"
		/>
		<div class="flex flex-wrap gap-2">
			{#each DIETARY_TAGS as tag (tag)}
				<label
					class="flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-xs {dietaryTags.includes(
						tag
					)
						? 'border-green-400 bg-green-50 text-green-700'
						: 'border-stone-300 text-stone-500'}"
				>
					<input type="checkbox" class="hidden" checked={dietaryTags.includes(tag)} onchange={() => toggleTag(tag)} />
					{tag}
				</label>
			{/each}
		</div>
		<PhotoField bind:file={photo} label="Add a photo of this item (optional)" />
		<button
			type="submit"
			disabled={saving}
			class="flex items-center justify-center gap-1.5 self-start rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
		>
			<Plus size={16} weight="bold" />
			{saving ? 'Adding…' : 'Add item'}
		</button>
	</form>
</section>
