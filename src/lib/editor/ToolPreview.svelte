<script lang="ts">
	import type { Issue } from '$lib/catalog/issues';
	import type { Tool } from '$lib/catalog/schema';
	import ToolCard from '$lib/components/ToolCard.svelte';

	interface Props {
		tool: Tool;
		yaml: string;
		issues: Issue[];
		/** Repo path of the file the YAML goes to. */
		file: string;
	}

	let { tool, yaml, issues, file }: Props = $props();
</script>

<div class="flex flex-col gap-5">
	<div>
		<h3 class="text-[12.5px] font-medium text-muted">Card</h3>
		<!-- ToolCard is an li; its link opens the real tool page, which only exists for saved tools. -->
		<ul class="mt-2 grid">
			<ToolCard {tool} />
		</ul>
	</div>
	<div>
		<h3 class="font-mono text-[12px] text-muted">{file}</h3>
		<pre
			class="mt-2 max-h-[60vh] overflow-auto rounded-md border border-line bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-muted">{yaml}</pre>
	</div>
	{#if issues.length > 0}
		<div>
			<h3 class="text-[12.5px] font-medium text-danger">
				{issues.length}
				{issues.length === 1 ? 'issue' : 'issues'}
			</h3>
			<ul class="mt-2 space-y-1 text-[12.5px] text-muted">
				{#each issues as issue, i (i)}
					<li>
						<code class="font-mono text-[12px] text-ink">{issue.path || 'tool'}</code>
						{issue.message}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
