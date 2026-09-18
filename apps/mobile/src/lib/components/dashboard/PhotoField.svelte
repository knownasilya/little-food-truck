<script lang="ts">
	import { ImageSquare } from 'phosphor-svelte';

	let {
		file = $bindable(null),
		label = 'Add photo (optional)'
	}: { file?: File | null; label?: string } = $props();
</script>

<label
	class="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
>
	<ImageSquare size={16} weight="bold" />
	{file ? file.name : label}
	<input
		type="file"
		accept="image/png,image/jpeg,image/webp,image/gif"
		class="hidden"
		onchange={(e) => (file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null)}
	/>
</label>
