<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CategoryRail, { type RailItem } from '$lib/components/CategoryRail.svelte';
	import FiltersPanel from '$lib/components/FiltersPanel.svelte';
	import SearchPalette from '$lib/components/SearchPalette.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import ToolCard from '$lib/components/ToolCard.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import { GAME_NAME } from '$lib/catalog/display';
	import {
		EMPTY_FILTERS,
		filterTools,
		fromSearchParams,
		toSearchParams,
		type Filters
	} from '$lib/catalog/filter';
	import { groupBySection, inSection, sections, sectionPreview } from '$lib/catalog/home';
	import { Platform, type Catalog, type Game } from '$lib/catalog/schema';
	import { searchPalette } from '$lib/search.svelte';
	import { submitDialog } from '$lib/submit.svelte';

	interface Props {
		catalog: Catalog;
		/** Fixes the game to a route, e.g. `/poe1`. Unset on `/tools`, where the toggle picks it. */
		lock?: Game;
	}

	let { catalog, lock }: Props = $props();

	// svelte-ignore state_referenced_locally (lock is fixed for the life of the component: the game page keys on it.)
	let filters = $state<Filters>({ ...EMPTY_FILTERS, game: lock ?? null });
	let synced = $state(false);

	/** Sections the visitor has opened past their first six. */
	let expanded = $state<string[]>([]);

	// The page is prerendered without a querystring, so filters are read on the client.
	onMount(() => {
		const next = fromSearchParams(new URL(location.href).searchParams);
		filters = lock ? { ...next, game: lock } : next;
		synced = true;
	});

	$effect(() => {
		const qs = toSearchParams(lock ? { ...filters, game: null } : filters).toString();
		if (!synced || location.search.replace(/^\?/, '') === qs) return;
		const here = lock ? resolve('/[game=game]', { game: lock }) : resolve('/tools');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path comes from resolve(); the rule cannot see through the query concatenation
		replaceState(`${here}${qs ? `?${qs}` : ''}${location.hash}`, {});
	});

	/** The pool this view can ever show: the game's slice, or the whole catalogue. */
	const pool = $derived(
		filters.game ? catalog.tools.filter((t) => t.games.includes(filters.game!)) : catalog.tools
	);

	/** Platforms any pooled tool runs on, in schema order, so the panel never offers an empty box. */
	const platforms = $derived(
		Platform.options.filter((p) => pool.some((t) => t.platforms.includes(p)))
	);

	const visible = $derived(filterTools(pool, filters));

	/** Start here, then every catalogue category. */
	const secs = $derived(sections(catalog.categories));
	const groups = $derived(groupBySection(secs, visible));

	/** Every section with a tool in the pool, counted after filters; a filtered-out one stays, dimmed. */
	const rail = $derived<RailItem[]>(
		secs
			.filter((s) => pool.some((t) => inSection(t, s.id)))
			.map((s) => ({
				id: s.id,
				name: s.name,
				count: visible.filter((t) => inSection(t, s.id)).length
			}))
	);

	/** Count a value would give on its own within its set, honouring the other sets. */
	function countFor(over: Partial<Filters>): number {
		return filterTools(pool, { ...filters, ...over }).length;
	}

	function reset() {
		filters = { ...EMPTY_FILTERS, game: filters.game };
	}
</script>

{#if lock}
	<TopBar context={lock} onsearch={() => searchPalette.show()} />
{:else}
	<TopBar bind:game={filters.game} onsearch={() => searchPalette.show()} />
{/if}

<SearchPalette tools={pool} categories={catalog.categories} scope={filters.game} />

<main class="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
	<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
		<h1 class="text-[22px] leading-tight font-medium tracking-tight text-ink">
			{filters.game ? `${GAME_NAME[filters.game]} tools` : 'All tools'}
		</h1>
		<div class="flex items-center gap-3">
			<p class="text-[12.5px] text-faint tabular-nums">
				{visible.length}
				{#if visible.length !== pool.length}
					<span class="text-faint/70">of {pool.length}</span>
				{/if}
				{pool.length === 1 && visible.length === pool.length ? 'tool' : 'tools'}
			</p>
			<FiltersPanel
				bind:filters
				{platforms}
				shown={visible.length}
				total={pool.length}
				{countFor}
			/>
		</div>
	</div>

	<div
		class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-6 lg:mt-8 lg:grid-cols-[232px_minmax(0,1fr)]"
	>
		<div class="min-w-0 lg:sticky lg:top-20 lg:self-start">
			<CategoryRail items={rail} />
		</div>

		<div class="min-w-0">
			{#if visible.length === 0}
				<div class="rounded-lg border border-dashed border-line px-4 py-14 text-center">
					<p class="text-[14px] text-ink">No tools match these filters.</p>
					<button
						type="button"
						onclick={reset}
						class="mt-2 text-[13px] text-accent transition-colors duration-100"
					>
						Reset all
					</button>
				</div>
			{:else}
				{#each groups as group, i (group.id)}
					{@const preview = expanded.includes(group.id)
						? { shown: group.tools, hidden: 0 }
						: sectionPreview(group.tools)}
					<section id="cat-{group.id}" class="scroll-mt-28 md:scroll-mt-20 {i > 0 ? 'mt-12' : ''}">
						<div class="mb-4">
							<h2 class="text-[15px] leading-tight font-medium tracking-tight text-ink">
								{group.name}
							</h2>
							{#if group.description}
								<p class="mt-1 text-[13px] text-muted">{group.description}</p>
							{/if}
						</div>
						<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each preview.shown as tool (tool.id)}
								<ToolCard {tool} />
							{/each}
						</ul>
						{#if preview.hidden > 0}
							<button
								type="button"
								onclick={() => (expanded = [...expanded, group.id])}
								class="mt-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors duration-100 hover:text-ink"
							>
								Browse all {group.tools.length}
								<svg
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.4"
									aria-hidden="true"
									class="size-3.5"
								>
									<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</button>
						{/if}
					</section>
				{/each}
			{/if}
		</div>
	</div>

	<div
		class="mt-16 flex flex-col gap-4 rounded-lg border border-line p-5 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<h2 class="text-[15px] font-medium text-ink">Missing a tool?</h2>
			<p class="mt-1 text-[13px] leading-snug text-muted">
				The catalogue is a single YAML file. Open an issue or send a pull request.
			</p>
		</div>
		<button
			type="button"
			onclick={() => submitDialog.show()}
			class="inline-flex h-8 shrink-0 items-center rounded-md bg-accent-fill px-3 text-[12.5px] font-medium text-accent-on-fill transition-opacity duration-100 hover:opacity-90"
		>
			Submit a tool
		</button>
	</div>
</main>

<SiteFooter />
