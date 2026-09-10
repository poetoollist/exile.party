import { START_HERE_ID, type Category, type Game, type Tool } from './schema';

export function countByGame(tools: readonly Tool[]): Record<Game, number> {
	return {
		poe1: tools.filter((t) => t.games.includes('poe1')).length,
		poe2: tools.filter((t) => t.games.includes('poe2')).length
	};
}

/** The virtual section the directory leads with. Not a catalogue category: `tools.yaml` cannot define it. */
export const START_HERE: Category = {
	id: START_HERE_ID,
	name: 'Start here',
	description: 'If you are a new player, these are the tools you need and can rely on.'
};

const rankOf = (t: Tool, sectionId: string) => t.rank?.[sectionId] ?? Number.MAX_SAFE_INTEGER;

/** Ranked tools first ascending within `sectionId`; equal ranks and unranked tools A to Z. Returns a new array. */
export function sortTools(tools: readonly Tool[], sectionId: string): Tool[] {
	return [...tools].sort(
		(a, b) => rankOf(a, sectionId) - rankOf(b, sectionId) || a.name.localeCompare(b.name)
	);
}

/** Start here, then the catalogue categories in their own order. */
export function sections(categories: readonly Category[]): Category[] {
	return [START_HERE, ...categories];
}

/** Start here holds the new-player tools; a category holds its primary tools and its `alsoIn` tools. */
export function inSection(tool: Tool, sectionId: string): boolean {
	if (sectionId === START_HERE_ID) return tool.newPlayer;
	return tool.category === sectionId || tool.alsoIn.includes(sectionId);
}

export interface CategoryGroup extends Category {
	tools: Tool[];
}

/** Section order, `sortTools` inside each by that section's own rank, empty sections dropped. A tool appears in every section it belongs to. */
export function groupBySection(secs: readonly Category[], tools: readonly Tool[]): CategoryGroup[] {
	return secs
		.map((s) => ({
			...s,
			tools: sortTools(
				tools.filter((t) => inSection(t, s.id)),
				s.id
			)
		}))
		.filter((g) => g.tools.length > 0);
}

export const SECTION_PREVIEW = 6;

/** A long section shows its first `limit` tools and a "Browse all" for the rest. */
export function sectionPreview<T>(
	items: readonly T[],
	limit = SECTION_PREVIEW
): { shown: T[]; hidden: number } {
	if (items.length <= limit) return { shown: [...items], hidden: 0 };
	return { shown: items.slice(0, limit), hidden: items.length - limit };
}
