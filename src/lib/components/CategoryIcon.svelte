<script lang="ts">
	import { START_HERE_ID } from '$lib/catalog/schema';

	interface Props {
		id: string;
		class?: string;
	}

	let { id, class: className = '' }: Props = $props();

	/** Path data per category id, drawn on a 16-unit grid at stroke 1.3. */
	const PATHS: Record<string, string> = {
		[START_HERE_ID]:
			'M8 2.5 9.4 6.4 13.2 6.6 10.3 9 11.2 12.8 8 10.7 4.8 12.8 5.7 9 2.8 6.6 6.6 6.4Z',
		'build-planning': 'M8 2v4M8 6 4 10M8 6l4 4M4 10v4M12 10v4M2.5 14h3M10.5 14h3',
		trade: 'M2.5 5.5h9l-2.5-2.5M13.5 10.5h-9l2.5 2.5',
		crafting: 'M9.5 2.5 13.5 6.5 6 14l-4-4ZM2 14h4M9.5 6.5l-1-1',
		'atlas-and-maps': 'M2 4.5 6 3l4 1.5 4-1.5v8.5L10 13 6 11.5 2 13ZM6 3v8.5M10 4.5V13',
		'regex-and-search':
			'M6.5 10.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9.5 9.5l4 4M6.5 4.5v4M4.8 5.5l3.4 2M4.8 7.5l3.4-2',
		'loot-filters': 'M2.5 3h11L9.5 8.5V13l-3 1V8.5Z',
		'overlays-and-companions': 'M8 2.5 14 5.5 8 8.5 2 5.5ZM2 8.5l6 3 6-3M2 11.5l6 3 6-3',
		'economy-and-data': 'M2.5 13.5h11M4 11V8M7 11V5M10 11V7M13 11V3.5',
		'leveling-and-guides':
			'M8 3.5v10M8 3.5c-1.5-1-3.5-1-5.5 0v9c2-1 4-1 5.5 0M8 3.5c1.5-1 3.5-1 5.5 0v9c-2-1-4-1-5.5 0',
		community:
			'M6 8a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 6 8ZM11 7a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 11 7ZM1.5 13.5c.5-2.5 2.5-3.5 4.5-3.5s4 1 4.5 3.5M11 10.5c1.8 0 3 1 3.5 3',
		'league-specific': 'M3.5 2v12M3.5 3h9l-2 3 2 3h-9'
	};

	const GRID = 'M2.5 2.5h4.5v4.5H2.5ZM9 2.5h4.5V7H9ZM2.5 9H7v4.5H2.5ZM9 9h4.5v4.5H9Z';

	const d = $derived(PATHS[id] ?? GRID);
</script>

<svg
	viewBox="0 0 16 16"
	fill="none"
	stroke="currentColor"
	stroke-width="1.3"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class={className}
>
	<path {d} />
</svg>
