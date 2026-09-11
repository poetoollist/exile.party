import { stringify } from 'yaml';
import type { Category, ToolMetadata, Video } from './schema';

/**
 * Key order of every about.yaml. `bun run new-tool` writes it, the editor writes it, and
 * yaml.spec.ts holds every file in tools/ to it.
 */
const TOOL_KEYS: readonly (keyof ToolMetadata)[] = [
	'name',
	'author',
	'headline',
	'description',
	'url',
	'urls',
	'games',
	'category',
	'alsoIn',
	'tags',
	'platforms',
	'pricing',
	'openSource',
	'source',
	'sources',
	'official',
	'byMaintainer',
	'editorsPick',
	'newPlayer',
	'rank',
	'status',
	'lastVerified',
	'notes',
	'screenshots',
	'videos'
];

const VIDEO_KEYS: readonly (keyof Video)[] = ['youtube', 'title', 'channel', 'byCreator', 'game'];

const CATEGORY_KEYS: readonly (keyof Category)[] = ['id', 'name', 'description'];

/** Flags whose schema default is false, so false is left out. `openSource` is required and always written. */
const TOOL_FLAGS: ReadonlySet<string> = new Set([
	'official',
	'byMaintainer',
	'editorsPick',
	'newPlayer'
]);
const VIDEO_FLAGS: ReadonlySet<string> = new Set(['byCreator']);
const NO_FLAGS: ReadonlySet<string> = new Set();

/** Prettier's singleQuote applies to YAML, and CI runs prettier --check over tools/, so quote like it. */
const STRINGIFY = { singleQuote: true } as const;

function isDefault(key: string, value: unknown, flags: ReadonlySet<string>): boolean {
	if (value === undefined) return true;
	if (Array.isArray(value)) return value.length === 0;
	if (value !== null && typeof value === 'object') return Object.keys(value).length === 0;
	return value === false && flags.has(key);
}

/** `keys` of `source` in that order, skipping schema defaults. */
function pick<T extends object>(
	source: T,
	keys: readonly (keyof T)[],
	flags: ReadonlySet<string>
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		const value = source[key];
		if (!isDefault(String(key), value, flags)) out[String(key)] = value;
	}
	return out;
}

/** The about.yaml text for one tool: canonical key order, schema defaults left out, LF line endings. */
export function toolYaml(tool: ToolMetadata): string {
	const out = pick(tool, TOOL_KEYS, TOOL_FLAGS);
	if (tool.videos.length > 0) {
		out.videos = tool.videos.map((video) => pick(video, VIDEO_KEYS, VIDEO_FLAGS));
	}
	return stringify(out, STRINGIFY);
}

/** The categories.yaml text. Leading `#` comment lines of `existingText` are kept above the list. */
export function categoriesYaml(categories: readonly Category[], existingText = ''): string {
	const header = existingText.match(/^(?:#.*\n)+/)?.[0] ?? '';
	return (
		header +
		stringify({ categories: categories.map((c) => pick(c, CATEGORY_KEYS, NO_FLAGS)) }, STRINGIFY)
	);
}
