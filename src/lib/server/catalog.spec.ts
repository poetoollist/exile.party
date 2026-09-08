import { describe, expect, it } from 'vitest';
import { loadCatalog, parseCategories, parseTool } from './catalog';

const good = `
name: T
description: Trades things quickly.
url: https://t.example
games: [poe1]
category: trade
platforms: [web]
pricing: free
openSource: false
status: active
lastVerified: 2026-09-04
`;

describe('tool files', () => {
	it('takes the id from the directory and keeps dates as strings', () => {
		const tool = parseTool(good, 'example-tool');
		expect(tool.id).toBe('example-tool');
		expect(tool.lastVerified).toBe('2026-09-04');
	});

	it('throws with the offending file and field', () => {
		expect(() =>
			parseTool(good.replace('https://', 'http://'), 'example-tool', 'fixture/about.yaml')
		).toThrow(/fixture\/about.yaml failed validation[\s\S]*url/);
	});

	it('rejects an id inside about.yaml', () => {
		expect(() => parseTool(`id: duplicated\n${good}`, 'example-tool')).toThrow(/Unrecognized key/);
	});

	it('parses the shared category file', () => {
		expect(parseCategories('categories: [{ id: trade, name: Trade }]')).toHaveLength(1);
	});
});

describe('tools directory', () => {
	it('is valid', () => {
		const catalog = loadCatalog();
		expect(catalog.categories.length).toBeGreaterThan(0);
		expect(catalog.tools.length).toBeGreaterThan(0);
	});
});
