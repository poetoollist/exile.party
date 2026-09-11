<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { sections } from '$lib/catalog/home';
	import { api, errorText } from '$lib/editor/api';
	import CategoriesEditor from '$lib/editor/CategoriesEditor.svelte';
	import EditorShell from '$lib/editor/EditorShell.svelte';
	import { emptyTool, toDraft } from '$lib/editor/form';
	import SectionRanking from '$lib/editor/SectionRanking.svelte';
	import ToolForm from '$lib/editor/ToolForm.svelte';
	import ToolList from '$lib/editor/ToolList.svelte';
	import { BUTTON } from '$lib/editor/styles';
	import type { EditorCatalog } from '$lib/editor/types';

	/* Survives the dev server's full reload after a save, which otherwise wipes the in-memory list. */
	const WRITTEN_KEY = 'exile-party-editor-written';

	function loadWritten(): string[] {
		try {
			const parsed: unknown = JSON.parse(sessionStorage.getItem(WRITTEN_KEY) ?? '[]');
			return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : [];
		} catch {
			return [];
		}
	}

	let catalog = $state<EditorCatalog | null>(null);
	let error = $state<string | null>(null);
	let written = $state<string[]>(loadWritten());

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

	function noteWritten(...files: string[]) {
		for (const file of files) if (!written.includes(file)) written = [...written, file];
		try {
			sessionStorage.setItem(WRITTEN_KEY, JSON.stringify(written));
		} catch {
			/* private mode or storage blocked: the in-memory list still works for this page view */
		}
	}

	const segments = $derived((page.params.path ?? '').split('/').filter(Boolean));
	const edit = (path: string) => resolve('/edit/[...path]', { path });

	const knownTags = $derived(
		catalog ? [...new Set(catalog.tools.flatMap((t) => t.tags))].sort() : []
	);
	const NO_ASSETS = { icon: null, shots: [] };
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
	{:else if segments[0] === 'new' && segments.length === 1}
		<ToolForm
			initial={emptyTool()}
			categories={catalog.categories}
			assets={NO_ASSETS}
			{knownTags}
			onsaved={(id, file) => {
				noteWritten(file);
				void reload().then(() => goto(edit(`tools/${id}`)));
			}}
		/>
	{:else if segments[0] === 'tools' && segments.length === 2}
		{@const tool = catalog.tools.find((t) => t.id === segments[1])}
		{#if tool}
			{#key tool.id}
				<ToolForm
					id={tool.id}
					initial={toDraft(tool)}
					categories={catalog.categories}
					assets={tool.assets}
					{knownTags}
					onsaved={(_, file) => {
						noteWritten(file);
						void reload();
					}}
					ondeleted={(id) => {
						noteWritten(`tools/${id}/ (deleted)`);
						void reload().then(() => goto(edit('')));
					}}
				/>
			{/key}
		{:else}
			<p class="text-[13.5px] text-muted">
				No tool {segments[1]}. <a href={edit('')} class="text-accent">Back to tools</a>
			</p>
		{/if}
	{:else if segments[0] === 'categories' && segments.length === 1}
		{#key catalog}
			<CategoriesEditor
				categories={catalog.categories}
				tools={catalog.tools}
				onsaved={(file) => {
					noteWritten(file);
					void reload();
				}}
			/>
		{/key}
	{:else if segments[0] === 'sections' && segments.length === 2}
		{@const section = sections(catalog.categories).find((s) => s.id === segments[1])}
		{#if section}
			{#key section.id}
				{#key catalog}
					<SectionRanking
						{section}
						tools={catalog.tools}
						onsaved={(changed) => {
							noteWritten(...changed.map((id) => `tools/${id}/about.yaml`));
							void reload();
						}}
					/>
				{/key}
			{/key}
		{:else}
			<p class="text-[13.5px] text-muted">
				No section {segments[1]}. <a href={edit('')} class="text-accent">Back to tools</a>
			</p>
		{/if}
	{:else}
		<p class="text-[13.5px] text-muted">
			Nothing at /edit/{segments.join('/')}.
			<a href={edit('')} class="text-accent">Back to tools</a>
		</p>
	{/if}
</EditorShell>
