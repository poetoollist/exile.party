<script lang="ts">
	import { onMount } from 'svelte';
	import CategoryIcon from './CategoryIcon.svelte';

	export interface RailItem {
		id: string;
		name: string;
		/** Tools in this section after the current filters. A cross-listed tool counts in every section it belongs to, so the counts can sum past the heading total. 0 means the section is not on the page. */
		count: number;
	}

	interface Props {
		items: RailItem[];
	}

	let { items }: Props = $props();

	let active = $state<string | null>(null);

	function measure() {
		const y = scrollY;
		// The last sections can never reach the line, because the page stops scrolling first.
		// Comparing against the clamped landing position lets them still count as reached.
		const furthest = Math.max(0, document.documentElement.scrollHeight - innerHeight);

		let next: string | null = null;
		for (const item of items) {
			const el = document.getElementById(`cat-${item.id}`);
			if (!el) continue;
			// The same margin the fragment jump uses, so "reached" means exactly where a jump lands.
			const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
			const landing = Math.min(el.getBoundingClientRect().top + y - margin, furthest);
			if (y >= landing - 2) next = item.id;
		}
		active = next ?? items.find((i) => i.count > 0)?.id ?? null;
	}

	onMount(() => {
		let queued = false;
		const onScroll = () => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				measure();
			});
		};

		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll, { passive: true });
		measure();

		return () => {
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
		};
	});

	// measure() reads `items`, so a filter change re-runs this and moves the highlight.
	$effect(measure);
</script>

<!-- Fragment links: the jump works before hydration, and the URL hash names the section. -->
<nav aria-label="Categories" class="min-w-0">
	<ul
		class="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
	>
		{#each items as item (item.id)}
			<li class="shrink-0 lg:shrink">
				{#if item.count === 0}
					<span
						class="flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-[13.5px] whitespace-nowrap text-faint/50"
					>
						<CategoryIcon id={item.id} class="size-4 shrink-0" />
						<span class="lg:flex-1 lg:truncate">{item.name}</span>
						<span class="text-[11.5px] tabular-nums">0</span>
					</span>
				{:else}
					<a
						href="#cat-{item.id}"
						aria-current={active === item.id ? 'true' : undefined}
						class="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-[13.5px] whitespace-nowrap transition-colors duration-100
							{active === item.id
							? 'border-line bg-surface text-ink lg:border-transparent lg:bg-transparent'
							: 'border-line text-muted hover:text-ink lg:border-transparent lg:hover:bg-surface-hover'}"
					>
						<CategoryIcon
							id={item.id}
							class="size-4 shrink-0 {active === item.id ? 'text-ink' : 'text-faint'}"
						/>
						<span class="lg:flex-1 lg:truncate">{item.name}</span>
						<span class="text-[11.5px] text-faint tabular-nums">{item.count}</span>
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</nav>
