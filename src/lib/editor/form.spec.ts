import { describe, expect, it } from 'vitest';
import { Game } from '$lib/catalog/schema';
import {
	draftYaml,
	emptyTool,
	normalizeDraft,
	sectionsOf,
	toggle,
	youtubeId,
	type ToolDraft
} from './form';

const base = (): ToolDraft => ({
	...emptyTool(),
	name: 'T',
	description: 'Description of the tool.',
	url: 'https://t.example',
	games: ['poe1', 'poe2'],
	category: 'trade',
	platforms: ['web']
});

describe('youtubeId', () => {
	it.each([
		['pF22I1o9lrg', 'pF22I1o9lrg'],
		['https://www.youtube.com/watch?v=pF22I1o9lrg&t=12s', 'pF22I1o9lrg'],
		['https://youtu.be/pF22I1o9lrg?si=abc', 'pF22I1o9lrg'],
		['https://www.youtube.com/embed/pF22I1o9lrg', 'pF22I1o9lrg'],
		['https://m.youtube.com/shorts/pF22I1o9lrg', 'pF22I1o9lrg'],
		['https://example.com/watch?v=pF22I1o9lrg', null],
		['not a url', null],
		['', null]
	])('reads %j as %j', (input, id) => {
		expect(youtubeId(input)).toBe(id);
	});
});

describe('toggle', () => {
	it('adds and removes while keeping the option order', () => {
		expect(toggle(['poe2'], 'poe1', Game.options)).toEqual(['poe1', 'poe2']);
		expect(toggle(['poe1', 'poe2'], 'poe1', Game.options)).toEqual(['poe2']);
	});
});

describe('normalizeDraft', () => {
	it('drops per-game links and video games for games no longer selected', () => {
		const draft: ToolDraft = {
			...base(),
			games: ['poe1'],
			urls: { poe1: 'https://t.example/1', poe2: 'https://t.example/2' },
			videos: [{ youtube: 'pF22I1o9lrg', title: 'V', channel: 'C', byCreator: false, game: 'poe2' }]
		};
		const out = normalizeDraft(draft);
		expect(out.urls).toEqual({ poe1: 'https://t.example/1' });
		expect(out.videos[0].game).toBeUndefined();
	});

	it('clears repository links when the tool is closed source', () => {
		const draft: ToolDraft = {
			...base(),
			openSource: false,
			source: 'https://github.com/t/t',
			sources: { poe1: 'https://github.com/t/t1' }
		};
		const out = normalizeDraft(draft);
		expect(out.source).toBeUndefined();
		expect(out.sources).toBeUndefined();
	});

	it('turns blank optional text into undefined and drops empty maps', () => {
		const out = normalizeDraft({
			...base(),
			author: '  ',
			headline: '',
			notes: '',
			urls: {},
			rank: {}
		});
		expect(out.author).toBeUndefined();
		expect(out.headline).toBeUndefined();
		expect(out.notes).toBeUndefined();
		expect(out.urls).toBeUndefined();
		expect(out.rank).toBeUndefined();
	});

	it('keeps rank only for sections the tool is in', () => {
		const out = normalizeDraft({
			...base(),
			alsoIn: ['crafting'],
			newPlayer: false,
			rank: { trade: 1, crafting: 2, 'start-here': 3, loot: 4 }
		});
		expect(out.rank).toEqual({ trade: 1, crafting: 2 });
	});
});

describe('sectionsOf', () => {
	it('is category, alsoIn, then start-here for a newPlayer tool', () => {
		expect(sectionsOf({ ...base(), alsoIn: ['crafting'], newPlayer: true })).toEqual([
			'trade',
			'crafting',
			'start-here'
		]);
		expect(sectionsOf({ ...base(), category: '' })).toEqual([]);
	});
});

describe('draftYaml', () => {
	it('serializes a draft like the file it becomes', () => {
		expect(draftYaml(base())).toBe(`name: T
description: Description of the tool.
url: https://t.example
games:
  - poe1
  - poe2
category: trade
platforms:
  - web
pricing: free
openSource: false
status: active
lastVerified: ${emptyTool().lastVerified}
`);
	});
});
