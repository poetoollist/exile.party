<script lang="ts">
	import { ART } from '$lib/art';
	import type { Game } from '$lib/catalog/schema';

	interface Props {
		game: Game;
	}

	let { game }: Props = $props();

	const art = $derived(ART[game]);

	const ART_H = 560; // rendered image height, in px
	const EYE_X = '72%'; // where the eye sits across the box: the empty run between the title and the count
	const EYE_Y = '50%';

	/** Spotlight horizontal radius: the distance from the eye to the image's nearest side edge,
	 *  so the picture's own edge is always under full canvas. */
	const rx = $derived(Math.min(art.eye.x, 1 - art.eye.x) * (art.width / art.height) * ART_H);
</script>

<div
	class="art-box pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
	aria-hidden="true"
	data-testid="listing-art"
	style:--ex={art.eye.x}
	style:--ey={art.eye.y}
	style:--rx="{rx}px"
	style:--eye-x={EYE_X}
	style:--eye-y={EYE_Y}
>
	<picture>
		<source type="image/webp" srcset={art.webp} />
		<img src={art.jpg} alt="" class="art" loading="eager" fetchpriority="low" decoding="async" />
	</picture>
</div>

<style>
	@reference '../../routes/layout.css';

	/* The picture element must not constrain the img's own box. */
	picture {
		display: contents;
	}

	/* Positioned at (EYE_X, EYE_Y) of the box, then pulled back by its own size so the eye point
	   itself, not the image's corner, lands there. translate percentages are the image's own
	   size, so the eye point lands on (EYE_X, EYE_Y) of the box whatever the box or image
	   measures. */
	.art {
		position: absolute;
		top: var(--eye-y);
		left: var(--eye-x);
		height: 560px; /* ART_H */
		width: auto;
		max-width: none;
		transform: translate(calc(var(--ex) * -100%), calc(var(--ey) * -100%));
		opacity: var(--art-opacity);
		mix-blend-mode: var(--art-blend);
	}

	/* The fade is painted in canvas colour rather than a mask, because a mask would isolate the
	   box and stop the blend mode reaching the canvas beneath. */
	.art-box::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				ellipse var(--rx) 130% at var(--eye-x) var(--eye-y),
				transparent 26%,
				var(--canvas) 100%
			),
			linear-gradient(to top, var(--canvas) 0, transparent 44%),
			linear-gradient(to bottom, var(--canvas) 0, transparent 16%);
	}
</style>
