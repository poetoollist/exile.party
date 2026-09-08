import { describe, expect, it } from 'vitest';
import { Catalog, START_HERE_ID, Tool, ToolMetadata } from './schema';

const valid = {
	id: 'example-tool',
	name: 'Example Tool',
	description: 'Does a useful thing for exiles.',
	url: 'https://example.com',
	games: ['poe1'],
	category: 'trade',
	platforms: ['web'],
	pricing: 'free',
	openSource: false,
	status: 'active',
	lastVerified: '2026-09-04'
};

describe('Tool', () => {
	it('accepts a minimal valid entry and applies defaults', () => {
		const t = Tool.parse(valid);
		expect(t.tags).toEqual([]);
		expect(t.official).toBe(false);
		expect(t.editorsPick).toBe(false);
		expect(t.byMaintainer).toBe(false);
	});

	it.each([
		['unknown key', { ...valid, bogus: 1 }],
		['http url', { ...valid, url: 'http://example.com' }],
		['bad id', { ...valid, id: 'Example Tool' }],
		['empty games', { ...valid, games: [] }],
		['bad date', { ...valid, lastVerified: '2026-13-45' }],
		['urls key not in games', { ...valid, urls: { poe2: 'https://example.com/2' } }],
		['sources key not in games', { ...valid, sources: { poe2: 'https://example.com/2' } }],
		['tag with uppercase', { ...valid, tags: ['Bad'] }],
		['missing openSource', { ...valid, openSource: undefined }]
	])('rejects %s', (_, input) => {
		expect(Tool.safeParse(input).success).toBe(false);
	});

	it('rejects a repository link on a tool marked closed source', () => {
		const r = Tool.safeParse({ ...valid, source: 'https://github.com/a/b' });
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].message).toMatch(/openSource must be true/);
	});

	it('accepts a repository link when openSource is true', () => {
		const r = Tool.safeParse({ ...valid, openSource: true, source: 'https://github.com/a/b' });
		expect(r.success).toBe(true);
	});

	it('allows a maintainer-authored tool to be an editors pick, disclosed on the card', () => {
		const r = Tool.safeParse({ ...valid, byMaintainer: true, editorsPick: true });
		expect(r.success).toBe(true);
	});

	it('defaults screenshots to an empty list', () => {
		expect(Tool.parse(valid).screenshots).toEqual([]);
	});

	it('defaults alsoIn to an empty list and leaves rank unset', () => {
		const t = Tool.parse(valid);
		expect(t.alsoIn).toEqual([]);
		expect(t.rank).toBeUndefined();
	});

	it('accepts secondary categories and a rank', () => {
		const r = Tool.safeParse({ ...valid, alsoIn: ['overlays-and-companions'], rank: 2 });
		expect(r.success).toBe(true);
	});

	it.each([
		['alsoIn repeating the primary category', { ...valid, alsoIn: ['trade'] }],
		['alsoIn listing an id twice', { ...valid, alsoIn: ['crafting', 'crafting'] }],
		['a rank of zero', { ...valid, rank: 0 }],
		['a fractional rank', { ...valid, rank: 1.5 }]
	])('rejects %s', (_, input) => {
		expect(Tool.safeParse(input).success).toBe(false);
	});

	it('points at alsoIn when it repeats the primary category', () => {
		const r = Tool.safeParse({ ...valid, alsoIn: ['trade'] });
		expect(r.error?.issues[0].path).toEqual(['alsoIn']);
		expect(r.error?.issues[0].message).toMatch(/alsoIn/);
	});

	it('accepts the display fields', () => {
		const r = Tool.safeParse({
			...valid,
			author: 'Example Person',
			headline: 'Does a useful thing for exiles without leaving the game',
			screenshots: ['home.webp']
		});
		expect(r.success).toBe(true);
	});

	it.each([
		['screenshot with a path', { ...valid, screenshots: ['../a.png'] }],
		['short headline', { ...valid, headline: 'Too short' }],
		['empty author', { ...valid, author: '' }]
	])('rejects %s', (_, input) => {
		expect(Tool.safeParse(input).success).toBe(false);
	});

	it('keeps the directory-owned id and icon out of about.yaml', () => {
		const metadata: Record<string, unknown> = { ...valid };
		delete metadata.id;
		expect(ToolMetadata.safeParse(metadata).success).toBe(true);
		expect(ToolMetadata.safeParse({ ...metadata, id: 'duplicated' }).success).toBe(false);
		expect(ToolMetadata.safeParse({ ...metadata, icon: 'icon.png' }).success).toBe(false);
	});
});

describe('Catalog', () => {
	const categories = [{ id: 'trade', name: 'Trade' }];

	it('rejects duplicate tool ids', () => {
		const r = Catalog.safeParse({ categories, tools: [valid, valid] });
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].message).toMatch(/duplicate id/);
	});

	it('rejects unknown category references', () => {
		const r = Catalog.safeParse({ categories, tools: [{ ...valid, category: 'nope' }] });
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].message).toMatch(/unknown category/);
	});

	it('rejects an unknown category in alsoIn and points at the entry', () => {
		const r = Catalog.safeParse({ categories, tools: [{ ...valid, alsoIn: ['nope'] }] });
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].message).toMatch(/unknown category nope/);
		expect(r.error?.issues[0].path).toEqual(['tools', 0, 'alsoIn', 0]);
	});

	it('reserves start-here for the virtual section', () => {
		const r = Catalog.safeParse({
			categories: [...categories, { id: START_HERE_ID, name: 'Start here' }],
			tools: []
		});
		expect(r.success).toBe(false);
		expect(r.error?.issues[0].message).toMatch(/reserved/);
	});

	it('rejects an empty category list', () => {
		expect(Catalog.safeParse({ categories: [], tools: [] }).success).toBe(false);
	});
});
