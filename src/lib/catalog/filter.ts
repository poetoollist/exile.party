import { Game, Language, Platform, Pricing, type Tool } from './schema';

export const STALE_AFTER_DAYS = 180;

export const CODES = ['open', 'closed'] as const;
export type Code = (typeof CODES)[number];
/** English is the shared baseline, so only additional languages constrain results. */
export const FILTER_LANGUAGES = Language.options.filter((language) => language !== 'en');

export interface Filters {
	game: Game | null;
	/** Any of; an empty set is no constraint. Same for pricing, code and languages. */
	platforms: Platform[];
	pricing: Pricing[];
	code: Code[];
	languages: Exclude<Language, 'en'>[];
}

export const EMPTY_FILTERS: Filters = {
	game: null,
	platforms: [],
	pricing: [],
	code: [],
	languages: []
};

/** `now` is the build timestamp (ISO string) so prerendered HTML matches hydration. */
export function isStale(lastVerified: string, now: string, days = STALE_AFTER_DAYS): boolean {
	return Date.parse(now) - Date.parse(lastVerified) > days * 864e5;
}

function anyOf<T>(set: readonly T[], value: T): boolean {
	return set.length === 0 || set.includes(value);
}

export function filterTools(tools: readonly Tool[], f: Filters): Tool[] {
	return tools.filter(
		(t) =>
			(f.game === null || t.games.includes(f.game)) &&
			(f.platforms.length === 0 || t.platforms.some((p) => f.platforms.includes(p))) &&
			anyOf(f.pricing, t.pricing) &&
			anyOf(f.code, t.openSource ? 'open' : 'closed') &&
			(f.languages.length === 0 || f.languages.some((language) => t.languages.includes(language)))
	);
}

/** Palette rank: name start, name, tag, description. 4 is no match. */
function rank(t: Tool, q: string): number {
	const name = t.name.toLowerCase();
	if (name.startsWith(q)) return 0;
	if (name.includes(q)) return 1;
	if (t.tags.some((tag) => tag.includes(q))) return 2;
	if (t.description.toLowerCase().includes(q)) return 3;
	return 4;
}

/** Ranked matches for the search palette. A blank query finds nothing. */
export function searchTools(tools: readonly Tool[], query: string): Tool[] {
	const q = query.trim().toLowerCase();
	if (q === '') return [];
	return tools
		.map((t) => ({ t, r: rank(t, q) }))
		.filter((x) => x.r < 4)
		.sort((a, b) => a.r - b.r || a.t.name.localeCompare(b.t.name))
		.map((x) => x.t);
}

/** Game lives in the top bar, so it does not count. */
export function activeFilterCount(f: Filters): number {
	return f.platforms.length + f.pricing.length + f.code.length + f.languages.length;
}

export function toggle<T>(list: readonly T[], value: T): T[] {
	return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const KEYS = {
	game: 'game',
	platforms: 'platform',
	pricing: 'price',
	code: 'code',
	languages: 'language'
} as const;

/** Schema order, so the same selection always gives the same URL. */
function canonical<T extends string>(set: readonly T[], allowed: readonly T[]): string {
	return allowed.filter((a) => set.includes(a)).join(',');
}

/** Filters round-trip through the querystring so a filtered view is shareable. */
export function toSearchParams(f: Filters): URLSearchParams {
	const p = new URLSearchParams();
	if (f.game) p.set(KEYS.game, f.game);
	if (f.platforms.length) p.set(KEYS.platforms, canonical(f.platforms, Platform.options));
	if (f.pricing.length) p.set(KEYS.pricing, canonical(f.pricing, Pricing.options));
	if (f.code.length) p.set(KEYS.code, canonical(f.code, CODES));
	if (f.languages.length) p.set(KEYS.languages, canonical(f.languages, FILTER_LANGUAGES));
	return p;
}

function pickSet<T extends string>(v: string | null, allowed: readonly T[]): T[] {
	const parts = new Set((v ?? '').split(','));
	return allowed.filter((a) => parts.has(a));
}

export function fromSearchParams(p: URLSearchParams): Filters {
	const game = Game.safeParse(p.get(KEYS.game));
	return {
		game: game.success ? game.data : null,
		platforms: pickSet(p.get(KEYS.platforms), Platform.options),
		pricing: pickSet(p.get(KEYS.pricing), Pricing.options),
		code: pickSet(p.get(KEYS.code), CODES),
		languages: pickSet(p.get(KEYS.languages), FILTER_LANGUAGES)
	};
}
