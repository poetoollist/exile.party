import { describe, expect, it } from 'vitest';
import { Game } from './catalog/schema';
import { ART } from './art';

describe('ART', () => {
	it('has an entry for every game', () => {
		for (const game of Game.options) {
			expect(ART[game]).toBeDefined();
		}
	});

	it.each(Game.options)('%s: eye is strictly between 0 and 1 on both axes', (game) => {
		const { eye } = ART[game];
		expect(eye.x).toBeGreaterThan(0);
		expect(eye.x).toBeLessThan(1);
		expect(eye.y).toBeGreaterThan(0);
		expect(eye.y).toBeLessThan(1);
	});

	it.each(Game.options)('%s: width and height are positive', (game) => {
		expect(ART[game].width).toBeGreaterThan(0);
		expect(ART[game].height).toBeGreaterThan(0);
	});

	it.each(Game.options)('%s: webp and jpg are non-empty and correctly extensioned', (game) => {
		const { jpg, webp } = ART[game];
		expect(typeof jpg).toBe('string');
		expect(jpg.length).toBeGreaterThan(0);
		expect(jpg).toMatch(/\.jpg$/);
		expect(typeof webp).toBe('string');
		expect(webp.length).toBeGreaterThan(0);
		expect(webp).toMatch(/\.webp$/);
	});
});
