import { describe, expect, it } from 'vitest';
import { applyRanking, rankingIssues, sectionOrder } from './ranking';
import type { Tool } from './schema';

function tool(id: string, extra: Partial<Tool> = {}): Tool {
	return {
		id,
		name: id,
		description: 'Does a thing well.',
		url: `https://${id}.example`,
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
		lastVerified: '2026-09-10',
		screenshots: [],
		videos: [],
		...extra
	};
}

const alpha = tool('alpha', { rank: { trade: 2 } });
const beta = tool('beta', {
	category: 'crafting',
	alsoIn: ['trade'],
	newPlayer: true,
	rank: { trade: 1, 'start-here': 1 }
});
const gamma = tool('gamma');
const delta = tool('delta', { category: 'crafting' });
const tools = [alpha, beta, gamma, delta];
const ids = (list: Tool[]) => list.map((t) => t.id);

describe('sectionOrder', () => {
	it('splits a section into its rank order and the rest A to Z', () => {
		const order = sectionOrder(tools, 'trade');
		expect(ids(order.ranked)).toEqual(['beta', 'alpha']);
		expect(ids(order.unranked)).toEqual(['gamma']);
	});

	it('treats start-here as the newPlayer tools', () => {
		expect(ids(sectionOrder(tools, 'start-here').ranked)).toEqual(['beta']);
		expect(sectionOrder(tools, 'start-here').unranked).toEqual([]);
	});
});

describe('rankingIssues', () => {
	it('is empty for ids inside the section', () => {
		expect(rankingIssues(tools, 'trade', ['gamma', 'alpha'])).toEqual([]);
	});

	it('names an id outside the section and a repeated id by position', () => {
		expect(rankingIssues(tools, 'trade', ['delta'])).toEqual([
			{ path: 'ranked.0', message: 'delta is not in section trade' }
		]);
		expect(rankingIssues(tools, 'trade', ['alpha', 'alpha'])).toEqual([
			{ path: 'ranked.1', message: 'alpha is listed twice' }
		]);
	});
});

describe('applyRanking', () => {
	it('numbers the listed tools and unranks the rest of the section', () => {
		const changed = applyRanking(tools, 'trade', ['alpha', 'gamma']);
		expect(ids(changed)).toEqual(['alpha', 'beta', 'gamma']);
		expect(changed[0].rank).toEqual({ trade: 1 });
		expect(changed[1].rank).toEqual({ 'start-here': 1 });
		expect(changed[2].rank).toEqual({ trade: 2 });
	});

	it('leaves unchanged tools out and removes an emptied rank map', () => {
		const changed = applyRanking(tools, 'trade', ['beta']);
		expect(ids(changed)).toEqual(['alpha']);
		expect(changed[0].rank).toBeUndefined();
	});

	it('does not touch tools outside the section', () => {
		expect(ids(applyRanking(tools, 'start-here', []))).toEqual(['beta']);
		expect(applyRanking(tools, 'start-here', [])[0].rank).toEqual({ trade: 1 });
	});
});
