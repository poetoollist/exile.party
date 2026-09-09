<script lang="ts">
	import { GAME_LABEL } from '$lib/catalog/display';
	import type { Tool } from '$lib/catalog/schema';
	import { embedUrl, thumbnailUrl, watchUrl } from '$lib/catalog/video';

	interface Props {
		tool: Tool;
		/** Nothing precedes the section in its column, so it carries no top margin. */
		first?: boolean;
	}

	let { tool, first = false }: Props = $props();

	/** The one video showing its player; every other item keeps its thumbnail facade. */
	let playing = $state<string | null>(null);

	/** A plain left click swaps the facade for the player. A modified click is left to the browser,
	 *  and without JavaScript the link opens the watch page in a new tab. */
	function play(e: MouseEvent, id: string) {
		if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		playing = id;
	}
</script>

{#if tool.videos.length > 0}
	<section class={first ? '' : 'mt-10'}>
		<h2 class="text-[15px] font-medium tracking-tight text-ink">Tutorials</h2>
		<ul class="mt-4 grid gap-5 sm:grid-cols-2">
			{#each tool.videos as video (video.youtube)}
				<li>
					{#if playing === video.youtube}
						<iframe
							src={embedUrl(video.youtube)}
							title={video.title}
							class="aspect-video w-full rounded-lg border border-line bg-raised"
							allow="autoplay; encrypted-media; picture-in-picture"
							allowfullscreen
							referrerpolicy="strict-origin-when-cross-origin"
						></iframe>
					{:else}
						<a
							href={watchUrl(video.youtube)}
							target="_blank"
							rel="external noopener"
							aria-label="Play {video.title}"
							onclick={(e) => play(e, video.youtube)}
							class="group relative block"
						>
							<!-- hqdefault is 4:3 with letterbox bars; cropping to 16:9 removes them. -->
							<img
								src={thumbnailUrl(video.youtube)}
								alt=""
								loading="lazy"
								decoding="async"
								class="aspect-video w-full rounded-lg border border-line bg-raised object-cover"
							/>
							<span
								aria-hidden="true"
								class="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-ink transition-colors duration-100 group-hover:border-accent-line group-hover:bg-accent-tint group-hover:text-accent"
							>
								<svg
									viewBox="0 0 16 16"
									fill="currentColor"
									aria-hidden="true"
									class="ml-0.5 size-4"
								>
									<path d="M4 2.5v11l9-5.5z" />
								</svg>
							</span>
						</a>
					{/if}
					<p class="mt-2.5 text-[13.5px] leading-snug font-medium text-ink">{video.title}</p>
					<p class="mt-0.5 text-[12.5px] text-muted">by {video.channel}</p>
					{#if video.byCreator || video.game}
						<p class="mt-1.5 flex flex-wrap gap-1">
							{#if video.byCreator}
								<span
									class="rounded border border-accent-line bg-accent-tint px-1.5 py-px text-[10.5px] leading-4 text-accent"
								>
									By the creator
								</span>
							{/if}
							{#if video.game}
								<span
									class="rounded border border-line px-1.5 py-px text-[10.5px] leading-4 text-faint"
								>
									{GAME_LABEL[video.game]}
								</span>
							{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}
