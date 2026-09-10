/* The tool opening: clicking a directory card opens the tool page out of the card, and going
   back folds the page into it. Two things move on one timeline of TRAVEL_MS:

   - The window. The card's own view-transition group. It starts as a line with no width on the
     card's left edge, grows across the card face for the first SWEEP of the time (ease-in), then
     from the card out to the viewport (ease-out), so the edge is fastest as it leaves the card and
     the motion reads as one swell. The new page is clipped to the same box underneath, and the
     card's snapshot stays pinned where the card was, clipped to whatever the edge has not crossed,
     so nothing cuts or fades: one moving edge uncovers everything, the card face included.
   - The icon and the name. Shared elements between the card and the tool page's aside, flown
     on their own ease. The group is the destination's size and scales up from the source's; the
     source image is pinned to its own size and pre-scaled so both images coincide, and the
     handover between them is an opacity swap in the middle of the flight, where nothing is at
     rest. The landing is then the live destination at native size, and nothing snaps at the end.

   Closing runs the same path backwards. Values were picked in the lab of 2026-09-10. */

export const TRAVEL_MS = 320;
/** Share of the travel the window spends crossing the card face. */
export const SWEEP = 0.15;
/** Expo-out: the icon and name leave at once and settle gently. */
export const ICON_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const WINDOW_IN_EASE = 'cubic-bezier(0.4, 0, 1, 1)';
export const WINDOW_OUT_EASE = 'cubic-bezier(0, 0, 0.2, 1)';
/** Where in the flight the source image gives way to the destination image. */
export const HANDOVER: readonly [number, number] = [0.3, 0.7];
/** Share of the travel over which the ring appears (open) or dissolves (close): before the box
 *  has any width, the ring would be a stray line on the card's left border. */
export const RING_SHARE = 0.08;

export type Direction = 'open' | 'close';

export interface Rect {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface WindowKeyframes {
	/** `::view-transition-group(card)`: the window's box. */
	group: Keyframe[];
	/** The page being uncovered: `::view-transition-new(root)` on open, `-old(root)` on close. */
	root: Keyframe[];
	/** The card snapshot: `-old(card)` on open, `-new(card)` on close. Pinned where the card is. */
	heldTransform: Keyframe[];
	/** The same image, clipped to the part the window's right edge has not crossed. */
	heldClip: Keyframe[];
	/** `::view-transition-image-pair(card)`: the ring and the corner radius. */
	ring: Keyframe[];
}

export interface FlightKeyframes {
	group: Keyframe[];
	old: Keyframe[];
	new: Keyframe[];
}

function px(n: number): string {
	return `${Math.round(n * 100) / 100}px`;
}

function num(n: number): number {
	return Math.round(n * 1e6) / 1e6;
}

/** The window at rest: no width, on the card's left edge, the card's height. */
export function restBox(card: Rect): Rect {
	return { left: card.left, top: card.top, width: 0, height: card.height };
}

/** Clips a full-viewport layer to the rectangle. */
export function insetOf(r: Rect): string {
	return `inset(${px(r.top)} calc(100% - ${px(r.left + r.width)}) calc(100% - ${px(r.top + r.height)}) ${px(r.left)})`;
}

function box(r: Rect): Keyframe {
	return {
		transform: `translate(${px(r.left)}, ${px(r.top)})`,
		width: px(r.width),
		height: px(r.height)
	};
}

const FACE_WHOLE = 'inset(0px 0px 0px 0px)';
const FACE_GONE = 'inset(0px 0px 0px 100%)';
const NO_RING = '0 0 0 1px transparent';

export function windowKeyframes(
	dir: Direction,
	card: Rect,
	viewport: Rect,
	ring: string
): WindowKeyframes {
	const open = dir === 'open';
	const rest = restBox(card);
	const mid = open ? SWEEP : 1 - SWEEP;
	const inE = WINDOW_IN_EASE;
	const outE = WINDOW_OUT_EASE;
	const size = { width: px(card.width), height: px(card.height) };
	const pinned = `translate(${px(card.left)}, ${px(card.top)})`;
	const origin = 'translate(0px, 0px)';
	const ringOn = Math.min(RING_SHARE, SWEEP);

	return open
		? {
				group: [
					{ ...box(rest), easing: inE },
					{ ...box(card), offset: mid, easing: outE },
					box(viewport)
				],
				root: [
					{ clipPath: insetOf(rest), easing: inE },
					{ clipPath: insetOf(card), offset: mid, easing: outE },
					{ clipPath: 'inset(0px)' }
				],
				heldTransform: [
					{ ...size, transform: origin, easing: inE },
					{ ...size, transform: origin, offset: mid, easing: outE },
					{ ...size, transform: pinned }
				],
				heldClip: [
					{ clipPath: FACE_WHOLE, easing: inE },
					{ clipPath: FACE_GONE, offset: mid },
					{ clipPath: FACE_GONE }
				],
				ring: [
					{ borderRadius: '8px', boxShadow: NO_RING },
					{ borderRadius: '8px', boxShadow: ring, offset: ringOn },
					{ borderRadius: '8px', boxShadow: ring, offset: mid },
					{ borderRadius: '2px', boxShadow: ring, offset: 0.8 },
					{ borderRadius: '0px', boxShadow: NO_RING }
				]
			}
		: {
				group: [
					{ ...box(viewport), easing: inE },
					{ ...box(card), offset: mid, easing: outE },
					box(rest)
				],
				root: [
					{ clipPath: 'inset(0px)', easing: inE },
					{ clipPath: insetOf(card), offset: mid, easing: outE },
					{ clipPath: insetOf(rest) }
				],
				heldTransform: [
					{ ...size, transform: pinned, easing: inE },
					{ ...size, transform: origin, offset: mid, easing: outE },
					{ ...size, transform: origin }
				],
				heldClip: [
					{ clipPath: FACE_GONE },
					{ clipPath: FACE_GONE, offset: mid, easing: outE },
					{ clipPath: FACE_WHOLE }
				],
				ring: [
					{ borderRadius: '0px', boxShadow: NO_RING },
					{ borderRadius: '2px', boxShadow: ring, offset: 0.2 },
					{ borderRadius: '8px', boxShadow: ring, offset: mid },
					{ borderRadius: '8px', boxShadow: ring, offset: 1 - ringOn },
					{ borderRadius: '8px', boxShadow: NO_RING }
				]
			};
}

export function flightKeyframes(from: Rect, to: Rect): FlightKeyframes {
	const r = to.height / from.height;
	const size = { width: px(from.width), height: px(from.height), transform: `scale(${num(r)})` };
	return {
		group: [
			{ transform: `translate(${px(from.left)}, ${px(from.top)}) scale(${num(1 / r)})` },
			{ transform: `translate(${px(to.left)}, ${px(to.top)}) scale(1)` }
		],
		old: [
			{ ...size, opacity: 1 },
			{ ...size, opacity: 1, offset: HANDOVER[0] },
			{ ...size, opacity: 0, offset: HANDOVER[1] },
			{ ...size, opacity: 0 }
		],
		new: [
			{ opacity: 0 },
			{ opacity: 0, offset: HANDOVER[0] },
			{ opacity: 1, offset: HANDOVER[1] },
			{ opacity: 1 }
		]
	};
}

/** Whether any part of the rectangle is inside the viewport. */
export function overlaps(r: Rect, viewport: Rect): boolean {
	return (
		r.left < viewport.left + viewport.width &&
		r.left + r.width > viewport.left &&
		r.top < viewport.top + viewport.height &&
		r.top + r.height > viewport.top
	);
}
