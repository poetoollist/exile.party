<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Category } from '$lib/catalog/schema';

	interface Props {
		/** Start here plus the catalog categories, for the Sections menu. */
		sections: Category[];
		/** Files the API has written this session, shown so the maintainer knows what to review. */
		written: string[];
		children: Snippet;
	}

	let { sections, written, children }: Props = $props();

	let menuOpen = $state(false);

	const edit = (path: string) => resolve('/edit/[...path]', { path });
</script>

<header class="border-b border-line bg-surface">
	<div
		class="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[13px] sm:px-6"
	>
		<a href={edit('')} class="font-medium tracking-tight text-ink">Catalog editor</a>
		<nav class="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
			<a href={edit('')} class="hover:text-ink">Tools</a>
			<a href={edit('new')} class="hover:text-ink">New tool</a>
			<a href={edit('categories')} class="hover:text-ink">Categories</a>
			<details class="relative" bind:open={menuOpen}>
				<summary class="list-none hover:text-ink">Sections</summary>
				<ul
					class="absolute left-0 z-10 mt-2 min-w-56 rounded-md border border-line bg-surface py-1 shadow-sm"
				>
					{#each sections as section (section.id)}
						<li>
							<a
								href={edit(`sections/${section.id}`)}
								class="block px-3 py-1.5 hover:bg-surface-hover hover:text-ink"
								onclick={() => (menuOpen = false)}
							>
								{section.name}
							</a>
						</li>
					{/each}
				</ul>
			</details>
		</nav>
		<a href={resolve('/')} class="ml-auto text-faint hover:text-ink">Site</a>
	</div>
</header>

<main class="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6">
	{@render children()}
</main>

{#if written.length > 0}
	<aside class="border-t border-line bg-surface">
		<div class="mx-auto max-w-[1180px] px-4 py-3 text-[12.5px] text-muted sm:px-6">
			<span class="text-faint">Written this session:</span>
			{#each written as file (file)}
				<code class="ml-2 font-mono text-[12px] text-ink">{file}</code>
			{/each}
			<span class="ml-2 text-faint">Review with git diff, then commit.</span>
		</div>
	</aside>
{/if}
