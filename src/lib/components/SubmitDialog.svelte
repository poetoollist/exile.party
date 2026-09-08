<script lang="ts">
	import { CATALOG_PATH, ISSUE_URL, NEW_TOOL_URL, REPO_URL } from '$lib/site';
	import { submitDialog } from '$lib/submit.svelte';

	interface Props {
		categoryIds: readonly string[];
	}

	let { categoryIds }: Props = $props();

	let el = $state<HTMLDialogElement | null>(null);
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const template = `name: Your Tool
description: One factual sentence, 10 to 300 characters.
url: https://example.com
games: [poe1, poe2]
category: overlays-and-companions
tags: [overlay, price-check]
platforms: [windows, linux]
pricing: free
openSource: true
source: https://github.com/you/your-tool
status: active
lastVerified: ${new Date().toISOString().slice(0, 10)}`;

	$effect(() => {
		if (!el) return;
		if (submitDialog.open && !el.open) el.showModal();
		else if (!submitDialog.open && el.open) el.close();
	});

	$effect(() => () => clearTimeout(copyTimer));

	async function copy() {
		try {
			await navigator.clipboard.writeText(template);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	/** <dialog> counts the backdrop as part of itself, so a click on it lands on the element. */
	function onclick(event: MouseEvent) {
		if (event.target === el) submitDialog.hide();
	}
</script>

<dialog
	bind:this={el}
	{onclick}
	onclose={() => submitDialog.hide()}
	aria-labelledby="submit-title"
	class="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/55"
>
	<div class="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
		<h2 id="submit-title" class="text-[15px] font-medium tracking-tight">Submit a tool</h2>
		<button
			type="button"
			onclick={() => submitDialog.hide()}
			aria-label="Close"
			class="-mt-0.5 -mr-1 rounded p-1 text-faint transition-colors duration-100 hover:text-ink"
		>
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
				aria-hidden="true"
				class="size-4"
			>
				<path d="m4 4 8 8M12 4l-8 8" stroke-linecap="round" />
			</svg>
		</button>
	</div>

	<div class="max-h-[70vh] overflow-y-auto px-5 py-4">
		<p class="text-[13.5px] leading-relaxed text-muted">
			The catalogue keeps each tool and its images in one directory. Add a tool by creating
			<code class="font-mono text-[12.5px] text-ink">{CATALOG_PATH}</code>.
		</p>

		<ol class="mt-4 space-y-3 text-[13.5px] leading-snug text-muted">
			<li class="flex gap-3">
				<span class="shrink-0 font-mono text-[12px] text-faint">1</span>
				<span>
					Fork <a
						href={REPO_URL}
						rel="external noopener"
						class="text-accent transition-colors duration-100">the repository</a
					>, or use the edit link below and GitHub will fork it for you.
				</span>
			</li>
			<li class="flex gap-3">
				<span class="shrink-0 font-mono text-[12px] text-faint">2</span>
				<span>
					Run
					<code class="font-mono text-[12.5px] text-ink">bun run new-tool</code>
					for an interactive scaffold, or create the directory and
					<code class="font-mono text-[12.5px]">about.yaml</code> manually:
				</span>
			</li>
		</ol>

		<pre
			class="mt-3 overflow-x-auto rounded-md border border-line bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-muted">{template}</pre>

		<p class="mt-2 text-[12px] leading-snug text-faint">
			<span class="text-muted">url</span> is the primary website or repository link.
			<span class="text-muted">category</span> must be one of: {categoryIds.join(', ')}.
			<span class="text-muted">platforms</span>: windows, linux, web, macos, android, ios.
			<span class="text-muted">pricing</span>: free, freemium, paid.
			<span class="text-muted">openSource</span> is required, and a
			<span class="text-muted">source</span> link is only valid when it is true.
			<span class="text-muted">alsoIn</span> lists extra categories;
			<span class="text-muted">rank</span> orders a tool within its sections.
		</p>

		<ol class="mt-4 space-y-3 text-[13.5px] leading-snug text-muted" start="3">
			<li class="flex gap-3">
				<span class="shrink-0 font-mono text-[12px] text-faint">3</span>
				<span>
					Run <code class="rounded bg-raised/60 px-1 font-mono text-[12.5px] text-ink"
						>bun run validate</code
					> to check the entry parses.
				</span>
			</li>
			<li class="flex gap-3">
				<span class="shrink-0 font-mono text-[12px] text-faint">4</span>
				<span>Open a pull request. Listings are checked before merge.</span>
			</li>
		</ol>
	</div>

	<div class="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3.5">
		<a
			href={NEW_TOOL_URL}
			rel="external noopener"
			class="inline-flex h-8 items-center rounded-md bg-accent-fill px-3 text-[12.5px] font-medium text-accent-on-fill transition-opacity duration-100 hover:opacity-90"
		>
			Create about.yaml on GitHub
		</a>
		<button
			type="button"
			onclick={copy}
			class="inline-flex h-8 items-center rounded-md border border-line px-3 text-[12.5px] text-muted transition-colors duration-100 hover:border-line-strong hover:text-ink"
		>
			{copied ? 'Copied' : 'Copy template'}
		</button>
		<a
			href={ISSUE_URL}
			rel="external noopener"
			class="ml-auto text-[12.5px] text-faint transition-colors duration-100 hover:text-ink"
		>
			Or open an issue
		</a>
	</div>
</dialog>
