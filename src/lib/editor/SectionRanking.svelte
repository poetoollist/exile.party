<script lang="ts">
	import { untrack } from 'svelte';
	import { sectionOrder } from '$lib/catalog/ranking';
	import type { Category, Tool } from '$lib/catalog/schema';
	import { api, EditorApiError, errorText } from './api';
	import { BUTTON, PRIMARY, SMALL } from './styles';

	interface Props {
		/** A catalog category or the Start here section from `sections()`. */
		section: Category;
		tools: Tool[];
		/** After a successful write, with the ids whose about.yaml changed. */
		onsaved: (changed: string[]) => void;
	}

	let { section, tools, onsaved }: Props = $props();

	const order = untrack(() => sectionOrder(tools, section.id));
	const byId = untrack(() => new Map(tools.map((t) => [t.id, t])));
	const memberIds = untrack(() => [...order.ranked, ...order.unranked].map((t) => t.id));

	let ranked = $state(order.ranked.map((t) => t.id));
	let baseline = $state(order.ranked.map((t) => t.id).join(','));
	let serverError = $state<string | null>(null);
	let busy = $state(false);

	const unranked = $derived(
		memberIds
			.filter((id) => !ranked.includes(id))
			.map((id) => byId.get(id)!)
			.sort((a, b) => a.name.localeCompare(b.name))
	);
	const dirty = $derived(ranked.join(',') !== baseline);
	const canSave = $derived(dirty && !busy);

	function moved(from: number, to: number) {
		if (to < 0 || to >= ranked.length) return;
		const next = [...ranked];
		const [id] = next.splice(from, 1);
		next.splice(to, 0, id);
		ranked = next;
	}

	async function save() {
		if (!canSave) return;
		busy = true;
		serverError = null;
		try {
			const saved = await api.saveRanking(section.id, ranked);
			baseline = ranked.join(',');
			onsaved(saved.changed);
		} catch (error) {
			serverError =
				error instanceof EditorApiError && error.issues.length > 0
					? error.issues.map((i) => i.message).join('; ')
					: errorText(error);
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-baseline justify-between gap-4">
		<h1 class="text-[15px] font-medium tracking-tight">{section.name}</h1>
		<code class="font-mono text-[12px] text-faint">rank.{section.id}</code>
	</div>
	<p class="text-[13px] text-muted">
		Ranked tools lead the section in this order; the rest follow A to Z. Saving rewrites
		<code class="font-mono text-[12px]">rank</code> in every affected about.yaml.
	</p>

	{#if serverError}
		<p class="rounded-md border border-line bg-surface p-3 text-[12.5px] text-danger">
			{serverError}
		</p>
	{/if}

	<div class="grid gap-6 md:grid-cols-2">
		<section>
			<h2 class="text-[12.5px] font-medium text-muted">Ranked</h2>
			{#if ranked.length === 0}
				<p class="mt-2 text-[13px] text-faint">Nothing ranked; the section is A to Z.</p>
			{:else}
				<ol class="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
					{#each ranked as id, i (id)}
						<li class="flex items-center gap-3 px-3 py-2 text-[13.5px]">
							<span class="w-5 font-mono text-[12px] text-faint">{i + 1}</span>
							<span class="min-w-0 flex-1 truncate text-ink">{byId.get(id)?.name ?? id}</span>
							<button
								type="button"
								class={SMALL}
								disabled={i === 0}
								aria-label="Move {id} up"
								onclick={() => moved(i, i - 1)}>↑</button
							>
							<button
								type="button"
								class={SMALL}
								disabled={i === ranked.length - 1}
								aria-label="Move {id} down"
								onclick={() => moved(i, i + 1)}>↓</button
							>
							<button
								type="button"
								class={SMALL}
								onclick={() => (ranked = ranked.filter((r) => r !== id))}
							>
								Unrank
							</button>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<section>
			<h2 class="text-[12.5px] font-medium text-muted">Unranked, A to Z</h2>
			{#if unranked.length === 0}
				<p class="mt-2 text-[13px] text-faint">Every tool in the section is ranked.</p>
			{:else}
				<ul class="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
					{#each unranked as tool (tool.id)}
						<li class="flex items-center gap-3 px-3 py-2 text-[13.5px]">
							<span class="min-w-0 flex-1 truncate text-ink">{tool.name}</span>
							<button type="button" class={SMALL} onclick={() => (ranked = [...ranked, tool.id])}>
								Rank
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<div class="flex items-center gap-3 border-t border-line pt-4">
		<button type="button" class={PRIMARY} disabled={!canSave} onclick={save}>
			{busy ? 'Saving' : 'Save'}
		</button>
		<button
			type="button"
			class={BUTTON}
			disabled={!dirty || busy}
			onclick={() => (ranked = baseline ? baseline.split(',') : [])}
		>
			Reset
		</button>
		{#if !dirty}
			<span class="text-[12.5px] text-faint">No changes</span>
		{/if}
	</div>
</div>
