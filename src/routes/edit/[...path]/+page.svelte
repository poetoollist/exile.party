<script lang="ts">
	import { onMount } from 'svelte';
	import type { EditorCatalog } from '$lib/editor/types';

	let catalog = $state<EditorCatalog | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await fetch('/__editor/catalog');
			if (!response.ok) throw new Error(`${response.status} from /__editor/catalog`);
			catalog = await response.json();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	});
</script>

<svelte:head><title>Catalog editor</title></svelte:head>

<main class="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:px-6">
	<h1 class="text-[15px] font-medium tracking-tight">Catalog editor</h1>
	{#if error}
		<p class="mt-4 text-[13.5px] text-muted">{error}</p>
	{:else if catalog}
		<p class="mt-4 text-[13.5px] text-muted">
			{catalog.tools.length} tools, {catalog.categories.length} categories.
		</p>
	{:else}
		<p class="mt-4 text-[13.5px] text-faint">Loading</p>
	{/if}
</main>
