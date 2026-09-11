<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { sections } from '$lib/catalog/home';
	import { api, errorText } from '$lib/editor/api';
	import EditorShell from '$lib/editor/EditorShell.svelte';
	import ToolList from '$lib/editor/ToolList.svelte';
	import { BUTTON } from '$lib/editor/styles';
	import type { EditorCatalog } from '$lib/editor/types';

	let catalog = $state<EditorCatalog | null>(null);
	let error = $state<string | null>(null);
	let written = $state<string[]>([]);

	async function reload() {
		try {
			catalog = await api.catalog();
			error = null;
		} catch (e) {
			error = errorText(e);
		}
	}

	onMount(() => {
		void reload();
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function noteWritten(...files: string[]) {
		for (const file of files) if (!written.includes(file)) written = [...written, file];
	}

	const segments = $derived((page.params.path ?? '').split('/').filter(Boolean));
	const edit = (path: string) => resolve('/edit/[...path]', { path });
</script>

<svelte:head><title>Catalog editor</title></svelte:head>

<EditorShell sections={catalog ? sections(catalog.categories) : []} {written}>
	{#if error}
		<p class="text-[13.5px] text-danger">{error}</p>
		<button type="button" onclick={reload} class="{BUTTON} mt-3">Retry</button>
	{:else if !catalog}
		<p class="text-[13.5px] text-faint">Loading</p>
	{:else if segments.length === 0}
		<ToolList {catalog} />
	{:else}
		<p class="text-[13.5px] text-muted">
			Nothing at /edit/{segments.join('/')}.
			<a href={edit('')} class="text-accent">Back to tools</a>
		</p>
	{/if}
</EditorShell>
