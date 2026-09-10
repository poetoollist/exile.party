<script lang="ts">
	import { resolve } from '$app/paths';
	import { ART } from '$lib/art';
	import { GAME_NAME } from '$lib/catalog/display';
	import type { Game } from '$lib/catalog/schema';
	import {
		FADE_DEPTH_STACKED,
		FADE_DEPTH_WIDE,
		FADE_EASE,
		FADE_MS,
		FADE_SHOWN,
		FULL_POLYGON,
		PUSH_IN,
		REVEAL_MS,
		SWEEP_EASE,
		SWEEP_MS,
		fadeHidden,
		fadeRect,
		pinRect,
		pushOrigin,
		pushReach,
		sideOf,
		type Rect,
		type Side
	} from '$lib/chooser';

	interface Props {
		game: Game;
		count: number;
		/** The half the pointer or keyboard focus is on, if any. */
		hovered: Game | null;
		/** The half that has been picked and is sweeping open, if any. */
		picked: Game | null;
		onhover: (game: Game | null) => void;
		onpick: (game: Game, href: string) => void;
	}

	let { game, count, hovered, picked, onhover, onpick }: Props = $props();

	const side = $derived(game === 'poe1' ? 'left' : 'right');
	const href = $derived(resolve('/[game=game]', { game }));
	const hot = $derived(hovered === game);
	const dimmed = $derived(hovered !== null && hovered !== game);
	const isPicked = $derived(picked === game);

	let panel = $state<HTMLAnchorElement | null>(null);
	let img = $state<HTMLImageElement | null>(null);
	let fade = $state<HTMLDivElement | null>(null);
	let pinned = $state(false);
	/* The side pin() laid the half out for; the pick's fade reveal needs it. Nothing renders from
	   it, so plain. */
	let pinSide: Side = 'left';

	function place(el: HTMLElement, rect: Rect) {
		el.style.left = `${rect.left}px`;
		el.style.top = `${rect.top}px`;
		el.style.width = `${rect.width}px`;
		el.style.height = `${rect.height}px`;
	}

	/* Pins the image at the exact pixels cover-fit gives it in its virtual box, so opening the
	   half continues the picture instead of rescaling it. Until this runs the stylesheet's box
	   plus object-fit shows the same crop, which is also what a visitor without JS gets. */
	function pin() {
		if (!panel || !img || !fade || !img.naturalWidth) return;
		const stacked = !matchMedia('(min-width: 768px)').matches;
		pinSide = sideOf(game, stacked);
		// Fractional size: clientWidth/Height round, and the box is a percentage of the real one.
		const { width, height } = panel.getBoundingClientRect();
		const rect = pinRect(
			pinSide,
			{ width, height },
			{ width: img.naturalWidth, height: img.naturalHeight }
		);
		place(img, rect);
		// The push-in scales from the crop's point of interest; set here, with the pin, so the fade
		// below can allow for how far it carries the far edge.
		const origin = pushOrigin(pinSide);
		img.style.transformOrigin = `${origin.x * 100}% ${origin.y * 100}%`;
		// The fade sits over the image's far edge and reaches to where the push-in leaves it; there
		// is none if the image reaches the panel's edge. At rest it is clipped to its far end.
		const depth = stacked ? FADE_DEPTH_STACKED : FADE_DEPTH_WIDE;
		const reach = pushReach(pinSide, rect);
		const band = fadeRect(pinSide, { width, height }, rect, depth, reach);
		fade.style.display = band ? '' : 'none';
		fade.style.setProperty('--depth', `${depth}px`);
		if (band) place(fade, band);
		fade.style.clipPath = fadeHidden(pinSide);
		pinned = true;
	}

	$effect(() => {
		const image = img;
		if (!image) return;
		let frame = 0;
		const onResize = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(pin);
		};
		if (image.complete) pin();
		else image.addEventListener('load', pin, { once: true });
		addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(frame);
			image.removeEventListener('load', pin);
			removeEventListener('resize', onResize);
		};
	});

	/* The sweep opens the half from wherever the hover transition left it; the fade opens from its
	   far end, so the image edge is covered before the sweep uncovers it; the push-in runs on
	   through the page reveal. All are cancelled if the pick is handed back, which is what returns
	   the half to rest after a failed navigation. */
	$effect(() => {
		if (!isPicked || !panel || !img || !fade) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const running = [
			panel.animate([{ clipPath: getComputedStyle(panel).clipPath }, { clipPath: FULL_POLYGON }], {
				duration: SWEEP_MS,
				easing: SWEEP_EASE,
				fill: 'forwards'
			}),
			img.animate([{ transform: 'scale(1)' }, { transform: `scale(${PUSH_IN})` }], {
				duration: SWEEP_MS + REVEAL_MS,
				easing: SWEEP_EASE,
				fill: 'forwards'
			}),
			fade.animate([{ clipPath: fadeHidden(pinSide) }, { clipPath: FADE_SHOWN }], {
				duration: FADE_MS,
				easing: FADE_EASE,
				fill: 'forwards'
			})
		];
		return () => running.forEach((a) => a.cancel());
	});
</script>

<!-- A real link: works without JS, is focusable, and hover preloads the game page. -->
<a
	bind:this={panel}
	{href}
	class={[
		'panel absolute inset-0 block outline-none',
		side === 'left' ? 'panel-left' : 'panel-right'
	]}
	data-hot={hot ? '' : undefined}
	data-dimmed={dimmed ? '' : undefined}
	data-picked={isPicked ? '' : undefined}
	data-pinned={pinned ? '' : undefined}
	aria-label="{GAME_NAME[game]} tools, {count} listed"
	onpointerenter={() => onhover(game)}
	onpointerleave={() => onhover(null)}
	onfocus={() => onhover(game)}
	onblur={() => onhover(null)}
	onclick={(event) => {
		// Modifier clicks and non-primary buttons stay with the browser, as SvelteKit's own link handling does.
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
			return;
		event.preventDefault();
		onpick(game, href);
	}}
>
	<picture class="art pointer-events-none absolute">
		<source type="image/webp" srcset={ART[game].webp} />
		<img
			bind:this={img}
			src={ART[game].jpg}
			alt=""
			class="size-full object-cover"
			style:object-position={side === 'left' ? '0% 50%' : '45% 50%'}
			loading="eager"
			fetchpriority="high"
			decoding="async"
		/>
	</picture>
	<div class="shade pointer-events-none absolute inset-0" aria-hidden="true"></div>
	<div bind:this={fade} class="fade pointer-events-none absolute" aria-hidden="true"></div>
	<div
		class="label absolute bottom-9 flex max-w-[440px] flex-col gap-1.5 md:bottom-16 md:gap-2 {side ===
		'left'
			? 'left-5 items-start text-left md:left-16'
			: 'right-5 items-end text-right md:right-16'}"
	>
		<span
			class="text-[24px] leading-[1.1] font-medium tracking-tight text-ink [text-shadow:0_1px_12px_rgb(0_0_0/0.45)] md:text-[30px]"
		>
			{GAME_NAME[game]}
		</span>
		<span
			class="mt-1.5 flex items-center gap-3 text-[12.5px] text-muted md:mt-2 md:gap-3.5 md:text-[13px] {side ===
			'left'
				? ''
				: 'flex-row-reverse'}"
		>
			<span
				class="grid size-[30px] place-items-center rounded-full border border-line-strong bg-canvas/35 text-muted ring transition-colors duration-200 md:size-9"
				aria-hidden="true"
			>
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					class="size-3.5"
				>
					<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</span>
			<span class="hidden md:inline">Select</span>
			<span class="hidden size-[3px] rounded-full bg-faint md:inline-block" aria-hidden="true"
			></span>
			<span class="text-faint tabular-nums">{count} tools</span>
		</span>
	</div>
</a>

<style>
	@reference '../../routes/layout.css';

	/* Mobile first: the halves stack, seam from 52% on the left edge to 48% on the right.
	   Every polygon keeps four points in the same order so clip-path can animate between them.
	   The background is the dark canvas literal, as the shade is: past the image the opened half
	   reads as canvas, not as the other half showing through. */
	.panel {
		background: #141619;
		transition: clip-path 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.panel-left {
		clip-path: polygon(0 0, 100% 0, 100% 48%, 0 52%);
	}
	.panel-right {
		clip-path: polygon(0 52%, 100% 48%, 100% 100%, 0 100%);
	}

	/* The hovered half sits above the other so its sweep covers rather than crosses it. A touch
	   pick never hovers, so the pick raises the half too. */
	.panel[data-hot],
	.panel[data-picked] {
		z-index: 1;
	}

	/* The image box covers only this half, so object-fit shows the intended crop. */
	.art {
		left: 0;
		width: 100%;
	}
	.panel-left .art {
		top: 0;
		height: 52%;
	}
	.panel-right .art {
		top: 48%;
		height: 52%;
	}

	/* Once JS has pinned the image (explicit px on the img), the box covers the whole half so
	   the picture continues at the same scale as the half opens. */
	.panel[data-pinned] .art {
		inset: 0;
		width: auto;
		height: auto;
	}
	.panel[data-pinned] img {
		position: absolute;
	}

	/* Where the image stops short of the far edge it must end in canvas rather than a hard line.
	   pin() lays this band over that edge, clipped to nothing at its far end. The sweep uncovers
	   the image edge within its first frames, sooner the smaller the screen, so the fade cannot
	   arrive by opacity: at the pick the clip opens from the far end, covering the edge at once,
	   and the depth the hover showed darkens last and gently. clip-path stays on the compositor,
	   where a mask would re-rasterise every frame. The band reaches past the image because the
	   push-in grows the image towards the far edge under a fade that does not move with it; the
	   gradient is solid from --depth on so that overreach is plain canvas. The canvas literal, as
	   .panel's background is. */
	.fade {
		will-change: clip-path;
	}
	.panel-left .fade {
		background: linear-gradient(to bottom, transparent, #141619 var(--depth));
	}
	.panel-right .fade {
		background: linear-gradient(to top, transparent, #141619 var(--depth));
	}

	/* Dark in both themes: the values are the dark canvas token, not a theme variable. */
	.shade {
		background: linear-gradient(
			to top,
			rgb(20 22 25 / 0.94) 0%,
			rgb(20 22 25 / 0.5) 34%,
			rgb(20 22 25 / 0.14) 64%,
			rgb(20 22 25 / 0.55) 100%
		);
	}
	/* The shade box covers only this half, matching .art's geometry, so each half darkens
	   towards its own bottom edge instead of the gradient spanning the full stacked anchor. */
	.panel-left .shade {
		top: 0;
		height: 52%;
	}
	.panel-right .shade {
		top: 48%;
		height: 52%;
	}

	/* The label grows from its outer corner on hover, so the chosen half reads as chosen. */
	.label {
		transform-origin: bottom left;
		transition:
			opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
			transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.panel-right .label {
		transform-origin: bottom right;
	}
	/* The left half's label sits at the bottom of the full-height anchor by default, which is
	   outside .panel-left's clip polygon on the stacked mobile layout. Pull it up to just above
	   the seam, inside the top half. */
	.panel-left .label {
		bottom: calc(48% + 1.5rem);
	}

	/* The push-in's origin is pin()'s to set, where the fade can read it; will-change keeps the
	   image on its own layer so the scale never repaints it. */
	img {
		will-change: transform;
		transition: filter 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@media (hover: hover) {
		.panel[data-hot] img {
			filter: brightness(1.06);
		}
		.panel[data-dimmed] img {
			filter: brightness(0.55) saturate(0.7);
		}
		.panel[data-dimmed] .label {
			opacity: 0.4;
		}
	}

	/* Hover on pointer devices, focus everywhere: the arrow lights up and the label grows. */
	.panel[data-hot] .ring,
	.panel:focus-visible .ring {
		background-color: var(--ink);
		border-color: var(--ink);
		color: var(--canvas);
	}
	.panel[data-hot] .label,
	.panel:focus-visible .label {
		transform: scale(1.12);
	}

	/* The panel itself carries outline-none so the arrow fill can be the hover signal too, but
	   that leaves keyboard focus with no indicator at all. Put a visible outline back on the label. */
	.panel:focus-visible .label {
		outline: 2px solid var(--accent);
		outline-offset: 8px;
		border-radius: 2px;
	}

	@variant md {
		.panel-left {
			clip-path: polygon(0 0, var(--seam-top) 0, var(--seam-bottom) 100%, 0 100%);
		}
		.panel-right {
			clip-path: polygon(var(--seam-top) 0, 100% 0, 100% 100%, var(--seam-bottom) 100%);
		}
		.panel-left .art,
		.panel-right .art {
			top: 0;
			height: 100%;
		}
		.panel-left .shade,
		.panel-right .shade {
			top: 0;
			height: 100%;
		}
		.panel-left .label {
			bottom: 4rem;
		}
		.panel-left .art {
			left: 0;
			width: 62%;
		}
		.panel-right .art {
			left: 38%;
			width: 62%;
		}
		/* Side by side, the far edge is the inner one: the fade runs towards the seam. */
		.panel-left .fade {
			background: linear-gradient(to right, transparent, #141619 var(--depth));
		}
		.panel-right .fade {
			background: linear-gradient(to left, transparent, #141619 var(--depth));
		}
	}
</style>
