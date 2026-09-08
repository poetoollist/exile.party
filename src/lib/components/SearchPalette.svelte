<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { iconUrl } from '$lib/catalog/assets';
	import { GAME_LABEL, monogram } from '$lib/catalog/display';
	import { searchTools } from '$lib/catalog/filter';
	import type { Category, Game, Tool } from '$lib/catalog/schema';
	import { searchPalette } from '$lib/search.svelte';

	interface Props {
		tools: readonly Tool[];
		categories: readonly Category[];
		/** The game a locked page shows, named in the placeholder. */
		scope: Game | null;
	}

	let { tools, categories, scope }: Props = $props();

	const LIMIT = 8;

	let el = $state<HTMLDialogElement | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	let query = $state('');
	let cursor = $state(0);

	const results = $derived(searchTools(tools, query).slice(0, LIMIT));
	const categoryName = $derived(new Map(categories.map((c) => [c.id, c.name])));
	const current = $derived(results[cursor] ?? null);

	$effect(() => {
		if (!el) return;
		if (searchPalette.open && !el.open) {
			query = '';
			cursor = 0;
			el.showModal();
			input?.focus();
		} else if (!searchPalette.open && el.open) {
			el.close();
		}
	});

	// Removing an open <dialog> from the DOM (e.g. a client-side route change while the
	// palette is open) never fires `close`, so `onclose` below never runs. Without this,
	// the store stays open and the next page's fresh palette pops open unrequested.
	$effect(() => () => searchPalette.hide());

	// A new result list starts from the top.
	$effect(() => {
		void results;
		cursor = 0;
	});

	function typing(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		);
	}

	function onwindowkeydown(event: KeyboardEvent) {
		if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			if (searchPalette.open) searchPalette.hide();
			else searchPalette.show();
		} else if (event.key === '/' && !searchPalette.open && !typing(event.target)) {
			event.preventDefault();
			searchPalette.show();
		}
	}

	async function pick(tool: Tool) {
		searchPalette.hide();
		await goto(resolve('/tools/[id]', { id: tool.id }));
	}

	function oninputkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (results.length) cursor = (cursor + 1) % results.length;
			scrollToActive();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (results.length) cursor = (cursor - 1 + results.length) % results.length;
			scrollToActive();
		} else if (event.key === 'Enter' && current) {
			event.preventDefault();
			void pick(current);
		}
	}

	/** The APG combobox pattern requires the active option to stay in view as the cursor moves. */
	function scrollToActive() {
		if (!results.length) return;
		document.getElementById(`search-${results[cursor].id}`)?.scrollIntoView({ block: 'nearest' });
	}

	/** <dialog> counts the backdrop as part of itself, so a click on it lands on the element. */
	function onclick(event: MouseEvent) {
		if (event.target === el) searchPalette.hide();
	}

	/** A row is never focused: the input keeps the focus and names the row through
	    aria-activedescendant. This only satisfies the compiler's click/key pairing rule. */
	function onrowkeydown() {}
</script>

<svelte:window onkeydown={onwindowkeydown} />

<dialog
	bind:this={el}
	{onclick}
	onclose={() => searchPalette.hide()}
	aria-label="Search tools"
	class="m-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/55"
>
	<div class="flex items-center gap-2.5 border-b border-line px-4">
		<svg
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			aria-hidden="true"
			class="size-4 shrink-0 text-faint"
		>
			<circle cx="7" cy="7" r="4.5" />
			<path d="m10.5 10.5 3 3" stroke-linecap="round" />
		</svg>
		<input
			bind:this={input}
			bind:value={query}
			type="search"
			placeholder={scope ? `Search ${GAME_LABEL[scope]} tools` : 'Search tools'}
			aria-label="Search tools"
			role="combobox"
			aria-expanded={results.length > 0}
			aria-controls={results.length > 0 ? 'search-results' : undefined}
			aria-activedescendant={current ? `search-${current.id}` : undefined}
			aria-autocomplete="list"
			autocomplete="off"
			onkeydown={oninputkeydown}
			class="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
		/>
		<kbd class="rounded border border-line px-1.5 font-sans text-[10.5px] text-faint">Esc</kbd>
	</div>

	{#if query.trim() === ''}
		<p class="px-4 py-8 text-center text-[13px] text-faint">Type to search {tools.length} tools</p>
	{:else if results.length === 0}
		<p role="status" class="px-4 py-8 text-center text-[13px] text-faint">
			Nothing matches “{query.trim()}”
		</p>
	{:else}
		<ul
			id="search-results"
			role="listbox"
			aria-label="Results"
			class="max-h-[60vh] overflow-y-auto p-2"
		>
			{#each results as tool, i (tool.id)}
				{@const icon = iconUrl(tool)}
				<li
					id="search-{tool.id}"
					role="option"
					aria-selected={i === cursor}
					tabindex="-1"
					onclick={() => void pick(tool)}
					onkeydown={onrowkeydown}
					onpointermove={() => (cursor = i)}
					class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 {i === cursor
						? 'bg-surface-hover'
						: ''}"
				>
					{#if icon}
						<img
							src={icon}
							alt=""
							width="28"
							height="28"
							class="size-7 rounded border border-line"
						/>
					{:else}
						<span
							aria-hidden="true"
							class="grid size-7 shrink-0 place-items-center rounded border border-line text-[12px] font-medium text-muted"
						>
							{monogram(tool.name)}
						</span>
					{/if}
					<span class="min-w-0 flex-1">
						<span class="flex items-baseline gap-2">
							<span class="truncate text-[13.5px] font-medium text-ink">{tool.name}</span>
							<span class="shrink-0 text-[11.5px] text-faint">
								{categoryName.get(tool.category) ?? tool.category}
							</span>
						</span>
						<span class="block truncate text-[12.5px] text-muted">{tool.description}</span>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</dialog>
