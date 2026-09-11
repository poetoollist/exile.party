<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		/** The control's id, so the label targets it. Leave off for a group of controls. */
		id?: string;
		hint?: string;
		issues?: string[];
		children: Snippet;
	}

	let { label, id, hint, issues = [], children }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	{#if id}
		<label for={id} class="text-[12.5px] font-medium text-muted">{label}</label>
	{:else}
		<span class="text-[12.5px] font-medium text-muted">{label}</span>
	{/if}
	{@render children()}
	{#if hint}
		<p class="text-[12px] leading-snug text-faint">{hint}</p>
	{/if}
	{#each issues as issue, i (i)}
		<p class="text-[12px] leading-snug text-danger">{issue}</p>
	{/each}
</div>
