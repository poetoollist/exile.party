import { describe, expect, it } from 'vitest';
import {
	EMPTY_FILTERS,
	activeFilterCount,
	filterTools,
	fromSearchParams,
	isStale,
	searchTools,
	toSearchParams,
	toggle
} from './filter';
import type { Filters } from './filter';
import type { Tool } from './schema';

const tool = (over: Partial<Tool>): Tool => ({
	id: 'x',
	name: 'X',
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

const tools = [
	tool({
		id: 'a',
		name: 'Awakened Trade',
		games: ['poe1'],
		category: 'trade',
		tags: ['overlay'],
		platforms: ['windows', 'linux'],
		openSource: true
	}),
	tool({
		id: 'b',
		name: 'Builder',
		games: ['poe1', 'poe2'],
		category: 'build-planning',
		platforms: ['windows'],
		pricing: 'paid',
		openSource: true
	}),
	tool({
		id: 'c',
		name: 'Craft',
		description: 'Crafting sim.',
		games: ['poe2'],
		category: 'crafting',
		platforms: ['web'],
		official: true
	})
];

const ids = (list: Tool[]) => list.map((t) => t.id);

describe('isStale', () => {
	it('is stale after the threshold', () => {
		expect(isStale('2026-01-01', '2026-09-04T00:00:00Z')).toBe(true);
	});
	it('is fresh within the threshold', () => {
		expect(isStale('2026-08-01', '2026-09-04T00:00:00Z')).toBe(false);
	});
});

describe('filterTools', () => {
	it('returns everything with empty filters', () => {
		expect(filterTools(tools, EMPTY_FILTERS)).toHaveLength(3);
	});
	it('filters by game', () => {
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, game: 'poe2' }))).toEqual(['b', 'c']);
	});
	it('matches any of the chosen platforms', () => {
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, platforms: ['linux'] }))).toEqual(['a']);
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, platforms: ['linux', 'web'] }))).toEqual([
			'a',
			'c'
		]);
	});
	it('matches any of the chosen prices', () => {
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, pricing: ['paid'] }))).toEqual(['b']);
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, pricing: ['free', 'paid'] }))).toHaveLength(
			3
		);
	});
	it('filters open from closed source', () => {
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, code: ['open'] }))).toEqual(['a', 'b']);
		expect(ids(filterTools(tools, { ...EMPTY_FILTERS, code: ['closed'] }))).toEqual(['c']);
	});
	it('requires every set to match', () => {
		expect(
			ids(
				filterTools(tools, {
					...EMPTY_FILTERS,
					game: 'poe1',
					platforms: ['windows'],
					pricing: ['paid']
				})
			)
		).toEqual(['b']);
	});
});

describe('searchTools', () => {
	it('returns nothing for a blank query', () => {
		expect(searchTools(tools, '   ')).toEqual([]);
	});
	it('matches name, tags and description, case-insensitive', () => {
		expect(ids(searchTools(tools, 'CRAFT'))).toEqual(['c']);
		expect(ids(searchTools(tools, 'overlay'))).toEqual(['a']);
		expect(ids(searchTools(tools, 'things'))).toEqual(['a', 'b']);
	});
	it('ranks a name that starts with the query above one that contains it, above a tag, above a description', () => {
		const list = [
			tool({ id: 'desc', name: 'Zed', description: 'Handles trade.' }),
			tool({ id: 'tag', name: 'Yak', tags: ['trade-helper'] }),
			tool({ id: 'contains', name: 'Bulk Trade' }),
			tool({ id: 'starts', name: 'Trade Macro' })
		];
		expect(ids(searchTools(list, 'trade'))).toEqual(['starts', 'contains', 'tag', 'desc']);
	});
});

describe('activeFilterCount', () => {
	it('ignores game and counts every chosen value', () => {
		expect(activeFilterCount({ ...EMPTY_FILTERS, game: 'poe2' })).toBe(0);
		expect(
			activeFilterCount({
				game: null,
				platforms: ['windows', 'linux'],
				pricing: ['free'],
				code: []
			})
		).toBe(3);
	});
});

describe('toggle', () => {
	it('adds a missing value and removes a present one', () => {
		expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
		expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
	});
});

describe('search params', () => {
	it('round-trips a full filter set in a canonical order', () => {
		const f: Filters = {
			game: 'poe2',
			platforms: ['windows', 'linux'],
			pricing: ['free', 'freemium'],
			code: ['closed']
		};
		const p = toSearchParams({
			...f,
			platforms: ['linux', 'windows'],
			pricing: ['freemium', 'free']
		});
		expect(p.toString()).toBe(
			'game=poe2&platform=windows%2Clinux&price=free%2Cfreemium&code=closed'
		);
		expect(fromSearchParams(p)).toEqual(f);
	});

	it('omits empty values', () => {
		expect(toSearchParams(EMPTY_FILTERS).toString()).toBe('');
	});

	it('drops values that are not valid options and duplicates', () => {
		const p = new URLSearchParams(
			'game=poe3&platform=windows,amiga,windows&price=cheap&code=maybe'
		);
		expect(fromSearchParams(p)).toEqual({ ...EMPTY_FILTERS, platforms: ['windows'] });
	});
});
