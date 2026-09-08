import type { Tool } from './schema';

const SAME_CATEGORY = 4;

/** Every section a tool is listed under: its primary category and any `alsoIn`. */
function categoriesOf(t: Tool): string[] {
	return [t.category, ...t.alsoIn];
}

function sharesCategory(a: Tool, b: Tool): boolean {
	const mine = categoriesOf(a);
	return categoriesOf(b).some((c) => mine.includes(c));
}

/** A shared category, primary or secondary, outranks any number of shared tags on this catalogue; a shared game is a tiebreak. */
function score(a: Tool, b: Tool): number {
	let s = sharesCategory(a, b) ? SAME_CATEGORY : 0;
	s += b.tags.filter((t) => a.tags.includes(t)).length;
	if (b.games.some((g) => a.games.includes(g))) s += 1;
	return s;
}

/** Up to `n` neighbours for "You might also want". Fewer when nothing else relates. */
export function relatedTools(tool: Tool, all: readonly Tool[], n = 3): Tool[] {
	return all
		.filter((t) => t.id !== tool.id)
		.map((t) => ({ t, s: score(tool, t) }))
		.filter((x) => x.s > 0)
		.sort((a, b) => b.s - a.s || a.t.name.localeCompare(b.t.name))
		.slice(0, n)
		.map((x) => x.t);
}
