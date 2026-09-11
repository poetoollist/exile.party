<script lang="ts">
	import { resolve } from '$app/paths';
	import { STATUS_LABEL } from '$lib/catalog/display';
	import { isStale } from '$lib/catalog/filter';
	import { today } from './form';
	import { INPUT } from './styles';
	import type { EditorCatalog } from './types';

	interface Props {
		catalog: EditorCatalog;
	}

	let { catalog }: Props = $props();

	let query = $state('');
	const now = today();

	/* Grouped by primary category only; alsoIn is a fact on the tool, not a second listing here. */
	const groups = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return catalog.categories
			.map((category) => ({
				category,
				tools: catalog.tools
					.filter((t) => t.category === category.id)
					.filter((t) => !q || t.name.toLowerCase().includes(q) || t.id.includes(q))
					.sort((a, b) => a.name.localeCompare(b.name))
			}))
			.filter((group) => group.tools.length > 0);
	});

	const edit = (path: string) => resolve('/edit/[...path]', { path });
</script>

<div class="flex items-center gap-3">
	<input
		type="search"
		placeholder="Filter by name or id"
		aria-label="Filter tools"
		bind:value={query}
		class="{INPUT} max-w-sm"
	/>
	<span class="text-[12.5px] text-faint">{catalog.tools.length} tools</span>
</div>

{#each groups as group (group.category.id)}
	<section class="mt-6">
		<h2 class="text-[12.5px] font-medium tracking-tight text-muted">
			{group.category.name}
			<span class="font-normal text-faint">{group.category.id}</span>
		</h2>
		<ul class="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
			{#each group.tools as tool (tool.id)}
				<li>
					<a
						href={edit(`tools/${tool.id}`)}
						class="flex items-center gap-3 px-3 py-2 text-[13.5px] hover:bg-surface-hover"
					>
						<span class="min-w-0 flex-1 truncate text-ink">{tool.name}</span>
						<code class="font-mono text-[12px] text-faint">{tool.id}</code>
						{#if tool.status !== 'active'}
							<span class="rounded border border-line px-1 text-[10.5px] leading-4 text-faint">
								{STATUS_LABEL[tool.status]}
							</span>
						{/if}
						{#if isStale(tool.lastVerified, now)}
							<span
								class="rounded border border-line px-1 text-[10.5px] leading-4 text-faint"
								title="Last verified {tool.lastVerified}"
							>
								Stale
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}

{#if groups.length === 0}
	<p class="mt-6 text-[13.5px] text-faint">No tools match.</p>
{/if}
