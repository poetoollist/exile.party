import { describe, expect, it } from 'vitest';
import {
	countByGame,
	groupBySection,
	inSection,
	sections,
	sectionPreview,
	sortTools
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
	byMaintainer: false,
	status: 'active',
	lastVerified: '2026-01-01',
	screenshots: [],
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
		tool({ id: 'pob', category: 'build', games: ['poe1', 'poe2'], editorsPick: true }),
		tool({ id: 'awakened', category: 'trade', games: ['poe1'], editorsPick: true }),
		tool({ id: 'exchange2', category: 'trade', games: ['poe2'], editorsPick: true }),
		tool({ id: 'sidekick', category: 'trade', games: ['poe1', 'poe2'] }),
		tool({ id: 'ninja', category: 'data', games: ['poe1', 'poe2'], editorsPick: true }),
		tool({ id: 'poe2db', category: 'data', games: ['poe2'], editorsPick: true })
	]
};

describe('countByGame', () => {
	it('counts a tool once per game it lists', () => {
		expect(countByGame(catalog.tools)).toEqual({ poe1: 4, poe2: 5 });
	});
});

describe('sortTools', () => {
	it('puts ranked tools first ascending, then the rest A to Z', () => {
		const list = [
			tool({ id: 'zeta', name: 'Zeta' }),
			tool({ id: 'second', name: 'Second', rank: 2 }),
			tool({ id: 'alpha', name: 'alpha' }),
			tool({ id: 'first', name: 'First', rank: 1 })
		];
		expect(sortTools(list).map((t) => t.id)).toEqual(['first', 'second', 'alpha', 'zeta']);
	});

	it('breaks equal ranks by name and leaves its input alone', () => {
		const list = [tool({ id: 'b', name: 'B', rank: 1 }), tool({ id: 'a', name: 'A', rank: 1 })];
		expect(sortTools(list).map((t) => t.id)).toEqual(['a', 'b']);
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
});

describe('inSection', () => {
	const t = tool({ id: 'x', category: 'trade', alsoIn: ['maps'], editorsPick: true });

	it('matches the primary category, a secondary one, and Start here for a pick', () => {
		expect(inSection(t, 'trade')).toBe(true);
		expect(inSection(t, 'maps')).toBe(true);
		expect(inSection(t, START_HERE_ID)).toBe(true);
		expect(inSection(t, 'build')).toBe(false);
		expect(inSection(tool({ id: 'y' }), START_HERE_ID)).toBe(false);
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

	it('lists an alsoIn tool under both sections and a pick under Start here first', () => {
		const tools = [
			tool({
				id: 'overlay',
				name: 'Overlay',
				category: 'trade',
				alsoIn: ['crafting'],
				editorsPick: true
			}),
			tool({ id: 'bench', name: 'Bench', category: 'crafting' })
		];
		const groups = groupBySection(secs, tools);
		expect(groups.map((g) => g.id)).toEqual([START_HERE_ID, 'trade', 'crafting']);
		expect(groups[0].tools.map((t) => t.id)).toEqual(['overlay']);
		expect(groups[0].description).toBe('Editor’s picks: the tools most players install first.');
		expect(groups[2].tools.map((t) => t.id)).toEqual(['bench', 'overlay']);
	});

	it('applies rank inside every section the tool is in', () => {
		const tools = [
			tool({ id: 'lead', name: 'Zed', category: 'trade', alsoIn: ['crafting'], rank: 1 }),
			tool({ id: 'other', name: 'Alpha', category: 'crafting' })
		];
		const groups = groupBySection(secs, tools);
		expect(groups[1].tools.map((t) => t.id)).toEqual(['lead', 'other']);
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
