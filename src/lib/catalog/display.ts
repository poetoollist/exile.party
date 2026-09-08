import type { Game, Tool } from './schema';

/** Leading noise that would make half the directory share a monogram. */
const PREFIXES = [
	/^path of exile\s*2?\s*/i,
	/^path of\s+/i,
	/^poe\s*2?(\b|(?=[A-Z]))[\s.:-]*/i,
	/^the\s+/i
];

/**
 * One-letter mark for a tool card. Strips "Path of Exile" / "PoE" style prefixes first,
 * so "Path of Building" is B and "poe.ninja" is n rather than both being P.
 * Case is preserved: a lowercase brand keeps its lowercase mark.
 */
export function monogram(name: string): string {
	let s = name.trim();
	for (const p of PREFIXES) {
		const stripped = s.replace(p, '').trim();
		if (stripped !== s && /[a-z0-9]/i.test(stripped)) {
			s = stripped;
			break;
		}
	}
	return (s.match(/[a-z0-9]/i) ?? name.trim().match(/\S/) ?? ['?'])[0];
}

/** Bare host for an outbound link, e.g. "pathofbuilding.community". */
export function displayHost(url: string): string {
	try {
		return new URL(url).host.replace(/^www\./, '');
	} catch {
		return url;
	}
}

export interface GameLink {
	/** null when one link covers every game the tool supports. */
	game: Game | null;
	url: string;
}

function perGame(
	map: Partial<Record<Game, string>> | undefined,
	games: readonly Game[]
): GameLink[] {
	return games.flatMap((g) => (map?.[g] ? [{ game: g, url: map[g] }] : []));
}

/** Website links: one per game where they differ, otherwise a single entry. */
export function siteLinks(tool: Tool): GameLink[] {
	const split = perGame(tool.urls, tool.games);
	return split.length > 1 ? split : [{ game: null, url: tool.url }];
}

/** Repository links, empty for closed-source tools. */
export function repoLinks(tool: Tool): GameLink[] {
	const split = perGame(tool.sources, tool.games);
	if (split.length > 0) return split;
	return tool.source ? [{ game: null, url: tool.source }] : [];
}

export const GAME_LABEL = { poe1: 'PoE 1', poe2: 'PoE 2' } as const;
export const GAME_NAME = { poe1: 'Path of Exile', poe2: 'Path of Exile 2' } as const;
export const PLATFORM_LABEL = {
	windows: 'Windows',
	macos: 'macOS',
	linux: 'Linux',
	web: 'Web',
	android: 'Android',
	ios: 'iOS'
} as const;
export const PRICING_LABEL = { free: 'Free', freemium: 'Freemium', paid: 'Paid' } as const;
export const STATUS_LABEL = {
	active: 'Active',
	unmaintained: 'Unmaintained',
	dead: 'Dead'
} as const;

const GITHUB_OWNER = /^https:\/\/github\.com\/([^/]+)\/?/;

/** Who to credit: the stated author, else the GitHub owner of the repository or site, else nothing. */
export function byLine(tool: Tool): string | null {
	if (tool.author) return tool.author;
	for (const url of [tool.source, tool.sources?.poe1, tool.sources?.poe2, tool.url]) {
		const m = url?.match(GITHUB_OWNER);
		if (m) return m[1];
	}
	return null;
}

/** The tool page headline: a sentence about what the tool does, with no full stop at the end. */
export function headline(tool: Tool): string {
	if (tool.headline) return tool.headline;
	// A full stop followed by whitespace or the end closes the sentence; "poe.ninja" does not.
	return tool.description
		.trim()
		.split(/\.(?:\s+|$)/)[0]
		.trim();
}

/** Overview prose that the headline does not already say: the whole description when a headline
 *  was written for the tool, else whatever follows the description's first sentence. */
export function overview(tool: Tool): string | null {
	if (tool.headline) return tool.description;
	const text = tool.description.trim();
	const end = text.match(/\.(?:\s+|$)/);
	if (!end || end.index === undefined) return null;
	const rest = text.slice(end.index + end[0].length).trim();
	return rest === '' ? null : rest;
}
