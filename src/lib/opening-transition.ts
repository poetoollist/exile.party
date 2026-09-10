/* Runs the tool opening (see opening.ts) around SvelteKit's client-side navigation between a
   directory page and a tool page. Browser only: the layout hands `openingNavigate` to onNavigate,
   and ToolCard reports the card that was clicked through `pickCard`.

   Old-state elements are named before the transition starts, new-state ones inside the update
   callback once Kit has rendered the new page, and every WAAPI animation runs on the transition's
   pseudo-elements. All of it is undone when the transition ends. */

import type { OnNavigate } from '@sveltejs/kit';
import {
	ICON_EASE,
	TRAVEL_MS,
	flightKeyframes,
	overlaps,
	windowKeyframes,
	type Direction,
	type Rect
} from './opening';

const DIRECTORY_ROUTES = new Set(['/[game=game]', '/tools']);
const TOOL_ROUTE = '/tools/[id]';

interface Parts {
	/** The directory card; absent on the tool page side. */
	card: HTMLElement | null;
	icon: HTMLElement;
	name: HTMLElement;
}

let picked: HTMLElement | null = null;

/** ToolCard calls this from its link's click: which card was chosen. No DOM work happens here. */
export function pickCard(card: HTMLElement | null) {
	picked = card;
}

function still(): boolean {
	return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function rect(el: Element): Rect {
	const r = el.getBoundingClientRect();
	return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function viewport(): Rect {
	return { left: 0, top: 0, width: innerWidth, height: innerHeight };
}

function partsOf(root: ParentNode | null, card: HTMLElement | null): Parts | null {
	const icon = root?.querySelector<HTMLElement>('[data-opening="icon"]') ?? null;
	const name = root?.querySelector<HTMLElement>('[data-opening="name"]') ?? null;
	return icon && name ? { card, icon, name } : null;
}

function cardParts(card: HTMLElement | null): Parts | null {
	return card ? partsOf(card, card) : null;
}

function asideParts(): Parts | null {
	return partsOf(document.querySelector('main aside'), null);
}

/** The tool's card on the directory page, if one is on screen: a tool can sit in more than one
 *  section, and a card that is scrolled away gives the page nothing to fold into. */
function cardFor(id: string): HTMLElement | null {
	const vp = viewport();
	for (const card of document.querySelectorAll<HTMLElement>(
		`[data-opening="card"][data-tool="${CSS.escape(id)}"]`
	)) {
		if (overlaps(rect(card), vp)) return card;
	}
	return null;
}

function setNames(parts: Parts, on: boolean) {
	parts.icon.style.viewTransitionName = on ? 'icon' : '';
	parts.name.style.viewTransitionName = on ? 'name' : '';
	if (parts.card) parts.card.style.viewTransitionName = on ? 'card' : '';
}

/** For the layout's onNavigate. Returns the promise Kit must wait on when a transition runs. */
export function openingNavigate(navigation: OnNavigate): Promise<void> | undefined {
	const card = picked;
	picked = null;
	const from = navigation.from?.route.id;
	const to = navigation.to?.route.id;
	if (!from || !to || typeof document.startViewTransition !== 'function' || still()) return;

	if (DIRECTORY_ROUTES.has(from) && to === TOOL_ROUTE) {
		// Only the card that was actually clicked: a modifier-click leaves a stale pick behind.
		if (card && card.dataset.tool === navigation.to?.params?.id) {
			const parts = cardParts(card);
			if (parts) return run('open', navigation, parts, () => asideParts());
		}
		return;
	}

	if (from === TOOL_ROUTE && DIRECTORY_ROUTES.has(to)) {
		const id = navigation.from?.params?.id;
		const parts = asideParts();
		if (id && parts) return run('close', navigation, parts, () => cardParts(cardFor(id)));
	}
}

function run(
	dir: Direction,
	navigation: OnNavigate,
	old: Parts,
	findFresh: () => Parts | null
): Promise<void> {
	const root = document.documentElement;
	const running: Animation[] = [];
	const animate = (pseudo: string, keyframes: Keyframe[], easing: string) =>
		running.push(
			root.animate(keyframes, { duration: TRAVEL_MS, easing, fill: 'both', pseudoElement: pseudo })
		);

	setNames(old, true);
	const oldRects = {
		card: old.card ? rect(old.card) : null,
		icon: rect(old.icon),
		name: rect(old.name)
	};
	root.dataset.opening = dir;

	let fresh: Parts | null = null;
	let freshRects: { card: Rect | null; icon: Rect; name: Rect } | null = null;

	return new Promise<void>((resolve) => {
		const transition = document.startViewTransition(async () => {
			resolve();
			try {
				await navigation.complete;
			} catch {
				return; // the navigation was cancelled or failed: the transition just ends
			}
			fresh = findFresh();
			if (!fresh) return; // nothing to fly to: the transition ends as a cut
			setNames(fresh, true);
			freshRects = {
				card: fresh.card ? rect(fresh.card) : null,
				icon: rect(fresh.icon),
				name: rect(fresh.name)
			};
		});

		transition.ready
			.then(() => {
				if (!freshRects) return;
				const card = dir === 'open' ? oldRects.card : freshRects.card;
				if (!card) return;
				const ring = `0 0 0 1px ${getComputedStyle(root).getPropertyValue('--line-strong').trim()}`;
				const w = windowKeyframes(dir, card, viewport(), ring);
				const held = dir === 'open' ? '::view-transition-old(card)' : '::view-transition-new(card)';
				animate('::view-transition-group(card)', w.group, 'linear');
				animate(
					dir === 'open' ? '::view-transition-new(root)' : '::view-transition-old(root)',
					w.root,
					'linear'
				);
				animate(held, w.heldTransform, 'linear');
				animate(held, w.heldClip, 'linear');
				animate('::view-transition-image-pair(card)', w.ring, 'linear');
				for (const part of ['icon', 'name'] as const) {
					const f = flightKeyframes(oldRects[part], freshRects[part]);
					animate(`::view-transition-group(${part})`, f.group, ICON_EASE);
					animate(`::view-transition-old(${part})`, f.old, ICON_EASE);
					animate(`::view-transition-new(${part})`, f.new, ICON_EASE);
				}
			})
			.catch(() => {
				/* skipped or interrupted: the page is already in its final state */
			});

		const cleanup = () => {
			for (const a of running) a.cancel();
			setNames(old, false);
			if (fresh) setNames(fresh, false);
			delete root.dataset.opening;
		};
		transition.finished.then(cleanup, cleanup);
	});
}
