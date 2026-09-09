<script lang="ts">
	import { resolve } from '$app/paths';
	import { iconUrl } from '$lib/catalog/assets';
	import { headline, monogram, overview } from '$lib/catalog/display';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import FactsTable from '$lib/components/FactsTable.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import RelatedTools from '$lib/components/RelatedTools.svelte';
	import Screenshots from '$lib/components/Screenshots.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	let { data } = $props();
	const { tool, category } = $derived(data);

	/** Back into the directory at this category: the game page when the tool lists one game. */
	const categoryHref = $derived(
		(tool.games.length === 1
			? resolve('/[game=game]', { game: tool.games[0] })
			: resolve('/tools')) + `#cat-${category.id}`
	);

	const icon = $derived(iconUrl(tool));

	/** Null when the headline already said the whole description; the section then has no prose. */
	const prose = $derived(overview(tool));
</script>

<Meta
	title="{tool.name} · exile.party"
	description={tool.description}
	image="tool-{tool.id}.png"
	path="/tools/{tool.id}"
/>

<TopBar compact />

<main class="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
	<Breadcrumb
		items={[
			{ label: 'Tools', href: resolve('/tools') },
			{ label: category.name, href: categoryHref },
			{ label: tool.name }
		]}
	/>

	<h1
		class="mt-5 max-w-[30ch] text-[26px] leading-[1.15] font-medium tracking-tight text-balance text-ink sm:text-[34px] lg:text-[38px]"
	>
		{headline(tool)}
	</h1>

	<hr class="mt-8 border-line" />

	<div class="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
		<aside class="lg:sticky lg:top-20 lg:order-2 lg:self-start">
			<div class="flex items-center gap-3">
				{#if icon}
					<img
						src={icon}
						alt=""
						width="40"
						height="40"
						class="size-10 rounded-md border border-line bg-canvas object-cover"
					/>
				{:else}
					<span
						aria-hidden="true"
						class="grid size-10 place-items-center rounded-md border border-line text-[16px] font-medium text-muted"
					>
						{monogram(tool.name)}
					</span>
				{/if}
				<div class="min-w-0">
					<p class="truncate text-[15px] leading-tight font-medium tracking-tight text-ink">
						{tool.name}
					</p>
					{#if tool.editorsPick || tool.official || tool.newPlayer}
						<p class="mt-1 flex flex-wrap gap-1">
							{#if tool.editorsPick}
								<span
									class="rounded border border-accent-line bg-accent-tint px-1.5 py-px text-[10.5px] leading-4 text-accent"
								>
									Editor&rsquo;s pick
								</span>
							{/if}
							{#if tool.newPlayer}
								<span
									class="rounded border border-accent-line bg-accent-tint px-1.5 py-px text-[10.5px] leading-4 text-accent"
								>
									For new players
								</span>
							{/if}
							{#if tool.official}
								<span
									class="rounded border border-accent-line bg-accent-tint px-1.5 py-px text-[10.5px] leading-4 text-accent"
								>
									Official
								</span>
							{/if}
						</p>
					{/if}
				</div>
			</div>
			<div class="mt-6">
				<FactsTable {tool} builtAt={data.builtAt} />
			</div>
		</aside>

		<div class="min-w-0 lg:order-1">
			<Screenshots {tool} />

			{#if prose || tool.notes || tool.tags.length > 0}
				<section class={tool.screenshots.length > 0 ? 'mt-10' : ''}>
					<h2 class="text-[15px] font-medium tracking-tight text-ink">Overview</h2>
					{#if prose}
						<p class="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-muted">{prose}</p>
					{/if}
					{#if tool.notes}
						<div class="mt-5 max-w-[65ch] rounded-lg border border-line bg-surface px-4 py-3">
							<p class="text-[11px] tracking-[0.08em] text-faint uppercase">Good to know</p>
							<p class="mt-1 text-[13.5px] leading-relaxed text-muted">{tool.notes}</p>
						</div>
					{/if}
					{#if tool.tags.length > 0}
						<ul class="mt-5 flex flex-wrap gap-1.5" aria-label="Tags">
							{#each tool.tags as tag (tag)}
								<li
									class="rounded border border-line px-1.5 py-px text-[11.5px] leading-5 text-faint"
								>
									{tag}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}
		</div>
	</div>

	<RelatedTools tools={data.related} />
</main>

<SiteFooter />
