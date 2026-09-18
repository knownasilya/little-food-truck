<script lang="ts">
	import { Check, MagnifyingGlassMinus, MagnifyingGlassPlus, X } from 'phosphor-svelte';

	let {
		file,
		aspect = 1,
		shape = 'rect',
		outputWidth = 800,
		outputHeight = Math.round(outputWidth / aspect),
		onCancel,
		onConfirm
	}: {
		file: File;
		aspect?: number;
		shape?: 'rect' | 'circle';
		outputWidth?: number;
		outputHeight?: number;
		onCancel: () => void;
		onConfirm: (file: File) => void;
	} = $props();

	let objectUrl = $state('');
	$effect(() => {
		const url = URL.createObjectURL(file);
		objectUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	let imgEl = $state<HTMLImageElement | null>(null);
	let naturalWidth = $state(0);
	let naturalHeight = $state(0);
	let loaded = $state(false);

	let frameEl = $state<HTMLDivElement | null>(null);
	let frameWidth = $state(0);
	let frameHeight = $state(0);

	// zoom is a multiplier on top of the "cover fit" scale, so 1 always means
	// "image exactly fills the frame with no gaps" regardless of the image's
	// or frame's own dimensions.
	let zoom = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);

	const minScale = $derived(
		naturalWidth > 0 && frameWidth > 0
			? Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight)
			: 1
	);
	const scale = $derived(minScale * zoom);
	const displayWidth = $derived(naturalWidth * scale);
	const displayHeight = $derived(naturalHeight * scale);

	function clampOffsets() {
		const minX = Math.min(0, frameWidth - displayWidth);
		const minY = Math.min(0, frameHeight - displayHeight);
		offsetX = Math.min(0, Math.max(minX, offsetX));
		offsetY = Math.min(0, Math.max(minY, offsetY));
	}

	function onImageLoad() {
		if (!imgEl) return;
		naturalWidth = imgEl.naturalWidth;
		naturalHeight = imgEl.naturalHeight;
		loaded = true;
		// Center the image in the frame on first load.
		offsetX = (frameWidth - naturalWidth * minScale) / 2;
		offsetY = (frameHeight - naturalHeight * minScale) / 2;
		clampOffsets();
	}

	let dragging = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let dragOffsetStartX = 0;
	let dragOffsetStartY = 0;

	function onPointerDown(e: PointerEvent) {
		if (!loaded) return;
		dragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragOffsetStartX = offsetX;
		dragOffsetStartY = offsetY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		offsetX = dragOffsetStartX + (e.clientX - dragStartX);
		offsetY = dragOffsetStartY + (e.clientY - dragStartY);
		clampOffsets();
	}

	function onPointerUp(e: PointerEvent) {
		dragging = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function onZoomInput() {
		clampOffsets();
	}

	function nudgeZoom(delta: number) {
		zoom = Math.min(4, Math.max(1, zoom + delta));
		clampOffsets();
	}

	function confirm() {
		if (!imgEl || !loaded) return;
		const canvas = document.createElement('canvas');
		canvas.width = outputWidth;
		canvas.height = outputHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const sx = -offsetX / scale;
		const sy = -offsetY / scale;
		const sWidth = frameWidth / scale;
		const sHeight = frameHeight / scale;

		ctx.drawImage(imgEl, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);

		canvas.toBlob(
			(blob) => {
				if (!blob) return;
				const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
				const cropped = new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
				onConfirm(cropped);
			},
			'image/jpeg',
			0.9
		);
	}

	function cancel() {
		onCancel();
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
	<div class="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-4">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold">Adjust photo</h2>
			<button class="text-stone-400 hover:text-stone-600" aria-label="Cancel" onclick={cancel}>
				<X size={20} weight="bold" />
			</button>
		</div>

		<div
			bind:this={frameEl}
			bind:clientWidth={frameWidth}
			bind:clientHeight={frameHeight}
			role="button"
			tabindex="0"
			aria-label="Drag to reposition the photo"
			class="relative mx-auto w-full touch-none overflow-hidden bg-stone-100 {shape === 'circle'
				? 'rounded-full'
				: 'rounded-lg'}"
			style="aspect-ratio: {aspect}; max-width: {shape === 'circle' ? '260px' : '100%'};"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<img
				bind:this={imgEl}
				src={objectUrl}
				alt=""
				draggable="false"
				class="absolute top-0 left-0 max-w-none cursor-grab select-none active:cursor-grabbing"
				style="width: {displayWidth}px; height: {displayHeight}px; transform: translate({offsetX}px, {offsetY}px); opacity: {loaded
					? 1
					: 0};"
				onload={onImageLoad}
			/>
		</div>

		<div class="flex items-center gap-3">
			<button
				class="shrink-0 text-stone-500 hover:text-stone-700"
				aria-label="Zoom out"
				onclick={() => nudgeZoom(-0.25)}
			>
				<MagnifyingGlassMinus size={18} weight="bold" />
			</button>
			<input
				type="range"
				min="1"
				max="4"
				step="0.01"
				bind:value={zoom}
				oninput={onZoomInput}
				class="flex-1"
			/>
			<button
				class="shrink-0 text-stone-500 hover:text-stone-700"
				aria-label="Zoom in"
				onclick={() => nudgeZoom(0.25)}
			>
				<MagnifyingGlassPlus size={18} weight="bold" />
			</button>
		</div>

		<div class="flex justify-end gap-2">
			<button
				class="rounded border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
				onclick={cancel}
			>
				Cancel
			</button>
			<button
				class="flex items-center gap-1.5 rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700"
				disabled={!loaded}
				onclick={confirm}
			>
				<Check size={16} weight="bold" /> Use photo
			</button>
		</div>
	</div>
</div>
