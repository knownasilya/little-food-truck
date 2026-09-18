<script lang="ts">
	import type { TruckPhotoRecord } from '@little-food-truck/shared';
	import { client, resolveUploadUrl } from '$lib/api';
	import { Trash, UploadSimple } from 'phosphor-svelte';

	let { photos, onChange }: { photos: TruckPhotoRecord[]; onChange: () => void } = $props();

	let uploading = $state(false);
	let error = $state<string | null>(null);

	async function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		error = null;
		uploading = true;
		try {
			const res = await client.api.me.photos.$post({ form: { photo: file } });
			if (!res.ok) throw new Error();
			onChange();
		} catch {
			error = 'Could not upload photo. Try a smaller image (max 5MB).';
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function remove(id: string) {
		await client.api.me.photos[':id'].$delete({ param: { id } });
		onChange();
	}
</script>

<section class="rounded-lg border border-stone-200 bg-white p-4">
	<h2 class="mb-3 font-semibold">Photos</h2>

	{#if photos.length > 0}
		<div class="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
			{#each photos as photo (photo.id)}
				<div class="group relative aspect-square overflow-hidden rounded-lg border border-stone-200">
					<img src={resolveUploadUrl(photo.url)} alt="" class="h-full w-full object-cover" />
					<button
						class="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-red-600 opacity-0 group-hover:opacity-100"
						aria-label="Delete photo"
						onclick={() => remove(photo.id)}
					>
						<Trash size={16} weight="bold" />
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="mb-3 text-sm text-stone-400">No photos yet.</p>
	{/if}

	<label
		class="inline-flex cursor-pointer items-center gap-1.5 rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100"
	>
		<UploadSimple size={16} weight="bold" />
		{uploading ? 'Uploading…' : 'Add photo'}
		<input
			type="file"
			accept="image/png,image/jpeg,image/webp,image/gif"
			class="hidden"
			disabled={uploading}
			onchange={onFileChange}
		/>
	</label>
	{#if error}
		<p class="mt-2 text-sm text-red-600">{error}</p>
	{/if}
</section>
