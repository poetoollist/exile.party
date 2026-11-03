<script lang="ts">
	import { LANGUAGE_LABEL, PLATFORM_LABEL, PRICING_LABEL } from '$lib/catalog/display';
	import { CODES, activeFilterCount, toggle, type Code, type Filters } from '$lib/catalog/filter';
	import { Pricing, type Language, type Platform } from '$lib/catalog/schema';

	interface Props {
		filters: Filters;
		/** Platforms present in the pool, in schema order; the panel offers only these. */
		platforms: Platform[];
		/** Languages present in the pool, including the shared English baseline. */
		languages: Language[];
		shown: number;
		total: number;
		/** How many tools a value would match on its own within its set, with the other sets as they are. */
		countFor: (over: Partial<Filters>) => number;
	}

	let { filters = $bindable(), platforms, languages, shown, total, countFor }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);
	let button = $state<HTMLButtonElement | null>(null);
	let availableHeight = $state(0);

	const active = $derived(activeFilterCount(filters));

	const CODE_LABEL: Record<Code, string> = { open: 'Open source', closed: 'Closed source' };

	function show() {
		measureHeight();
		open = true;
		// The panel renders on the next tick; focus its first box once it exists.
		queueMicrotask(() => root?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus());
	}

	function measureHeight() {
		if (root)
			availableHeight = Math.max(0, window.innerHeight - root.getBoundingClientRect().bottom - 24);
	}

	function hide(refocus = true) {
		if (!open) return;
		open = false;
		if (refocus) button?.focus();
	}

	function reset() {
		filters = { ...filters, platforms: [], pricing: [], code: [], languages: [] };
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			hide();
		}
	}

	/** A press anywhere outside the button and panel closes it, without stealing the focus. */
	function onpointerdown(event: PointerEvent) {
		if (open && root && !root.contains(event.target as Node)) hide(false);
	}
</script>

<svelte:window {onkeydown} {onpointerdown} onresize={measureHeight} />

{#snippet box(
	label: string,
	checked: boolean,
	count: number,
	onchange: (() => void) | undefined,
	disabled = false
)}
	<label
		class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] {disabled
			? 'cursor-default text-muted'
			: 'cursor-pointer text-ink hover:bg-surface-hover'}"
	>
		<input
			type="checkbox"
			{checked}
			{onchange}
			{disabled}
			class="size-3.5 shrink-0 accent-accent-fill"
		/>
		<span class="flex-1">{label}</span>
		<span class="text-[11.5px] text-faint tabular-nums">{count}</span>
	</label>
{/snippet}

<div bind:this={root} class="relative">
	<button
		bind:this={button}
		type="button"
		aria-expanded={open}
		aria-controls="filters-panel"
		onclick={() => (open ? hide() : show())}
		class="inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[13px] transition-colors duration-100
			{open || active > 0
			? 'border-line-strong bg-surface text-ink'
			: 'border-line text-muted hover:border-line-strong hover:text-ink'}"
	>
		<svg
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
			aria-hidden="true"
			class="size-3.5"
		>
			<path d="M2 4.5h12M4.5 8h7M7 11.5h2" />
		</svg>
		Filters
		{#if active > 0}
			<span
				class="rounded bg-accent-tint px-1.5 text-[11px] leading-4 font-medium text-accent tabular-nums"
			>
				{active}
			</span>
		{/if}
	</button>

	{#if open}
		<div
			id="filters-panel"
			style:max-height="min(70dvh, {availableHeight}px)"
			class="absolute top-full right-0 z-30 mt-2 flex w-[min(320px,calc(100vw-2rem))] flex-col rounded-lg border border-line bg-surface p-2 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.45)]"
		>
			<div class="min-h-0 overflow-y-auto overscroll-contain">
				{#if platforms.length > 0}
					<fieldset class="mb-2">
						<legend class="px-2 pb-1 text-[11px] tracking-[0.08em] text-faint uppercase">
							Platform
						</legend>
						{#each platforms as platform (platform)}
							{@render box(
								PLATFORM_LABEL[platform],
								filters.platforms.includes(platform),
								countFor({ platforms: [platform] }),
								() => (filters.platforms = toggle(filters.platforms, platform))
							)}
						{/each}
					</fieldset>
				{/if}

				<fieldset class="mb-2">
					<legend class="px-2 pb-1 text-[11px] tracking-[0.08em] text-faint uppercase"
						>Pricing</legend
					>
					{#each Pricing.options as pricing (pricing)}
						{@render box(
							PRICING_LABEL[pricing],
							filters.pricing.includes(pricing),
							countFor({ pricing: [pricing] }),
							() => (filters.pricing = toggle(filters.pricing, pricing))
						)}
					{/each}
				</fieldset>

				<fieldset class="mb-2">
					<legend class="px-2 pb-1 text-[11px] tracking-[0.08em] text-faint uppercase"
						>Source</legend
					>
					{#each CODES as code (code)}
						{@render box(
							CODE_LABEL[code],
							filters.code.includes(code),
							countFor({ code: [code] }),
							() => (filters.code = toggle(filters.code, code))
						)}
					{/each}
				</fieldset>

				<fieldset>
					<legend class="px-2 pb-1 text-[11px] tracking-[0.08em] text-faint uppercase"
						>Language</legend
					>
					{@render box(LANGUAGE_LABEL.en, true, countFor({ languages: [] }), undefined, true)}
					{#each languages as language (language)}
						{#if language !== 'en'}
							{@render box(
								LANGUAGE_LABEL[language],
								filters.languages.includes(language),
								countFor({ languages: [language] }),
								() => (filters.languages = toggle(filters.languages, language))
							)}
						{/if}
					{/each}
				</fieldset>
			</div>

			<div
				class="mt-2 flex shrink-0 items-center justify-between border-t border-line px-2 pt-2.5 pb-1"
			>
				<p class="text-[12.5px] text-faint tabular-nums" aria-live="polite">
					{shown} of {total} tools
				</p>
				<button
					type="button"
					onclick={reset}
					disabled={active === 0}
					class="text-[12.5px] text-muted transition-colors duration-100 hover:text-ink disabled:text-faint/50"
				>
					Reset all
				</button>
			</div>
		</div>
	{/if}
</div>
