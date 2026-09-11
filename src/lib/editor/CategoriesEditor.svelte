<script lang="ts">
	import { messagesAt, zodIssues, type Issue } from '$lib/catalog/issues';
	import { CategoryFile, type Category, type Tool } from '$lib/catalog/schema';
	import { categoriesYaml } from '$lib/catalog/yaml';
	import { SvelteSet } from 'svelte/reactivity';
	import { api, EditorApiError, errorText } from './api';
	import Field from './Field.svelte';
	import { BUTTON, INPUT, PRIMARY, SMALL } from './styles';

	interface Props {
		categories: Category[];
		tools: Tool[];
		/** After a successful write, with the repo path written. */
		onsaved: (file: string) => void;
	}

	let { categories, tools, onsaved }: Props = $props();

	/* Ids of loaded categories are locked because they are URLs and section keys in about.yaml;
	   rows added here stay editable. */
	type Row = Category & { locked: boolean };

	let rows = $state<Row[]>(
		structuredClone($state.snapshot(categories)).map((c) => ({ ...c, locked: true }))
	);
	let baseline = $state(categoriesYaml(categories));
	let serverIssues = $state<Issue[]>([]);
	let serverError = $state<string | null>(null);
	let busy = $state(false);

	const cleaned = $derived(
		rows.map((row) => ({
			id: row.id.trim(),
			name: row.name.trim(),
			description: row.description?.trim() || undefined
		}))
	);
	const parsed = $derived(CategoryFile.safeParse({ categories: cleaned }));
	const issues = $derived.by(() => {
		const list = parsed.success ? [] : zodIssues(parsed.error);
		const seen = new SvelteSet<string>();
		cleaned.forEach((category, i) => {
			if (seen.has(category.id)) {
				list.push({ path: `categories.${i}.id`, message: `${category.id} is used twice` });
			}
			seen.add(category.id);
		});
		return list;
	});
	const yaml = $derived(categoriesYaml(cleaned));
	const dirty = $derived(yaml !== baseline);
	const canSave = $derived(issues.length === 0 && dirty && !busy);
	const at = (i: number, field: string) => messagesAt(issues, `categories.${i}.${field}`);

	const usedBy = (id: string) =>
		tools.filter((t) => t.category === id || t.alsoIn.includes(id)).length;

	function moved(from: number, to: number) {
		if (to < 0 || to >= rows.length) return;
		const next = [...rows];
		const [row] = next.splice(from, 1);
		next.splice(to, 0, row);
		rows = next;
	}

	function add() {
		rows = [...rows, { id: '', name: '', description: '', locked: false }];
	}

	function remove(i: number) {
		rows = rows.filter((_, j) => j !== i);
	}

	async function save() {
		if (!canSave) return;
		busy = true;
		serverIssues = [];
		serverError = null;
		try {
			const saved = await api.saveCategories(cleaned);
			baseline = saved.yaml;
			onsaved('tools/categories.yaml');
		} catch (error) {
			if (error instanceof EditorApiError && error.issues.length > 0) serverIssues = error.issues;
			else serverError = errorText(error);
		} finally {
			busy = false;
		}
	}
</script>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
	<form
		class="flex flex-col gap-4"
		onsubmit={(event) => {
			event.preventDefault();
			void save();
		}}
	>
		<div class="flex items-baseline justify-between gap-4">
			<h1 class="text-[15px] font-medium tracking-tight">Categories</h1>
			<code class="font-mono text-[12px] text-faint">tools/categories.yaml</code>
		</div>

		{#if serverError || serverIssues.length > 0}
			<div class="rounded-md border border-line bg-surface p-3 text-[12.5px]">
				{#if serverError}
					<p class="text-danger">{serverError}</p>
				{/if}
				{#each serverIssues as issue, i (i)}
					<p class="text-danger">
						<code class="font-mono text-[12px]">{issue.path}</code>
						{issue.message}
					</p>
				{/each}
			</div>
		{/if}

		<ol class="flex flex-col gap-3">
			{#each rows as row, i (i)}
				{@const locked = row.locked}
				{@const uses = usedBy(row.id)}
				<li
					class="grid gap-2 rounded-md border border-line bg-surface p-3 sm:grid-cols-[10rem_1fr]"
				>
					<Field label="Id" id="category-{i}-id" issues={at(i, 'id')}>
						<input
							id="category-{i}-id"
							class="{INPUT} font-mono"
							bind:value={rows[i].id}
							readonly={locked}
						/>
					</Field>
					<Field label="Name" id="category-{i}-name" issues={at(i, 'name')}>
						<input id="category-{i}-name" class={INPUT} bind:value={rows[i].name} />
					</Field>
					<div class="sm:col-span-2">
						<Field
							label="Description"
							id="category-{i}-description"
							hint="Up to 120 characters. {row.description?.length ?? 0}/120"
							issues={at(i, 'description')}
						>
							<input id="category-{i}-description" class={INPUT} bind:value={rows[i].description} />
						</Field>
					</div>
					<div class="flex items-center gap-2 sm:col-span-2">
						<span class="text-[12px] text-faint">
							{uses === 1 ? '1 tool' : `${uses} tools`}
						</span>
						<button
							type="button"
							class="{SMALL} ml-auto"
							disabled={i === 0}
							aria-label="Move {row.id || 'row'} up"
							onclick={() => moved(i, i - 1)}>↑</button
						>
						<button
							type="button"
							class={SMALL}
							disabled={i === rows.length - 1}
							aria-label="Move {row.id || 'row'} down"
							onclick={() => moved(i, i + 1)}>↓</button
						>
						<button
							type="button"
							class={SMALL}
							disabled={uses > 0}
							title={uses > 0 ? 'Still used by a tool' : undefined}
							onclick={() => remove(i)}
						>
							Remove
						</button>
					</div>
				</li>
			{/each}
		</ol>

		<div class="flex items-center gap-3 border-t border-line pt-4">
			<button type="submit" class={PRIMARY} disabled={!canSave}>
				{busy ? 'Saving' : 'Save'}
			</button>
			<button type="button" class={BUTTON} onclick={add}>Add category</button>
			{#if !dirty}
				<span class="text-[12.5px] text-faint">No changes</span>
			{:else if issues.length > 0}
				<span class="text-[12.5px] text-faint">Fix the issues to save</span>
			{/if}
		</div>
	</form>

	<aside class="lg:sticky lg:top-6 lg:self-start">
		<h3 class="font-mono text-[12px] text-muted">tools/categories.yaml</h3>
		<pre
			class="mt-2 max-h-[70vh] overflow-auto rounded-md border border-line bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-muted">{yaml}</pre>
		<p class="mt-3 text-[12px] leading-snug text-faint">
			A new category also needs a path in src/lib/components/CategoryIcon.svelte.
		</p>
	</aside>
</div>
