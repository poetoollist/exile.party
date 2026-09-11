import { describe, expect, it } from 'vitest';
import { toolId } from './id';

describe('toolId', () => {
	it.each([
		['Path of Building', 'path-of-building'],
		['poe.ninja', 'poe-ninja'],
		['Awakened PoE Trade', 'awakened-poe-trade'],
		['Craft & Exile', 'craft-and-exile'],
		['  Éxilé  Tools ', 'exile-tools'],
		['r/pathofexile', 'r-pathofexile'],
		['!!!', '']
	])('derives %j as %j', (name, id) => {
		expect(toolId(name)).toBe(id);
	});
});
