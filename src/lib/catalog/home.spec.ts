import { describe, expect, it } from 'vitest';
import {
	countByGame,
	groupBySection,
	inSection,
	sections,
	sectionPreview,
	sortTools,
	START_HERE
} from './home';
import { START_HERE_ID, type Catalog, type Tool } from './schema';

const tool = (over: Partial<Tool> & { id: string }): Tool => ({
	name: over.id,
	description: 'A tool that does things.',
	url: 'https://x.example',
	games: ['poe1'],
	category: 'trade',
	alsoIn: [],
	tags: [],
	platforms: ['web'],
	pricing: 'free',
	openSource: false,
	official: false,
	editorsPick: false,
	newPlayer: false,
	byMaintainer: false,
	status: 'active',
	lastVerified: '2026-01-01',
	screenshots: [],
	videos: [],
	...over
});

const catalog: Catalog = {
	categories: [
		{ id: 'build', name: 'Build' },
		{ id: 'trade', name: 'Trade' },
		{ id: 'maps', name: 'Maps' },
		{ id: 'data', name: 'Data', description: 'Numbers.' }
	],
	tools: [
		tool({ id: 'pob', category: 'build', games: ['poe1', 'poe2'], newPlayer: true }),
		tool({ id: 'awakened', category: 'trade', games: ['poe1'], newPlayer: true }),
		tool({ id: 'exchange2', category: 'trade', games: ['poe2'], newPlayer: true }),
		tool({ id: 'sidekick', category: 'trade', games: ['poe1', 'poe2'] }),
		tool({ id: 'ninja', category: 'data', games: ['poe1', 'poe2'], newPlayer: true }),
		tool({ id: 'poe2db', category: 'data', games: ['poe2'], newPlayer: true })
	]
};

describe('countByGame', () => {
	it('counts a tool once per game it lists', () => {
		expect(countByGame(catalog.tools)).toEqual({ poe1: 4, poe2: 5 });
	});
});

describe('sortTools', () => {
	it('puts ranked tools first ascending, then the rest A to Z, for the given section', () => {
		const list = [
			tool({ id: 'zeta', name: 'Zeta' }),
			tool({ id: 'second', name: 'Second', rank: { trade: 2 } }),
			tool({ id: 'alpha', name: 'alpha' }),
			tool({ id: 'first', name: 'First', rank: { trade: 1 } })
		];
		expect(sortTools(list, 'trade').map((t) => t.id)).toEqual(['first', 'second', 'alpha', 'zeta']);
	});

	it('ignores a rank set for a different section', () => {
		const list = [
			tool({ id: 'b', name: 'B', rank: { crafting: 1 } }),
			tool({ id: 'a', name: 'A' })
		];
		expect(sortTools(list, 'trade').map((t) => t.id)).toEqual(['a', 'b']);
	});

	it('breaks equal ranks by name and leaves its input alone', () => {
		const list = [
			tool({ id: 'b', name: 'B', rank: { trade: 1 } }),
			tool({ id: 'a', name: 'A', rank: { trade: 1 } })
		];
		expect(sortTools(list, 'trade').map((t) => t.id)).toEqual(['a', 'b']);
		expect(list.map((t) => t.id)).toEqual(['b', 'a']);
	});
});

describe('sections', () => {
	it('leads with Start here and keeps catalogue order', () => {
		expect(sections(catalog.categories).map((c) => c.id)).toEqual([
			START_HERE_ID,
			'build',
			'trade',
			'maps',
			'data'
		]);
		expect(sections(catalog.categories)[0].name).toBe('Start here');
	});

	it('describes Start here as the tools a new player should install first', () => {
		expect(START_HERE.description).toBe('The tools a new player should install first.');
	});
});

describe('inSection', () => {
	const t = tool({ id: 'x', category: 'trade', alsoIn: ['maps'], newPlayer: true });

	it('matches the primary category, a secondary one, and Start here for a new-player tool', () => {
		expect(inSection(t, 'trade')).toBe(true);
		expect(inSection(t, 'maps')).toBe(true);
		expect(inSection(t, START_HERE_ID)).toBe(true);
		expect(inSection(t, 'build')).toBe(false);
		expect(inSection(tool({ id: 'y' }), START_HERE_ID)).toBe(false);
	});

	it('is false for Start here when the tool is only an editors pick', () => {
		expect(inSection(tool({ id: 'z', editorsPick: true }), START_HERE_ID)).toBe(false);
	});
});

describe('groupBySection', () => {
	const secs = sections([
		{ id: 'trade', name: 'Trade' },
		{ id: 'crafting', name: 'Crafting' },
		{ id: 'community', name: 'Community' }
	]);

	it('keeps section order, sorts inside a section, and drops empty sections', () => {
		const tools = [
			tool({ id: 'z', name: 'Zeta', category: 'trade' }),
			tool({ id: 'a', name: 'alpha', category: 'trade' }),
			tool({ id: 'c', name: 'Craft', category: 'crafting' })
		];
		const groups = groupBySection(secs, tools);
		expect(groups.map((g) => g.id)).toEqual(['trade', 'crafting']);
		expect(groups[0].tools.map((t) => t.id)).toEqual(['a', 'z']);
		expect(groups[0].name).toBe('Trade');
	});

	it('lists an alsoIn tool under both sections and a new-player tool under Start here first', () => {
		const tools = [
			tool({
				id: 'overlay',
				name: 'Overlay',
				category: 'trade',
				alsoIn: ['crafting'],
				newPlayer: true
			}),
			tool({ id: 'bench', name: 'Bench', category: 'crafting' })
		];
		const groups = groupBySection(secs, tools);
		expect(groups.map((g) => g.id)).toEqual([START_HERE_ID, 'trade', 'crafting']);
		expect(groups[0].tools.map((t) => t.id)).toEqual(['overlay']);
		expect(groups[0].description).toBe('The tools a new player should install first.');
		expect(groups[2].tools.map((t) => t.id)).toEqual(['bench', 'overlay']);
	});

	it('ranks a tool in one section it is listed under but not another', () => {
		const tools = [
			tool({
				id: 'lead',
				name: 'Zed',
				category: 'trade',
				alsoIn: ['crafting'],
				rank: { trade: 1 }
			}),
			tool({ id: 'zeta', name: 'Zeta', category: 'trade' }),
			tool({ id: 'other', name: 'Alpha', category: 'crafting' })
		];
		const groups = groupBySection(secs, tools);
		const trade = groups.find((g) => g.id === 'trade');
		const crafting = groups.find((g) => g.id === 'crafting');
		expect(trade?.tools.map((t) => t.id)).toEqual(['lead', 'zeta']);
		expect(crafting?.tools.map((t) => t.id)).toEqual(['other', 'lead']);
	});

	it('orders Start here by its own rank, ignoring a category rank', () => {
		const tools = [
			tool({
				id: 'first',
				name: 'Zed',
				category: 'trade',
				newPlayer: true,
				rank: { trade: 5, 'start-here': 1 }
			}),
			tool({
				id: 'second',
				name: 'Alpha',
				category: 'trade',
				newPlayer: true,
				rank: { trade: 1 }
			})
		];
		const groups = groupBySection(secs, tools);
		const startHere = groups.find((g) => g.id === START_HERE_ID);
		expect(startHere?.tools.map((t) => t.id)).toEqual(['first', 'second']);
	});
});

describe('sectionPreview', () => {
	it('shows everything when the section fits', () => {
		expect(sectionPreview([1, 2, 3], 6)).toEqual({ shown: [1, 2, 3], hidden: 0 });
		expect(sectionPreview([1, 2, 3, 4, 5, 6], 6)).toEqual({ shown: [1, 2, 3, 4, 5, 6], hidden: 0 });
	});
	it('cuts a long section at the limit and counts the rest', () => {
		expect(sectionPreview([1, 2, 3, 4, 5, 6, 7, 8], 6)).toEqual({
			shown: [1, 2, 3, 4, 5, 6],
			hidden: 2
		});
	});
});
