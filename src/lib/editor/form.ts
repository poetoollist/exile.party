import { START_HERE_ID, type Game, type Platform, type ToolMetadata } from '$lib/catalog/schema';
import { toolYaml } from '$lib/catalog/yaml';
import type { EditorTool } from './types';

/** about.yaml as form state: the list fields may be empty while the user is still choosing. */
export type ToolDraft = Omit<ToolMetadata, 'games' | 'platforms'> & {
	games: Game[];
	platforms: Platform[];
};

export const today = () => new Date().toISOString().slice(0, 10);

export function emptyTool(): ToolDraft {
	return {
		name: '',
		description: '',
		url: '',
		games: [],
		category: '',
		alsoIn: [],
		tags: [],
		platforms: [],
		pricing: 'free',
		openSource: false,
		official: false,
		editorsPick: false,
		newPlayer: false,
		byMaintainer: false,
		status: 'active',
		lastVerified: today(),
		screenshots: [],
		videos: []
	};
}

/** The editable part of a loaded tool: everything but the id and what is on disk. */
export function toDraft(tool: EditorTool): ToolDraft {
	const draft: Record<string, unknown> = { ...tool };
	delete draft.id;
	delete draft.assets;
	return draft as ToolDraft;
}

/** `value` switched on or off in `list`, with the result in the order of `order`. */
export function toggle<T>(list: readonly T[], value: T, order: readonly T[]): T[] {
	const on = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	return order.filter((v) => on.includes(v));
}

/** The sections a draft belongs to: its category, its alsoIn entries, and start-here when it is for new players. */
export function sectionsOf(draft: ToolDraft): string[] {
	const ids = [draft.category, ...draft.alsoIn, ...(draft.newPlayer ? [START_HERE_ID] : [])];
	return [...new Set(ids.filter(Boolean))];
}

const text = (value: string | undefined) => value?.trim() || undefined;

/**
 * The draft as the schema wants it: blank optional text becomes undefined, per-game links only
 * for selected games, repository links only when open source, rank only for sections the tool
 * is in, and empty maps dropped. Returns a new object; the form keeps editing the original.
 */
export function normalizeDraft(draft: ToolDraft): ToolDraft {
	const perGame = (map: Partial<Record<Game, string>> | undefined) => {
		const kept: Partial<Record<Game, string>> = {};
		for (const game of draft.games) {
			const value = text(map?.[game]);
			if (value) kept[game] = value;
		}
		return Object.keys(kept).length > 0 ? kept : undefined;
	};
	const games = new Set(draft.games);
	const sections = new Set(sectionsOf(draft));
	const rank: Record<string, number> = {};
	for (const [section, position] of Object.entries(draft.rank ?? {})) {
		if (sections.has(section) && Number.isInteger(position) && position > 0)
			rank[section] = position;
	}
	return {
		...draft,
		author: text(draft.author),
		headline: text(draft.headline),
		notes: text(draft.notes),
		urls: perGame(draft.urls),
		source: draft.openSource ? text(draft.source) : undefined,
		sources: draft.openSource ? perGame(draft.sources) : undefined,
		rank: Object.keys(rank).length > 0 ? rank : undefined,
		videos: draft.videos.map((video) =>
			video.game && !games.has(video.game) ? { ...video, game: undefined } : video
		)
	};
}

/** The about.yaml text a draft would be written as. */
export function draftYaml(draft: ToolDraft): string {
	return toolYaml(draft as ToolMetadata);
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character id from a bare id or any YouTube watch, share, embed or shorts URL; null otherwise. */
export function youtubeId(input: string): string | null {
	const value = input.trim();
	if (YOUTUBE_ID.test(value)) return value;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^(www|m)\./, '');
	let candidate: string | null = null;
	if (host === 'youtu.be') {
		candidate = url.pathname.split('/')[1] ?? null;
	} else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
		candidate =
			url.searchParams.get('v') ??
			url.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?]+)/)?.[1] ??
			null;
	}
	return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}
