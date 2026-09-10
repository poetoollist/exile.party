import { describe, expect, it } from 'vitest';
import {
	FADE_DEPTH_STACKED,
	FADE_DEPTH_WIDE,
	FULL_POLYGON,
	OVERLAP_MS,
	PUSH_IN,
	REVEAL_MS,
	SWEEP_MS,
	chooserPolygon,
	coverFit,
	edgePolygon,
	fadeRect,
	pinRect,
	pushOrigin,
	pushReach,
	seamExitPolygon,
	sideOf,
	type Side
} from './chooser';

const SIDES: readonly Side[] = ['left', 'right', 'top', 'bottom'];

/** One polygon coordinate: a percentage plus an optional pixel term, as `N%` or `calc(N% ± Mpx)`. */
interface Coord {
	pct: number;
	px: number;
}

function coord(text: string): Coord {
	const plain = /^(-?[\d.]+)%$/.exec(text);
	if (plain) return { pct: Number(plain[1]), px: 0 };
	const calc = /^calc\((-?[\d.]+)% ([+-]) ([\d.]+)px\)$/.exec(text);
	if (!calc) throw new Error(`unparseable coordinate: ${text}`);
	return { pct: Number(calc[1]), px: (calc[2] === '-' ? -1 : 1) * Number(calc[3]) };
}

/** Splits `polygon(a b, c d, ...)` into vertices; commas inside calc() never occur here. */
function vertices(polygon: string): [Coord, Coord][] {
	const inner = /^polygon\((.*)\)$/.exec(polygon);
	if (!inner) throw new Error(`not a polygon: ${polygon}`);
	return inner[1].split(', ').map((pair) => {
		const parts = pair.split(/ (?=(?:calc\(|-?[\d.]+%))/);
		if (parts.length !== 2) throw new Error(`bad vertex: ${pair}`);
		return [coord(parts[0]), coord(parts[1])];
	});
}

/** Ray casting on the percentage terms; strict enough that a point on an edge counts as outside
 *  once the corners are nudged inwards. */
function contains(polygon: string, [x, y]: [number, number]): boolean {
	const pts = vertices(polygon).map(([a, b]) => [a.pct, b.pct]);
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const [xi, yi] = pts[i];
		const [xj, yj] = pts[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

const EPS = 0.01;
const CORNERS: [number, number][] = [
	[EPS, EPS],
	[100 - EPS, EPS],
	[100 - EPS, 100 - EPS],
	[EPS, 100 - EPS]
];

describe('timing', () => {
	it('overlaps the reveal with the tail of the sweep, never all of it', () => {
		expect(OVERLAP_MS).toBeGreaterThan(0);
		expect(OVERLAP_MS).toBeLessThan(SWEEP_MS);
		expect(REVEAL_MS).toBeGreaterThan(0);
		expect(PUSH_IN).toBeGreaterThan(1);
	});
});

describe('sideOf', () => {
	it('puts poe1 on the left or top and poe2 on the right or bottom', () => {
		expect(sideOf('poe1', false)).toBe('left');
		expect(sideOf('poe2', false)).toBe('right');
		expect(sideOf('poe1', true)).toBe('top');
		expect(sideOf('poe2', true)).toBe('bottom');
	});
});

describe('FULL_POLYGON', () => {
	it('covers the box with four corners in clockwise order', () => {
		expect(FULL_POLYGON).toBe('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
		for (const c of CORNERS) expect(contains(FULL_POLYGON, c)).toBe(true);
	});
});

describe('chooserPolygon', () => {
	it.each(SIDES)('%s: covers every corner at p=0', (side) => {
		const poly = chooserPolygon(side, 0);
		expect(vertices(poly)).toHaveLength(4);
		for (const c of CORNERS) expect(contains(poly, c)).toBe(true);
	});

	it.each(SIDES)('%s: covers no corner at p=1', (side) => {
		const poly = chooserPolygon(side, 1);
		expect(vertices(poly)).toHaveLength(4);
		for (const c of CORNERS) expect(contains(poly, c)).toBe(false);
	});

	it('keeps the seam slope: 8% across the height on desktop, 4% across the width stacked', () => {
		expect(chooserPolygon('left', 0.5)).toBe('polygon(54% 0%, 100% 0%, 100% 100%, 46% 100%)');
		expect(chooserPolygon('right', 0.5)).toBe('polygon(0% 0%, 54% 0%, 46% 100%, 0% 100%)');
		expect(chooserPolygon('top', 0.5)).toBe('polygon(0% 52%, 100% 48%, 100% 100%, 0% 100%)');
		expect(chooserPolygon('bottom', 0.5)).toBe('polygon(0% 0%, 100% 0%, 100% 48%, 0% 52%)');
	});

	it('is linear in p, so two keyframes interpolate it exactly', () => {
		for (const side of SIDES) {
			const at = (p: number) => vertices(chooserPolygon(side, p)).map(([a, b]) => [a.pct, b.pct]);
			const [p0, p1, mid] = [at(0), at(1), at(0.5)];
			mid.forEach(([x, y], i) => {
				expect(x).toBeCloseTo((p0[i][0] + p1[i][0]) / 2);
				expect(y).toBeCloseTo((p0[i][1] + p1[i][1]) / 2);
			});
		}
	});
});

describe('edgePolygon', () => {
	it.each([0, 0.5, 1])('is a 1px band on the chooser side of the edge at p=%s', (p) => {
		// left pick: the page comes from the left, so the chooser (and its band) sits to the right.
		let [v0, v1, v2, v3] = vertices(edgePolygon('left', p));
		expect(v1[0]).toEqual({ pct: v0[0].pct, px: v0[0].px + 1 });
		expect(v2[0]).toEqual({ pct: v3[0].pct, px: v3[0].px + 1 });
		expect([v0[1].pct, v1[1].pct, v2[1].pct, v3[1].pct]).toEqual([0, 0, 100, 100]);

		[v0, v1, v2, v3] = vertices(edgePolygon('right', p));
		expect(v0[0]).toEqual({ pct: v1[0].pct, px: v1[0].px - 1 });
		expect(v3[0]).toEqual({ pct: v2[0].pct, px: v2[0].px - 1 });
		expect([v0[1].pct, v1[1].pct, v2[1].pct, v3[1].pct]).toEqual([0, 0, 100, 100]);

		[v0, v1, v2, v3] = vertices(edgePolygon('top', p));
		expect(v3[1]).toEqual({ pct: v0[1].pct, px: v0[1].px + 1 });
		expect(v2[1]).toEqual({ pct: v1[1].pct, px: v1[1].px + 1 });
		expect([v0[0].pct, v1[0].pct, v2[0].pct, v3[0].pct]).toEqual([0, 100, 100, 0]);

		[v0, v1, v2, v3] = vertices(edgePolygon('bottom', p));
		expect(v0[1]).toEqual({ pct: v3[1].pct, px: v3[1].px - 1 });
		expect(v1[1]).toEqual({ pct: v2[1].pct, px: v2[1].px - 1 });
		expect([v0[0].pct, v1[0].pct, v2[0].pct, v3[0].pct]).toEqual([0, 100, 100, 0]);
	});

	it.each(SIDES)('%s: rides the chooser edge', (side) => {
		const edge = vertices(edgePolygon(side, 0.5)).map(([a, b]) => [a.pct, b.pct]);
		const chooser = vertices(chooserPolygon(side, 0.5)).map(([a, b]) => [a.pct, b.pct]);
		for (const v of edge) expect(chooser).toContainEqual(v);
	});
});

describe('seamExitPolygon', () => {
	it('keeps four vertices so the hairline can animate from its resting polygon', () => {
		for (const side of SIDES) expect(vertices(seamExitPolygon(side))).toHaveLength(4);
	});

	it('parks the hairline past the far edge with the seam slope intact', () => {
		expect(seamExitPolygon('left')).toBe(
			'polygon(calc(108% - 0.5px) 0%, calc(108% + 0.5px) 0%, calc(100% + 0.5px) 100%, calc(100% - 0.5px) 100%)'
		);
		expect(seamExitPolygon('right')).toBe(
			'polygon(calc(0% - 0.5px) 0%, calc(0% + 0.5px) 0%, calc(-8% + 0.5px) 100%, calc(-8% - 0.5px) 100%)'
		);
		expect(seamExitPolygon('top')).toBe(
			'polygon(0% calc(104% - 0.5px), 100% calc(100% - 0.5px), 100% calc(100% + 0.5px), 0% calc(104% + 0.5px))'
		);
		expect(seamExitPolygon('bottom')).toBe(
			'polygon(0% calc(0% - 0.5px), 100% calc(-4% - 0.5px), 100% calc(-4% + 0.5px), 0% calc(0% + 0.5px))'
		);
	});
});

describe('coverFit', () => {
	it('fills the height and overflows the width for a wide image', () => {
		const box = { width: 1000, height: 500 };
		const natural = { width: 2000, height: 500 };
		expect(coverFit(box, natural, { x: 0, y: 0.5 })).toEqual({
			left: 0,
			top: 0,
			width: 2000,
			height: 500
		});
		// object-position 45%: the point 45% across the image sits 45% across the box.
		expect(coverFit(box, natural, { x: 0.45, y: 0.5 })).toEqual({
			left: -450,
			top: 0,
			width: 2000,
			height: 500
		});
	});

	it('fills the width and overflows the height for a tall image', () => {
		const box = { width: 1000, height: 500 };
		const natural = { width: 500, height: 1000 };
		expect(coverFit(box, natural, { x: 0, y: 0.5 })).toEqual({
			left: 0,
			top: -750,
			width: 1000,
			height: 2000
		});
	});

	it('leaves a matching image exactly on the box', () => {
		expect(
			coverFit({ width: 300, height: 200 }, { width: 600, height: 400 }, { x: 1, y: 1 })
		).toEqual({ left: 0, top: 0, width: 300, height: 200 });
	});
});

describe('pinRect', () => {
	const natural = { width: 1800, height: 1600 };

	it('places the desktop halves in their 62% boxes, the right one 38% in', () => {
		const panel = { width: 1600, height: 900 };
		// Box 992x900; the image is wider than that, so it fills the height at 1012.5 wide.
		expect(pinRect('left', panel, natural)).toEqual({
			left: 0,
			top: 0,
			width: 1012.5,
			height: 900
		});
		const right = pinRect('right', panel, natural);
		expect(right.width).toBe(1012.5);
		expect(right.height).toBe(900);
		expect(right.top).toBe(0);
		expect(right.left).toBeCloseTo(0.38 * 1600 + (992 - 1012.5) * 0.45);
	});

	it('places the stacked halves in their 52% boxes, the bottom one 48% down', () => {
		const panel = { width: 400, height: 1000 };
		// Box 400x520; the image is wider than that, so it fills the height at 585 wide.
		expect(pinRect('top', panel, natural)).toEqual({ left: 0, top: 0, width: 585, height: 520 });
		const bottom = pinRect('bottom', panel, natural);
		expect(bottom.top).toBe(480);
		expect(bottom.height).toBe(520);
		expect(bottom.left).toBeCloseTo((400 - 585) * 0.45);
	});
});

describe('pushOrigin', () => {
	it('left: 20% in, just below centre', () => {
		expect(pushOrigin('left')).toEqual({ x: 0.2, y: 0.55 });
	});

	it('right: mirrors left, 80% in', () => {
		expect(pushOrigin('right')).toEqual({ x: 0.8, y: 0.55 });
	});

	it('top: centred, 35% down', () => {
		expect(pushOrigin('top')).toEqual({ x: 0.5, y: 0.35 });
	});

	it('bottom: mirrors top, 65% down', () => {
		expect(pushOrigin('bottom')).toEqual({ x: 0.5, y: 0.65 });
	});
});

describe('pushReach', () => {
	it('left: the growth over the 80% of the width between the origin and the right edge', () => {
		expect(pushReach('left', { width: 1000, height: 500 })).toBeCloseTo(48);
	});

	it('right: the growth over the 80% of the width between the origin and the left edge', () => {
		expect(pushReach('right', { width: 1000, height: 500 })).toBeCloseTo(48);
	});

	it('top: the growth over the 65% of the height between the origin and the bottom edge', () => {
		expect(pushReach('top', { width: 400, height: 1000 })).toBeCloseTo(39);
	});

	it('bottom: the growth over the 65% of the height between the origin and the top edge', () => {
		expect(pushReach('bottom', { width: 400, height: 1000 })).toBeCloseTo(39);
	});
});

describe('fadeRect', () => {
	it('is deeper side by side than stacked', () => {
		expect(FADE_DEPTH_WIDE).toBe(260);
		expect(FADE_DEPTH_STACKED).toBe(160);
	});

	it('left: from depth inside the right edge, the far one, to reach past it, the panel tall', () => {
		const panel = { width: 1600, height: 900 };
		const image = { left: 0, top: -50, width: 1012.5, height: 1000 };
		expect(fadeRect('left', panel, image, FADE_DEPTH_WIDE, 40)).toEqual({
			left: 1012.5 - 260,
			top: 0,
			width: 300,
			height: 900
		});
	});

	it('right: from depth inside the left edge, the far one, to reach past it, the panel tall', () => {
		const panel = { width: 1600, height: 900 };
		const image = { left: 598.775, top: -50, width: 1012.5, height: 1000 };
		expect(fadeRect('right', panel, image, FADE_DEPTH_WIDE, 40)).toEqual({
			left: 558.775,
			top: 0,
			width: 300,
			height: 900
		});
	});

	it('top: from depth inside the bottom edge, the far one, to reach past it, the panel wide', () => {
		const panel = { width: 400, height: 1000 };
		const image = { left: -83.25, top: 0, width: 585, height: 520 };
		expect(fadeRect('top', panel, image, FADE_DEPTH_STACKED, 20)).toEqual({
			left: 0,
			top: 520 - 160,
			width: 400,
			height: 180
		});
	});

	it('bottom: from depth inside the top edge, the far one, to reach past it, the panel wide', () => {
		const panel = { width: 400, height: 1000 };
		const image = { left: -83.25, top: 480, width: 585, height: 520 };
		expect(fadeRect('bottom', panel, image, FADE_DEPTH_STACKED, 20)).toEqual({
			left: 0,
			top: 460,
			width: 400,
			height: 180
		});
	});

	it('reaches to where the push-in carries the far edge, so the grown image still ends in canvas', () => {
		const wide = { width: 1600, height: 900 };
		const stacked = { width: 400, height: 1000 };
		const natural = { width: 1800, height: 1600 };
		const grow = PUSH_IN - 1;

		const left = pinRect('left', wide, natural);
		const l = fadeRect('left', wide, left, FADE_DEPTH_WIDE, pushReach('left', left));
		expect(l && l.left + l.width).toBeCloseTo(left.left + left.width + grow * 0.8 * left.width);

		const right = pinRect('right', wide, natural);
		const r = fadeRect('right', wide, right, FADE_DEPTH_WIDE, pushReach('right', right));
		expect(r?.left).toBeCloseTo(right.left - grow * 0.8 * right.width);

		const top = pinRect('top', stacked, natural);
		const t = fadeRect('top', stacked, top, FADE_DEPTH_STACKED, pushReach('top', top));
		expect(t && t.top + t.height).toBeCloseTo(top.top + top.height + grow * 0.65 * top.height);

		const bottom = pinRect('bottom', stacked, natural);
		const b = fadeRect('bottom', stacked, bottom, FADE_DEPTH_STACKED, pushReach('bottom', bottom));
		expect(b?.top).toBeCloseTo(bottom.top - grow * 0.65 * bottom.height);
	});

	it('is null when the image already reaches the far edge, so there is nothing to hide', () => {
		const panel = { width: 1600, height: 900 };
		const full = { left: 0, top: 0, width: 1600, height: 900 };
		for (const side of SIDES) expect(fadeRect(side, panel, full, 260, 40)).toBeNull();
		// Overflowing past the far edge counts as reaching it.
		expect(
			fadeRect('left', panel, { left: 0, top: 0, width: 1700, height: 900 }, 260, 40)
		).toBeNull();
		expect(
			fadeRect('right', panel, { left: -50, top: 0, width: 1700, height: 900 }, 260, 40)
		).toBeNull();
		expect(
			fadeRect('top', panel, { left: 0, top: 0, width: 1600, height: 950 }, 160, 20)
		).toBeNull();
		expect(
			fadeRect('bottom', panel, { left: 0, top: -50, width: 1600, height: 950 }, 160, 20)
		).toBeNull();
	});
});
