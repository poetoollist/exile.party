<script lang="ts">
	import {
		GAME_LABEL,
		LANGUAGE_LABEL,
		PLATFORM_LABEL,
		PRICING_LABEL,
		STATUS_LABEL,
		byLine,
		displayHost,
		repoLinks,
		siteLinks
	} from '$lib/catalog/display';
	import { isStale } from '$lib/catalog/filter';
	import type { Tool } from '$lib/catalog/schema';

	interface Props {
		tool: Tool;
		builtAt: string;
	}

	let { tool, builtAt }: Props = $props();

	const by = $derived(byLine(tool));
	const sites = $derived(siteLinks(tool));
	const repos = $derived(repoLinks(tool));
	const stale = $derived(isStale(tool.lastVerified, builtAt));
</script>

{#snippet row(label: string)}
	<dt class="text-[11px] tracking-[0.08em] text-faint uppercase">{label}</dt>
{/snippet}

{#snippet outbound(label: string, url: string)}
	<a
		href={url}
		rel="external noopener"
		class="inline-flex items-center gap-1 text-ink transition-colors duration-100 hover:text-accent"
	>
		{label}
		<svg
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
			aria-hidden="true"
			class="size-3 shrink-0 text-faint"
		>
			<path d="M6 3.5h6.5V10" stroke-linecap="round" stroke-linejoin="round" />
			<path d="M12.5 3.5 4 12" stroke-linecap="round" />
		</svg>
	</a>
{/snippet}

<!-- The same eight rows on every tool page, in this order, whatever the tool. -->
<dl
	class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-[13px] leading-snug sm:grid-cols-1 sm:gap-y-3.5"
>
	{@render row('By')}
	<dd class="flex flex-wrap items-center gap-1.5 text-ink">
		{#if by}
			{by}
			{#if tool.byMaintainer}
				<span
					class="inline-flex items-center gap-1 text-[11.5px] text-muted"
					title="Made by a maintainer of this site"
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
						aria-hidden="true"
						class="size-3.5"
					>
						<circle cx="8" cy="8" r="6.25" />
						<path d="m5.25 8.25 1.75 1.75 3.75-4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					maintainer
				</span>
			{/if}
		{:else}
			<span class="text-faint">Not listed</span>
		{/if}
	</dd>

	{@render row('Website')}
	<dd class="flex flex-wrap gap-x-3 gap-y-1">
		{#if sites.length === 1}
			{@render outbound(displayHost(sites[0].url), sites[0].url)}
		{:else}
			{#each sites as link (link.url)}
				{@render outbound(`${GAME_LABEL[link.game!]} · ${displayHost(link.url)}`, link.url)}
			{/each}
		{/if}
	</dd>

	{@render row('Games')}
	<dd class="text-ink">{tool.games.map((g) => GAME_LABEL[g]).join(', ')}</dd>

	{@render row('Platforms')}
	<dd class="text-ink">{tool.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}</dd>

	{@render row('Languages')}
	<dd class="text-ink">{tool.languages.map((language) => LANGUAGE_LABEL[language]).join(', ')}</dd>

	{@render row('Pricing')}
	<dd class="text-ink">{PRICING_LABEL[tool.pricing]}</dd>

	{@render row('Source')}
	<dd class="flex flex-wrap gap-x-3 gap-y-1">
		{#if repos.length === 0}
			<span class="text-ink">Closed source</span>
		{:else}
			{#each repos as link (link.url)}
				{@render outbound(
					link.game ? `${GAME_LABEL[link.game]} · ${displayHost(link.url)}` : displayHost(link.url),
					link.url
				)}
			{/each}
		{/if}
	</dd>

	{@render row('Status')}
	<dd class="text-ink">{STATUS_LABEL[tool.status]}</dd>

	{@render row('Last verified')}
	<dd class="flex items-center gap-2 text-ink">
		<time datetime={tool.lastVerified}>{tool.lastVerified}</time>
		{#if stale}
			<span
				class="rounded border border-dashed border-line px-1 py-px text-[10.5px] leading-4 text-faint"
				title="No one has re-checked this listing in six months"
			>
				Stale
			</span>
		{/if}
	</dd>
</dl>

<div class="mt-5 flex flex-col gap-2">
	<a
		href={tool.url}
		rel="external noopener"
		class="inline-flex h-9 items-center justify-center rounded-md bg-accent-fill px-3 text-[13px] font-medium text-accent-on-fill transition-opacity duration-100 hover:opacity-90"
	>
		Open tool
	</a>
	{#if repos.length > 0}
		<a
			href={repos[0].url}
			rel="external noopener"
			class="inline-flex h-9 items-center justify-center rounded-md border border-line px-3 text-[13px] text-muted transition-colors duration-100 hover:border-line-strong hover:text-ink"
		>
			View source
		</a>
	{/if}
</div>
