import type { Game } from './catalog/schema';

/* The pick is one continuous motion: the picked half sweeps open along the seam, then the game
   page is revealed by a second edge at the same angle. The reveal starts before the sweep ends. */
export const SWEEP_MS = 420;
export const REVEAL_MS = 520;
export const OVERLAP_MS = 140;
/** How far the picked image pushes in over the sweep and the reveal together. */
export const PUSH_IN = 1.06;
export const SWEEP_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
export const REVEAL_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Every clip polygon here has four vertices in this order, so any two of them interpolate. */
export const FULL_POLYGON = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

/** Where the picked half sits: left/right side by side on desktop, top/bottom stacked on mobile. */
export type Side = 'left' | 'right' | 'top' | 'bottom';

export function sideOf(game: Game, stacked: boolean): Side {
	if (game === 'poe1') return stacked ? 'top' : 'left';
	return stacked ? 'bottom' : 'right';
}

function pct(n: number): string {
	return `${Number(n.toFixed(4))}%`;
}

/** The seam hairline's parking polygon: past the far edge, slope intact, matching the vertex
 *  order of the resting polygons in +page.svelte so it can animate from its computed value. */
export function seamExitPolygon(side: Side): string {
	switch (side) {
		case 'left':
			return 'polygon(calc(108% - 0.5px) 0%, calc(108% + 0.5px) 0%, calc(100% + 0.5px) 100%, calc(100% - 0.5px) 100%)';
		case 'right':
			return 'polygon(calc(0% - 0.5px) 0%, calc(0% + 0.5px) 0%, calc(-8% + 0.5px) 100%, calc(-8% - 0.5px) 100%)';
		case 'top':
			return 'polygon(0% calc(104% - 0.5px), 100% calc(100% - 0.5px), 100% calc(100% + 0.5px), 0% calc(104% + 0.5px))';
		case 'bottom':
			return 'polygon(0% calc(0% - 0.5px), 100% calc(-4% - 0.5px), 100% calc(-4% + 0.5px), 0% calc(0% + 0.5px))';
	}
}

/** The reveal edge at progress p: two coordinates along the sweep axis, one per far end of the
 *  cross axis. Linear in p, so keyframes at 0 and 1 interpolate exactly. */
function edge(side: Side, p: number): [number, number] {
	switch (side) {
		case 'left':
			return [108 * p, 108 * p - 8];
		case 'right':
			return [108 - 108 * p, 100 - 108 * p];
		case 'top':
			return [104 * p, 104 * p - 4];
		case 'bottom':
			return [104 - 104 * p, 100 - 104 * p];
	}
}

/** What is left of the chooser at progress p: the complement of the revealed page, so the root
 *  can be clipped with it while pinned over the new page. */
export function chooserPolygon(side: Side, p: number): string {
	const [a, b] = edge(side, p);
	switch (side) {
		case 'left':
			return `polygon(${pct(a)} 0%, 100% 0%, 100% 100%, ${pct(b)} 100%)`;
		case 'right':
			return `polygon(0% 0%, ${pct(a)} 0%, ${pct(b)} 100%, 0% 100%)`;
		case 'top':
			return `polygon(0% ${pct(a)}, 100% ${pct(b)}, 100% 100%, 0% 100%)`;
		case 'bottom':
			return `polygon(0% 0%, 100% 0%, 100% ${pct(b)}, 0% ${pct(a)})`;
	}
}

/** A one-pixel band on the chooser's side of the reveal edge at progress p. */
export function edgePolygon(side: Side, p: number): string {
	const [a, b] = edge(side, p);
	switch (side) {
		case 'left':
			return `polygon(${pct(a)} 0%, calc(${pct(a)} + 1px) 0%, calc(${pct(b)} + 1px) 100%, ${pct(b)} 100%)`;
		case 'right':
			return `polygon(calc(${pct(a)} - 1px) 0%, ${pct(a)} 0%, ${pct(b)} 100%, calc(${pct(b)} - 1px) 100%)`;
		case 'top':
			return `polygon(0% ${pct(a)}, 100% ${pct(b)}, 100% calc(${pct(b)} + 1px), 0% calc(${pct(a)} + 1px))`;
		case 'bottom':
			return `polygon(0% calc(${pct(a)} - 1px), 100% calc(${pct(b)} - 1px), 100% ${pct(b)}, 0% ${pct(a)})`;
	}
}

export interface Size {
	width: number;
	height: number;
}

export interface Rect extends Size {
	left: number;
	top: number;
}

/** Object-position as fractions of the slack on each axis. */
export interface Position {
	x: number;
	y: number;
}

/** The rectangle `object-fit: cover` paints an image into, relative to the box's origin. */
export function coverFit(box: Size, natural: Size, position: Position): Rect {
	const scale = Math.max(box.width / natural.width, box.height / natural.height);
	const width = natural.width * scale;
	const height = natural.height * scale;
	// `+ 0` folds the -0 a zero fraction produces into a plain 0.
	return {
		left: (box.width - width) * position.x + 0,
		top: (box.height - height) * position.y + 0,
		width,
		height
	};
}

/* Each half's art lives in a virtual box the stylesheet also knows: on desktop 62% wide, the
   right one starting 38% in; stacked, 52% tall, the bottom one starting 48% down. The crop is
   anchored to the outer side (0%), the right/bottom half slightly inset (45%). */
function artBox(side: Side, panel: Size): Rect {
	switch (side) {
		case 'left':
			return { left: 0, top: 0, width: 0.62 * panel.width, height: panel.height };
		case 'right':
			return { left: 0.38 * panel.width, top: 0, width: 0.62 * panel.width, height: panel.height };
		case 'top':
			return { left: 0, top: 0, width: panel.width, height: 0.52 * panel.height };
		case 'bottom':
			return { left: 0, top: 0.48 * panel.height, width: panel.width, height: 0.52 * panel.height };
	}
}

function artPosition(side: Side): Position {
	return { x: side === 'left' || side === 'top' ? 0 : 0.45, y: 0.5 };
}

/** Where the image sits in the panel's own coordinates once pinned: the exact pixels cover-fit
 *  gave it in its virtual box, so opening the half continues the picture at the same scale. */
export function pinRect(side: Side, panel: Size, natural: Size): Rect {
	const box = artBox(side, panel);
	const fit = coverFit(box, natural, artPosition(side));
	return {
		left: box.left + fit.left,
		top: box.top + fit.top,
		width: fit.width,
		height: fit.height
	};
}

/** Where the push-in scales from, as fractions of the image: the point of interest of each crop,
 *  near the outer edge so the growth runs towards the far one. pin() sets it inline, so the
 *  transform and the fade agree on it. */
export function pushOrigin(side: Side): Position {
	switch (side) {
		case 'left':
			return { x: 0.2, y: 0.55 };
		case 'right':
			return { x: 0.8, y: 0.55 };
		case 'top':
			return { x: 0.5, y: 0.35 };
		case 'bottom':
			return { x: 0.5, y: 0.65 };
	}
}

/** How far the push-in carries the image's far edge past where it rests: the growth times the
 *  distance from the origin to that edge along the sweep axis. */
export function pushReach(side: Side, image: Size): number {
	const origin = pushOrigin(side);
	const grow = PUSH_IN - 1;
	switch (side) {
		case 'left':
			return grow * (1 - origin.x) * image.width;
		case 'right':
			return grow * origin.x * image.width;
		case 'top':
			return grow * (1 - origin.y) * image.height;
		case 'bottom':
			return grow * origin.y * image.height;
	}
}

/* Where the pinned image stops short of the far edge it must end in canvas, not a hard line.
   A gradient overlay does that, revealed by a clip; both stay on the compositor, where a mask on
   the image would be re-rasterised every frame of the sweep. Deeper side by side, where the image
   has more room to run out. */
export const FADE_DEPTH_WIDE = 260;
export const FADE_DEPTH_STACKED = 160;

/* The sweep uncovers the image's far edge within its first frames, sooner the smaller the screen,
   so the fade cannot arrive over time. It opens from the band's far end instead: the edge sits
   `reach` in from there and is covered at once, and the depth the hover showed darkens last.
   Expo-out, not the sweep's cubic-out: on a high-refresh display the seam can pass the edge
   within a frame or two, and expo-out has the edge covered in half the time. */
export const FADE_MS = 180;
export const FADE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const FADE_SHOWN = 'inset(0px 0px 0px 0px)';

/** The band at rest: collapsed onto its far end, so fully inset from the half's own edge. */
export function fadeHidden(side: Side): string {
	switch (side) {
		case 'left':
			return 'inset(0px 0px 0px 100%)';
		case 'right':
			return 'inset(0px 100% 0px 0px)';
		case 'top':
			return 'inset(100% 0px 0px 0px)';
		case 'bottom':
			return 'inset(0px 0px 100% 0px)';
	}
}

/** The overlay in the panel's own coordinates: a band from `depth` inside the image's far edge to
 *  `reach` past it, spanning the panel on the cross axis. The push-in grows the image towards
 *  that edge under a fade that does not move with it, so the band must already cover where the
 *  edge ends up. Null when the image already reaches the panel's edge and there is nothing to
 *  hide. */
export function fadeRect(
	side: Side,
	panel: Size,
	image: Rect,
	depth: number,
	reach: number
): Rect | null {
	switch (side) {
		case 'left':
			if (image.left + image.width >= panel.width) return null;
			return {
				left: image.left + image.width - depth,
				top: 0,
				width: depth + reach,
				height: panel.height
			};
		case 'right':
			if (image.left <= 0) return null;
			return { left: image.left - reach, top: 0, width: depth + reach, height: panel.height };
		case 'top':
			if (image.top + image.height >= panel.height) return null;
			return {
				left: 0,
				top: image.top + image.height - depth,
				width: panel.width,
				height: depth + reach
			};
		case 'bottom':
			if (image.top <= 0) return null;
			return { left: 0, top: image.top - reach, width: panel.width, height: depth + reach };
	}
}
