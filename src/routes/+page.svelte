<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Game } from '$lib/catalog/schema';
	import {
		OVERLAP_MS,
		REVEAL_EASE,
		REVEAL_MS,
		SWEEP_EASE,
		SWEEP_MS,
		chooserPolygon,
		edgePolygon,
		seamExitPolygon,
		sideOf,
		type Side
	} from '$lib/chooser';
	import GamePanel from '$lib/components/GamePanel.svelte';
	import Mark from '$lib/components/Mark.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import { gameStore, rememberGame } from '$lib/game';
	import type { TransitionConfig } from 'svelte/transition';

	let { data } = $props();

	/* Seam geometry, desktop: from 54% at the top to 46% at the bottom, shifting 8% away from
	   the hovered half. Mobile geometry lives in GamePanel's stylesheet. */
	const SEAM_TOP = 54;
	const SEAM_BOTTOM = 46;
	const SHIFT = 8;

	let hovered = $state<Game | null>(null);
	let picked = $state<Game | null>(null);
	/* Fixed at the pick: which edge the page comes in from, and when the click landed. */
	let side: Side = 'left';
	let pickedAt = 0;

	let seam = $state<HTMLDivElement | null>(null);
	let edge = $state<HTMLDivElement | null>(null);
	/* The seam's sweep, kept so a failed navigation can cancel it. */
	let running: Animation[] = [];

	const shift = $derived(hovered === 'poe2' ? -SHIFT : hovered === 'poe1' ? SHIFT : 0);
	const seamTop = $derived(SEAM_TOP + shift);
	const seamBottom = $derived(SEAM_BOTTOM + shift);

	/* Touch fires pointerenter on tap; only real pointers get the hover move. */
	const canHover = browser && matchMedia('(hover: hover)').matches;
	const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

	function hover(game: Game | null) {
		if (canHover && picked === null) hovered = game;
	}

	async function pick(game: Game, href: string) {
		if (picked !== null) return;
		picked = game;
		pickedAt = performance.now();
		side = sideOf(game, !matchMedia('(min-width: 768px)').matches);
		rememberGame(game, gameStore());
		/* The hairline leaves with the picked half, from wherever the hover shift has it. The
		   half's own sweep is GamePanel's. */
		if (seam && !still()) {
			running = [
				seam.animate(
					[{ clipPath: getComputedStyle(seam).clipPath }, { clipPath: seamExitPolygon(side) }],
					{ duration: SWEEP_MS, easing: SWEEP_EASE, fill: 'forwards' }
				)
			];
		}
		try {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- href comes from GamePanel's resolve() call; the rule cannot see through the onpick prop boundary
			await goto(href, { replaceState: true });
		} catch {
			// A failed navigation hands the chooser back rather than leaving it half picked.
			for (const animation of running) animation.cancel();
			running = [];
			picked = null;
		}
	}

	/* Plays as SvelteKit removes the page: the root is pinned over the new page and clipped to
	   what the reveal has not yet uncovered, so the page shows through an edge at the seam's
	   angle. The edge waits for the sweep to be nearly done, or for a slow navigation. */
	function exit(node: HTMLElement): TransitionConfig {
		if (picked === null || still()) return { duration: 0 };
		const delay = Math.max(0, SWEEP_MS - OVERLAP_MS - (performance.now() - pickedAt));
		const timing: KeyframeAnimationOptions = {
			delay,
			duration: REVEAL_MS,
			easing: REVEAL_EASE,
			fill: 'both'
		};
		node.animate(
			[{ clipPath: chooserPolygon(side, 0) }, { clipPath: chooserPolygon(side, 1) }],
			timing
		);
		edge?.animate([{ clipPath: edgePolygon(side, 0) }, { clipPath: edgePolygon(side, 1) }], timing);
		return { duration: delay + REVEAL_MS };
	}
</script>

<!-- No brand suffix: at 58 characters this already fills a search result, and og:site_name
     carries the brand into social cards. -->
<Meta
	title="Curated directory of Path of Exile 1 & 2 third-party tools"
	description="A curated directory of {data.total} third-party tools for Path of Exile 1 and 2. Pick your game, then browse by category, platform, price, and whether the source is open."
	image="home.png"
	path="/"
/>

<div
	class="chooser relative flex min-h-dvh flex-col overflow-hidden bg-canvas text-ink"
	data-force-theme="dark"
	data-picked={picked ?? undefined}
	style:--seam-top="{seamTop}%"
	style:--seam-bottom="{seamBottom}%"
	out:exit|global
>
	<!-- On desktop the band floats over the art; only its link takes pointer events. -->
	<div class="band pointer-events-none relative z-10 md:absolute md:inset-x-0 md:top-0">
		<header class="flex h-14 items-center justify-between px-5 md:px-8">
			<span class="flex items-center gap-2 text-[15px] font-medium tracking-tight text-ink">
				<Mark />
				<span>exile<span class="text-faint">.</span>party</span>
			</span>
			<a
				href={resolve('/tools')}
				class="pointer-events-auto hidden items-center gap-1.5 text-[13px] text-muted transition-colors duration-100 hover:text-ink md:flex"
			>
				Browse all tools
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					aria-hidden="true"
					class="size-3.5"
				>
					<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>
		</header>
		<div
			class="flex flex-col items-center gap-2.5 px-5 pt-5 pb-8 text-center md:gap-3.5 md:pt-[112px] md:pb-0"
		>
			<h1
				class="text-[34px] leading-[1.08] font-medium tracking-tight text-ink [text-shadow:0_2px_28px_rgb(0_0_0/0.55)] md:text-[58px] md:leading-[1.05]"
			>
				Welcome to the Party, Exile
			</h1>
			<p class="text-[15px] leading-normal text-muted md:text-[17px]">
				Explore tools for Path of Exile
			</p>
			<p
				class="mt-2 flex items-center gap-3 text-[10.5px] tracking-[0.09em] text-faint uppercase md:mt-4 md:gap-3.5 md:text-[11px]"
			>
				<span class="h-px w-7 bg-line-strong md:w-10" aria-hidden="true"></span>
				Choose your game
				<span class="h-px w-7 bg-line-strong md:w-10" aria-hidden="true"></span>
			</p>
		</div>
	</div>

	<div class="relative min-h-[560px] flex-1 md:absolute md:inset-0 md:min-h-0">
		<GamePanel
			game="poe1"
			count={data.counts.poe1}
			{hovered}
			{picked}
			onhover={hover}
			onpick={pick}
		/>
		<GamePanel
			game="poe2"
			count={data.counts.poe2}
			{hovered}
			{picked}
			onhover={hover}
			onpick={pick}
		/>

		<!-- Above a raised half, so the hairline and the glow stay on top of the art. -->
		<div
			bind:this={seam}
			class="seam pointer-events-none absolute inset-0 z-2"
			aria-hidden="true"
		></div>

		<div
			class="glow pointer-events-none absolute left-1/2 z-2 hidden md:block"
			aria-hidden="true"
		></div>
	</div>

	<p
		class="credit pointer-events-none absolute inset-x-0 bottom-2 z-10 text-center text-[11px] text-faint md:bottom-4"
	>
		Artwork by Grinding Gear Games. Not affiliated with GGG.
	</p>

	<!-- The reveal's own hairline: rides the advancing edge on the chooser's side, above everything. -->
	<div
		bind:this={edge}
		class="edge pointer-events-none absolute inset-0 z-20"
		aria-hidden="true"
	></div>
</div>

<style>
	@reference './layout.css';

	/* The root floats over the new page from the moment a half is picked; the reveal clips it
	   away once the navigation has landed. */
	.chooser[data-picked] {
		position: fixed;
		inset: 0;
		z-index: 50;
		pointer-events: none;
	}

	/* One-pixel hairline clipped out of a full-size box, so it slides with the panels. */
	.seam {
		background: var(--line-strong);
		clip-path: polygon(
			0 calc(52% - 0.5px),
			100% calc(48% - 0.5px),
			100% calc(48% + 0.5px),
			0 calc(52% + 0.5px)
		);
		transition: clip-path 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	@variant md {
		.seam {
			clip-path: polygon(
				calc(var(--seam-top) - 0.5px) 0,
				calc(var(--seam-top) + 0.5px) 0,
				calc(var(--seam-bottom) + 0.5px) 100%,
				calc(var(--seam-bottom) - 0.5px) 100%
			);
		}
	}

	/* Invisible until the reveal animates it into a band along the edge. */
	.edge {
		background: color-mix(in srgb, var(--ink) 50%, transparent);
		clip-path: polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%);
	}

	/* Darkens the art behind the headline block. */
	.glow {
		top: 130px;
		width: 980px;
		height: 460px;
		transform: translateX(-50%);
		background: radial-gradient(
			ellipse at center,
			rgb(20 22 25 / 0.78) 0%,
			rgb(20 22 25 / 0.42) 46%,
			rgb(20 22 25 / 0) 72%
		);
	}
</style>
