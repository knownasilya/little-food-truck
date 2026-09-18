<script lang="ts">
	import type { TruckPostRecord } from '@little-food-truck/shared';
	import { client, resolveUploadUrl } from '$lib/api';
	import { PaperPlaneRight, Trash } from 'phosphor-svelte';
	import PhotoField from './PhotoField.svelte';

	let { posts, onChange }: { posts: TruckPostRecord[]; onChange: () => void } = $props();

	let message = $state('');
	let photo = $state<File | null>(null);
	let posting = $state(false);

	async function addPost(e: SubmitEvent) {
		e.preventDefault();
		posting = true;
		try {
			await client.api.me.posts.$post({ form: { message, ...(photo ? { photo } : {}) } });
			message = '';
			photo = null;
			onChange();
		} finally {
			posting = false;
		}
	}

	async function remove(id: string) {
		await client.api.me.posts[':id'].$delete({ param: { id } });
		onChange();
	}
</script>

<section class="rounded-lg border border-stone-200 bg-white p-4">
	<h2 class="mb-3 font-semibold">Updates</h2>

	<form class="mb-4 flex flex-col gap-2 rounded border border-dashed border-stone-300 p-3" onsubmit={addPost}>
		<textarea
			bind:value={message}
			placeholder="Selling out fast! Now taking last orders…"
			rows="2"
			required
			class="rounded border border-stone-300 px-3 py-2 text-sm"
		></textarea>
		<PhotoField bind:file={photo} label="Attach a photo (optional)" />
		<button
			type="submit"
			disabled={posting}
			class="flex items-center justify-center gap-1.5 self-start rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
		>
			<PaperPlaneRight size={16} weight="bold" />
			{posting ? 'Posting…' : 'Post update'}
		</button>
	</form>

	{#if posts.length > 0}
		<ul class="flex flex-col gap-2">
			{#each posts as post (post.id)}
				<li class="rounded border border-stone-200 p-3 text-sm">
					<div class="flex items-start justify-between gap-2">
						<p class="text-stone-700">{post.message}</p>
						<button
							class="shrink-0 text-red-600"
							aria-label="Delete update"
							onclick={() => remove(post.id)}
						>
							<Trash size={16} weight="bold" />
						</button>
					</div>
					{#if post.photoUrl}
						<img src={resolveUploadUrl(post.photoUrl)} alt="" class="mt-2 max-h-40 rounded" />
					{/if}
					<p class="mt-1 text-xs text-stone-400">{new Date(post.createdAt).toLocaleString()}</p>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-stone-400">No updates posted yet.</p>
	{/if}
</section>
