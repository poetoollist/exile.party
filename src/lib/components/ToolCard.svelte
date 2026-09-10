<script lang="ts">
	import { resolve } from '$app/paths';
	import { iconUrl } from '$lib/catalog/assets';
	import { STATUS_LABEL, byLine, monogram } from '$lib/catalog/display';
	import type { Tool } from '$lib/catalog/schema';
	import { pickCard } from '$lib/opening-transition';

	interface Props {
		tool: Tool;
	}

	let { tool }: Props = $props();

	const by = $derived(byLine(tool));
	const icon = $derived(iconUrl(tool));
</script>

<!-- Four things: icon, name, by-line, one line. The tool page carries the rest. Two exceptions:
     a star for an editor's pick, and a status pill for a tool that has stopped, both of which a
     browser needs before clicking through. -->
<li
	data-games={tool.games.join(' ')}
	data-opening="card"
	data-tool={tool.id}
	class="group relative flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors duration-100 focus-within:border-line-strong hover:border-line-strong"
>
	<div class="flex items-center gap-3">
		{#if icon}
			<img
				src={icon}
				alt=""
				width="36"
				height="36"
				loading="lazy"
				decoding="async"
				data-opening="icon"
				class="size-9 shrink-0 rounded-md border border-line bg-canvas object-cover"
			/>
		{:else}
			<span
				aria-hidden="true"
				data-opening="icon"
				class="grid size-9 shrink-0 place-items-center rounded-md border border-line text-[15px] font-medium text-muted transition-colors duration-100 group-hover:border-line-strong group-hover:text-ink"
			>
				{monogram(tool.name)}
			</span>
		{/if}

		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<a
					href={resolve('/tools/[id]', { id: tool.id })}
					data-opening="name"
					onclick={(e) => pickCard(e.currentTarget.closest('[data-opening="card"]'))}
					class="truncate text-[14.5px] leading-tight font-medium tracking-tight text-ink after:absolute after:inset-0"
				>
					{tool.name}
				</a>
				{#if tool.editorsPick}
					<span class="inline-flex shrink-0 text-accent" title="Editor’s pick">
						<svg
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.4"
							stroke-linejoin="round"
							aria-hidden="true"
							class="size-3.5"
						>
							<path
								d="M8 2.5 9.4 6.4 13.2 6.6 10.3 9 11.2 12.8 8 10.7 4.8 12.8 5.7 9 2.8 6.6 6.6 6.4Z"
							/>
						</svg>
						<span class="sr-only">Editor’s pick</span>
					</span>
				{/if}
				{#if tool.status !== 'active'}
					<span
						class="shrink-0 rounded border px-1 py-px text-[10.5px] leading-4 {tool.status ===
						'dead'
							? 'border-line-strong text-ink'
							: 'border-line text-faint'}"
					>
						{STATUS_LABEL[tool.status]}
					</span>
				{/if}
			</div>
			{#if by}
				<p class="mt-0.5 flex items-center gap-1 text-[12.5px] leading-4 text-faint">
					<span class="truncate">By {by}</span>
					{#if tool.byMaintainer}
						<span class="inline-flex shrink-0 text-muted" title="Made by a maintainer of this site">
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.4"
								aria-hidden="true"
								class="size-3.5"
							>
								<circle cx="8" cy="8" r="6.25" />
								<path
									d="m5.25 8.25 1.75 1.75 3.75-4"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<span class="sr-only">Made by a maintainer of this site</span>
						</span>
					{/if}
				</p>
			{/if}
		</div>
	</div>

	<p class="line-clamp-2 text-[13.5px] leading-snug text-muted">{tool.description}</p>
</li>
