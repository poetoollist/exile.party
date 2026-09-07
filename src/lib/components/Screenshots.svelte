<script lang="ts">
	import { screenshotUrl } from '$lib/catalog/display';
	import type { Tool } from '$lib/catalog/schema';

	interface Props {
		tool: Tool;
	}

	let { tool }: Props = $props();

	let strip = $state<HTMLUListElement | null>(null);

	/** One slide is the strip's own width, so a step is a whole screenshot. */
	function step(direction: -1 | 1) {
		strip?.scrollBy({ left: direction * strip.clientWidth, behavior: 'smooth' });
	}
</script>

{#if tool.screenshots.length > 0}
	<div class="relative">
		<ul
			bind:this={strip}
			class="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
		>
			{#each tool.screenshots as shot (shot.file)}
				<li class="w-full shrink-0 snap-start">
					<figure>
						<img
							src={screenshotUrl(tool, shot.file)}
							alt={shot.caption}
							loading="lazy"
							decoding="async"
							class="aspect-[16/10] w-full rounded-lg border border-line bg-raised object-cover"
						/>
						<figcaption class="mt-2 text-[12.5px] text-faint">{shot.caption}</figcaption>
					</figure>
				</li>
			{/each}
		</ul>
		{#if tool.screenshots.length > 1}
			<div class="absolute top-3 right-3 flex gap-1">
				<button
					type="button"
					onclick={() => step(-1)}
					aria-label="Previous screenshot"
					class="grid size-7 place-items-center rounded-md border border-line bg-surface text-muted transition-colors duration-100 hover:text-ink"
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
						aria-hidden="true"
						class="size-3.5"
					>
						<path d="M10 3 5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
				<button
					type="button"
					onclick={() => step(1)}
					aria-label="Next screenshot"
					class="grid size-7 place-items-center rounded-md border border-line bg-surface text-muted transition-colors duration-100 hover:text-ink"
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
						aria-hidden="true"
						class="size-3.5"
					>
						<path d="m6 3 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
{/if}
