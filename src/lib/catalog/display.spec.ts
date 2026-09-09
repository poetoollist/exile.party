import { describe, expect, it } from 'vitest';
import { byLine, displayHost, headline, monogram, overview, repoLinks, siteLinks } from './display';
import type { Tool } from './schema';

const tool = (over: Partial<Tool>): Tool => ({
	id: 'x',
	name: 'X',
	description: 'A tool that does things.',
	url: 'https://x.example',
	games: ['poe1', 'poe2'],
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
	...over
});

describe('monogram', () => {
	it.each([
		['Path of Building', 'B'],
		['Path of Exile Wiki', 'W'],
		['Path of Exile 2 Trade', 'T'],
		['poe.ninja', 'n'],
		['PoEDB', 'D'],
		['PoE Lab', 'L'],
		['The Forbidden Trove', 'F'],
		['Craft of Exile', 'C'],
		['Exiled Exchange 2', 'E']
	])('%s -> %s', (name, expected) => {
		expect(monogram(name)).toBe(expected);
	});

	it('falls back to the first character when stripping leaves nothing', () => {
		expect(monogram('PoE')).toBe('P');
	});
});

describe('displayHost', () => {
	it('drops the scheme and a www prefix', () => {
		expect(displayHost('https://www.poewiki.net/wiki/Main')).toBe('poewiki.net');
	});
	it('returns the input when it is not a url', () => {
		expect(displayHost('not a url')).toBe('not a url');
	});
});

describe('siteLinks', () => {
	it('is one entry when a single url covers every game', () => {
		expect(siteLinks(tool({}))).toEqual([{ game: null, url: 'https://x.example' }]);
	});

	it('splits per game when the urls differ', () => {
		const t = tool({ urls: { poe1: 'https://x.example/1', poe2: 'https://x.example/2' } });
		expect(siteLinks(t)).toEqual([
			{ game: 'poe1', url: 'https://x.example/1' },
			{ game: 'poe2', url: 'https://x.example/2' }
		]);
	});

	it('falls back to the main url when only one game has its own link', () => {
		const t = tool({ urls: { poe2: 'https://x.example/2' } });
		expect(siteLinks(t)).toEqual([{ game: null, url: 'https://x.example' }]);
	});
});

describe('repoLinks', () => {
	it('is empty for a closed-source tool', () => {
		expect(repoLinks(tool({}))).toEqual([]);
	});

	it('uses the single source when there is one', () => {
		const t = tool({ openSource: true, source: 'https://github.com/a/b' });
		expect(repoLinks(t)).toEqual([{ game: null, url: 'https://github.com/a/b' }]);
	});

	it('uses the primary URL when it is also the open-source repository', () => {
		const t = tool({ openSource: true, url: 'https://github.com/a/b' });
		expect(repoLinks(t)).toEqual([{ game: null, url: 'https://github.com/a/b' }]);
	});

	it('prefers per-game sources when present', () => {
		const t = tool({
			openSource: true,
			source: 'https://github.com/a/b',
			sources: { poe1: 'https://github.com/a/one', poe2: 'https://github.com/a/two' }
		});
		expect(repoLinks(t)).toEqual([
			{ game: 'poe1', url: 'https://github.com/a/one' },
			{ game: 'poe2', url: 'https://github.com/a/two' }
		]);
	});
});

describe('byLine', () => {
	it('prefers the stated author', () => {
		expect(
			byLine(tool({ author: 'NeverSink', source: 'https://github.com/x/y', openSource: true }))
		).toBe('NeverSink');
	});
	it('falls back to the GitHub owner of the repository', () => {
		expect(
			byLine(tool({ source: 'https://github.com/SnosMe/awakened-poe-trade', openSource: true }))
		).toBe('SnosMe');
	});
	it('reads per-game repositories and then the site', () => {
		expect(
			byLine(
				tool({ sources: { poe2: 'https://github.com/Kvan7/Exiled-Exchange-2' }, openSource: true })
			)
		).toBe('Kvan7');
		expect(byLine(tool({ url: 'https://github.com/Barragek0/RuneshapePriceChecker' }))).toBe(
			'Barragek0'
		);
	});
	it('is null when nothing names an author', () => {
		expect(byLine(tool({ url: 'https://poe.ninja/' }))).toBeNull();
	});
});

describe('headline', () => {
	it('prefers the stated headline', () => {
		expect(headline(tool({ headline: 'Plans builds offline with the full tree' }))).toBe(
			'Plans builds offline with the full tree'
		);
	});
	it('takes the first sentence of the description without its full stop', () => {
		expect(headline(tool({ description: 'Tracks the economy. Also shows builds.' }))).toBe(
			'Tracks the economy'
		);
	});
	it('does not split on a dot inside a name', () => {
		expect(headline(tool({ description: 'Pulls prices from poe.ninja every hour.' }))).toBe(
			'Pulls prices from poe.ninja every hour'
		);
	});
});

describe('overview', () => {
	it('is the whole description when a headline was written', () => {
		expect(
			overview(tool({ headline: 'Plans builds offline', description: 'Offline planner.' }))
		).toBe('Offline planner.');
	});
	it('is what follows the first sentence when the headline is derived', () => {
		expect(
			overview(tool({ description: 'Tracks the economy. Also shows builds. Updates hourly.' }))
		).toBe('Also shows builds. Updates hourly.');
	});
	it('is null when the description is the one sentence the headline already says', () => {
		expect(overview(tool({ description: 'Pulls prices from poe.ninja every hour.' }))).toBeNull();
	});
	it('keeps the description’s own closing punctuation', () => {
		expect(overview(tool({ description: 'Tracks the economy. Worth a look!' }))).toBe(
			'Worth a look!'
		);
	});
});
