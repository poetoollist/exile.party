import { describe, expect, it } from 'vitest';
import {
	HANDOVER,
	ICON_EASE,
	RING_SHARE,
	SWEEP,
	TRAVEL_MS,
	WINDOW_IN_EASE,
	WINDOW_OUT_EASE,
	flightKeyframes,
	insetOf,
	overlaps,
	restBox,
	windowKeyframes,
	type Rect
} from './opening';

const card: Rect = { left: 418, top: 672, width: 278.5, height: 118 };
const viewport: Rect = { left: 0, top: 0, width: 1440, height: 900 };
const RING = '0 0 0 1px rgb(255 255 255 / 0.14)';

/** `translate(Xpx, Ypx)`, `scale(S)`, or both, back into numbers. */
function transform(text: unknown): { x: number; y: number; scale: number } {
	const m = /^(?:translate\((-?[\d.]+)px, (-?[\d.]+)px\))?(?: ?scale\((-?[\d.]+)\))?$/.exec(
		String(text)
	);
	if (!m || (m[1] === undefined && m[3] === undefined))
		throw new Error(`unparseable transform: ${text}`);
	return {
		x: Number(m[1] ?? 0),
		y: Number(m[2] ?? 0),
		scale: m[3] === undefined ? 1 : Number(m[3])
	};
}

function offsets(frames: Keyframe[]): (number | null | undefined)[] {
	return frames.map((f) => f.offset);
}

describe('settings', () => {
	it('carry the values picked in the lab', () => {
		expect(TRAVEL_MS).toBe(320);
		expect(SWEEP).toBe(0.15);
		expect(ICON_EASE).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
		expect(HANDOVER[0]).toBeLessThan(HANDOVER[1]);
		expect(RING_SHARE).toBeLessThan(SWEEP);
	});
});

describe('restBox', () => {
	it('is a line with no width on the card’s left edge, the card’s height', () => {
		expect(restBox(card)).toEqual({ left: 418, top: 672, width: 0, height: 118 });
	});
});

describe('insetOf', () => {
	it('clips a full-viewport layer to the rectangle', () => {
		expect(insetOf({ left: 10, top: 20, width: 100, height: 50 })).toBe(
			'inset(20px calc(100% - 110px) calc(100% - 70px) 10px)'
		);
	});
});

describe('windowKeyframes, open', () => {
	const k = windowKeyframes('open', card, viewport, RING);

	it('grows the group from the rest line across the card, then out to the viewport', () => {
		expect(k.group.map((f) => f.width)).toEqual(['0px', '278.5px', '1440px']);
		expect(transform(k.group[0].transform)).toEqual({ x: 418, y: 672, scale: 1 });
		expect(transform(k.group[2].transform)).toEqual({ x: 0, y: 0, scale: 1 });
		expect(offsets(k.group)).toEqual([undefined, SWEEP, undefined]);
	});

	it('eases in across the card and out to the viewport', () => {
		expect(k.group[0].easing).toBe(WINDOW_IN_EASE);
		expect(k.group[1].easing).toBe(WINDOW_OUT_EASE);
	});

	it('clips the new page to the same box', () => {
		expect(k.root.map((f) => f.clipPath)).toEqual([
			insetOf(restBox(card)),
			insetOf(card),
			'inset(0px)'
		]);
		expect(offsets(k.root)).toEqual([undefined, SWEEP, undefined]);
	});

	it('pins the card snapshot where the card was while the box moves under it', () => {
		// The image sits at the group’s origin, so it needs the card’s offset once the box reaches (0, 0).
		expect(transform(k.heldTransform[0].transform)).toEqual({ x: 0, y: 0, scale: 1 });
		expect(transform(k.heldTransform[2].transform)).toEqual({ x: 418, y: 672, scale: 1 });
		for (const f of k.heldTransform) {
			expect(f.width).toBe('278.5px');
			expect(f.height).toBe('118px');
		}
	});

	it('wipes the card face away during the sweep and keeps it gone', () => {
		expect(k.heldClip.map((f) => f.clipPath)).toEqual([
			'inset(0px 0px 0px 0px)',
			'inset(0px 0px 0px 100%)',
			'inset(0px 0px 0px 100%)'
		]);
		expect(offsets(k.heldClip)).toEqual([undefined, SWEEP, undefined]);
		expect(k.heldClip[0].easing).toBe(WINDOW_IN_EASE);
	});

	it('draws the ring once the box has width and dissolves it as the box fills the viewport', () => {
		expect(k.ring[0].boxShadow).not.toBe(RING);
		expect(k.ring[1]).toMatchObject({ boxShadow: RING, offset: RING_SHARE });
		expect(k.ring.at(-1)).toMatchObject({ borderRadius: '0px' });
		expect(k.ring.at(-1)?.boxShadow).not.toBe(RING);
		const o = k.ring.map((f) => f.offset ?? null);
		const numeric = o.filter((v): v is number => v !== null);
		expect([...numeric].sort((a, b) => a - b)).toEqual(numeric);
	});
});

describe('windowKeyframes, close', () => {
	const k = windowKeyframes('close', card, viewport, RING);

	it('runs the open path backwards with the sweep at the end', () => {
		expect(k.group.map((f) => f.width)).toEqual(['1440px', '278.5px', '0px']);
		expect(offsets(k.group)).toEqual([undefined, 1 - SWEEP, undefined]);
		expect(k.root.map((f) => f.clipPath)).toEqual([
			'inset(0px)',
			insetOf(card),
			insetOf(restBox(card))
		]);
	});

	it('redraws the card face as the retreating edge crosses it', () => {
		expect(k.heldClip.map((f) => f.clipPath)).toEqual([
			'inset(0px 0px 0px 100%)',
			'inset(0px 0px 0px 100%)',
			'inset(0px 0px 0px 0px)'
		]);
		expect(offsets(k.heldClip)).toEqual([undefined, 1 - SWEEP, undefined]);
		expect(transform(k.heldTransform[0].transform)).toEqual({ x: 418, y: 672, scale: 1 });
		expect(transform(k.heldTransform[2].transform)).toEqual({ x: 0, y: 0, scale: 1 });
	});

	it('brings the ring in as the box nears the card and drops it before the end', () => {
		expect(k.ring[0].boxShadow).not.toBe(RING);
		expect(k.ring.at(-2)).toMatchObject({ boxShadow: RING, offset: 1 - RING_SHARE });
		expect(k.ring.at(-1)).toMatchObject({ borderRadius: '8px' });
		expect(k.ring.at(-1)?.boxShadow).not.toBe(RING);
	});
});

describe('flightKeyframes', () => {
	const from: Rect = { left: 434, top: 688, width: 36, height: 36 };
	const to: Rect = { left: 979, top: 288, width: 40, height: 40 };
	const k = flightKeyframes(from, to);

	it('moves the group from the source to the destination, scaling up to the destination size', () => {
		// The group is the destination’s size, so it starts scaled down to the source’s.
		expect(transform(k.group[0].transform)).toEqual({ x: 434, y: 688, scale: 0.9 });
		expect(transform(k.group[1].transform)).toEqual({ x: 979, y: 288, scale: 1 });
	});

	it('keeps the source image at its own size, pre-scaled so it coincides with the destination image', () => {
		for (const f of k.old) {
			expect(f.width).toBe('36px');
			expect(f.height).toBe('36px');
			expect(transform(f.transform).scale).toBeCloseTo(40 / 36, 5);
		}
	});

	it('hands over from the source image to the destination image in the middle of the flight', () => {
		expect(k.old.map((f) => [f.offset, f.opacity])).toEqual([
			[undefined, 1],
			[HANDOVER[0], 1],
			[HANDOVER[1], 0],
			[undefined, 0]
		]);
		expect(k.new.map((f) => [f.offset, f.opacity])).toEqual([
			[undefined, 0],
			[HANDOVER[0], 0],
			[HANDOVER[1], 1],
			[undefined, 1]
		]);
	});
});

describe('overlaps', () => {
	it('is true when any part of the rectangle is inside the viewport', () => {
		expect(overlaps({ left: 1400, top: 880, width: 100, height: 100 }, viewport)).toBe(true);
		expect(overlaps({ left: -50, top: -50, width: 60, height: 60 }, viewport)).toBe(true);
	});

	it('is false when the rectangle is entirely outside', () => {
		expect(overlaps({ left: 0, top: 900, width: 100, height: 100 }, viewport)).toBe(false);
		expect(overlaps({ left: 1440, top: 0, width: 100, height: 100 }, viewport)).toBe(false);
		expect(overlaps({ left: 0, top: -100, width: 100, height: 100 }, viewport)).toBe(false);
	});
});
