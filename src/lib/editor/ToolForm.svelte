<script lang="ts">
	import { untrack } from 'svelte';
	import { GAME_LABEL, PLATFORM_LABEL, PRICING_LABEL, STATUS_LABEL } from '$lib/catalog/display';
	import { toolId } from '$lib/catalog/id';
	import { messagesAt, zodIssues, type Issue } from '$lib/catalog/issues';
	import {
		Game,
		Platform,
		Pricing,
		START_HERE_ID,
		Status,
		ToolMetadata,
		type Category,
		type Tool
	} from '$lib/catalog/schema';
	import { api, EditorApiError, errorText } from './api';
	import Field from './Field.svelte';
	import {
		draftYaml,
		normalizeDraft,
		sectionsOf,
		today,
		toggle,
		youtubeId,
		type ToolDraft
	} from './form';
	import { BUTTON, CHECK, INPUT, PRIMARY, SMALL, TEXTAREA } from './styles';
	import ToolPreview from './ToolPreview.svelte';
	import type { ToolAssets } from './types';

	interface Props {
		/** The tool being edited; leave off to create one. */
		id?: string;
		initial: ToolDraft;
		categories: Category[];
		assets: ToolAssets;
		/** Every tag already used in the catalog, offered while typing. */
		knownTags: string[];
		/** After a successful write: the tool id and the repo path written. */
		onsaved: (id: string, file: string) => void;
		ondeleted?: (id: string) => void;
		ondirty?: (dirty: boolean) => void;
	}

	let { id, initial, categories, assets, knownTags, onsaved, ondeleted, ondirty }: Props = $props();

	const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
	const MAX_VIDEOS = 4;

	let draft = $state<ToolDraft>(untrack(() => structuredClone($state.snapshot(initial))));
	/* What the last save (or the load) wrote, for the dirty check. */
	let baseline = $state(untrack(() => draftYaml(normalizeDraft(initial))));
	let customId = $state('');
	let idTouched = $state(false);
	let tagInput = $state('');
	let serverIssues = $state<Issue[]>([]);
	let serverError = $state<string | null>(null);
	let busy = $state(false);

	const creating = untrack(() => id === undefined);
	const effectiveId = $derived(id ?? (idTouched ? customId : toolId(draft.name)));
	const normalized = $derived(normalizeDraft(draft));
	const parsed = $derived(ToolMetadata.safeParse(normalized));
	const issues = $derived(parsed.success ? [] : zodIssues(parsed.error));
	/* Client and server issues both show under their fields; see topServerIssues for the banner. */
	const allIssues = $derived([...issues, ...serverIssues]);
	const yaml = $derived(draftYaml(normalized));
	const unsaved = $derived(yaml !== baseline);
	const dirty = $derived(creating || unsaved);
	const idIssues = $derived(
		creating && !KEBAB.test(effectiveId) ? ['kebab-case id, for example my-tool'] : []
	);
	const canSave = $derived(parsed.success && dirty && idIssues.length === 0 && !busy);
	const at = (path: string) => messagesAt(allIssues, path);
	/* Server issues with no field on this form: the whole-tool path, the id, or another tool's path. */
	const topServerIssues = $derived(
		serverIssues.filter((issue) => !(issue.path.split('.')[0] in draft))
	);
	const file = $derived(`tools/${effectiveId || '<id>'}/about.yaml`);
	const previewTool = $derived({ id: effectiveId || 'new-tool', ...normalized } as unknown as Tool);
	const rankSections = $derived(sectionsOf(normalized));
	const twoGames = $derived(draft.games.length > 1);
	/* Files on disk plus names listed but missing, so both mismatches are visible. */
	const shots = $derived([...new Set([...draft.screenshots, ...assets.shots])]);
	const alsoInOptions = $derived(categories.filter((c) => c.id !== draft.category));

	$effect(() => ondirty?.(unsaved));

	const sectionName = (sectionId: string) =>
		sectionId === START_HERE_ID
			? 'Start here'
			: (categories.find((c) => c.id === sectionId)?.name ?? sectionId);

	function setPerGame(key: 'urls' | 'sources', game: Game, value: string) {
		const map = { ...(draft[key] ?? {}) };
		if (value.trim()) map[game] = value.trim();
		else delete map[game];
		draft[key] = map;
	}

	function setRank(section: string, value: string) {
		const rank = { ...(draft.rank ?? {}) };
		const n = Number.parseInt(value, 10);
		if (Number.isInteger(n) && n > 0) rank[section] = n;
		else delete rank[section];
		draft.rank = rank;
	}

	function addTag(raw: string) {
		const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
		if (tag && !draft.tags.includes(tag)) draft.tags = [...draft.tags, tag];
		tagInput = '';
	}

	function onTagKey(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			addTag(tagInput);
		} else if (event.key === 'Backspace' && tagInput === '' && draft.tags.length > 0) {
			draft.tags = draft.tags.slice(0, -1);
		}
	}

	function moved<T>(list: readonly T[], from: number, to: number): T[] {
		if (to < 0 || to >= list.length) return [...list];
		const next = [...list];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		return next;
	}

	function setListed(shot: string, listed: boolean) {
		const rest = draft.screenshots.filter((f) => f !== shot);
		draft.screenshots = listed ? [...rest, shot] : rest;
	}

	function addVideo() {
		if (draft.videos.length >= MAX_VIDEOS) return;
		draft.videos = [
			...draft.videos,
			{ youtube: '', title: '', channel: '', byCreator: false, game: undefined }
		];
	}

	function setYoutube(index: number, value: string) {
		draft.videos[index].youtube = youtubeId(value) ?? value.trim();
	}

	async function save() {
		if (!canSave) return;
		busy = true;
		serverIssues = [];
		serverError = null;
		try {
			const saved = creating
				? await api.createTool(effectiveId, normalized)
				: await api.saveTool(effectiveId, normalized);
			baseline = saved.yaml;
			onsaved(saved.tool.id, `tools/${saved.tool.id}/about.yaml`);
		} catch (error) {
			if (error instanceof EditorApiError && error.issues.length > 0) serverIssues = error.issues;
			else serverError = errorText(error);
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!id) return;
		if (!confirm(`Delete tools/${id}? This removes the directory and its images.`)) return;
		busy = true;
		serverError = null;
		try {
			await api.deleteTool(id);
			ondeleted?.(id);
		} catch (error) {
			serverError = errorText(error);
		} finally {
			busy = false;
		}
	}
</script>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
	<form
		class="flex flex-col gap-6"
		onsubmit={(event) => {
			event.preventDefault();
			void save();
		}}
	>
		<div class="flex items-baseline justify-between gap-4">
			<h1 class="text-[15px] font-medium tracking-tight">
				{creating ? 'New tool' : draft.name || id}
			</h1>
			{#if !creating}
				<code class="font-mono text-[12px] text-faint">tools/{id}</code>
			{/if}
		</div>

		{#if serverError || topServerIssues.length > 0}
			<div class="rounded-md border border-line bg-surface p-3 text-[12.5px]">
				{#if serverError}
					<p class="text-danger">{serverError}</p>
				{/if}
				{#each topServerIssues as issue, i (i)}
					<p class="text-danger">
						<code class="font-mono text-[12px]">{issue.path || 'tool'}</code>
						{issue.message}
					</p>
				{/each}
			</div>
		{/if}

		<!-- Identity -->
		<section class="grid gap-4 sm:grid-cols-2">
			<Field label="Name" id="name" issues={at('name')}>
				<input id="name" class={INPUT} bind:value={draft.name} />
			</Field>
			{#if creating}
				<Field label="Directory id" id="id" hint="Permanent; it is the URL." issues={idIssues}>
					<input
						id="id"
						class="{INPUT} font-mono"
						value={effectiveId}
						oninput={(event) => {
							idTouched = true;
							customId = event.currentTarget.value;
						}}
					/>
				</Field>
			{/if}
			<Field
				label="Author"
				id="author"
				hint="As they call themselves. {draft.author?.length ?? 0}/60"
				issues={at('author')}
			>
				<input id="author" class={INPUT} bind:value={draft.author} />
			</Field>
			<Field
				label="Headline"
				id="headline"
				hint="One sentence for the tool page, 10 to 120 characters. {draft.headline?.length ??
					0}/120"
				issues={at('headline')}
			>
				<input id="headline" class={INPUT} bind:value={draft.headline} />
			</Field>
			<div class="sm:col-span-2">
				<Field
					label="Description"
					id="description"
					hint="10 to 300 characters, plain and factual. {draft.description.length}/300"
					issues={at('description')}
				>
					<textarea id="description" rows="3" class={TEXTAREA} bind:value={draft.description}
					></textarea>
				</Field>
			</div>
		</section>

		<!-- Games and links -->
		<section class="grid gap-4 sm:grid-cols-2">
			<Field label="Games" issues={at('games')}>
				<div class="flex gap-4 py-1.5 text-[13.5px]">
					{#each Game.options as game (game)}
						<label class="flex items-center gap-1.5">
							<input
								type="checkbox"
								class={CHECK}
								checked={draft.games.includes(game)}
								onchange={() => (draft.games = toggle(draft.games, game, Game.options))}
							/>
							{GAME_LABEL[game]}
						</label>
					{/each}
				</div>
			</Field>
			<Field label="Platforms" issues={at('platforms')}>
				<div class="flex flex-wrap gap-x-4 gap-y-1 py-1.5 text-[13.5px]">
					{#each Platform.options as platform (platform)}
						<label class="flex items-center gap-1.5">
							<input
								type="checkbox"
								class={CHECK}
								checked={draft.platforms.includes(platform)}
								onchange={() =>
									(draft.platforms = toggle(draft.platforms, platform, Platform.options))}
							/>
							{PLATFORM_LABEL[platform]}
						</label>
					{/each}
				</div>
			</Field>
			<Field
				label="Website"
				id="url"
				hint="The landing page; the repository when there is none."
				issues={at('url')}
			>
				<input id="url" type="url" class={INPUT} bind:value={draft.url} />
			</Field>
			{#if twoGames}
				<div class="grid gap-3">
					{#each draft.games as game (game)}
						<Field
							label="{GAME_LABEL[game]} website"
							id="url-{game}"
							hint="Only when this game has its own site or path."
							issues={at(`urls.${game}`)}
						>
							<input
								id="url-{game}"
								type="url"
								class={INPUT}
								value={draft.urls?.[game] ?? ''}
								oninput={(event) => setPerGame('urls', game, event.currentTarget.value)}
							/>
						</Field>
					{/each}
				</div>
			{/if}
			<Field label="Source" issues={at('openSource')}>
				<label class="flex items-center gap-1.5 py-1.5 text-[13.5px]">
					<input type="checkbox" class={CHECK} bind:checked={draft.openSource} />
					Open source
				</label>
			</Field>
			{#if draft.openSource}
				<Field
					label="Repository"
					id="source"
					hint="Only when different from the website."
					issues={at('source')}
				>
					<input id="source" type="url" class={INPUT} bind:value={draft.source} />
				</Field>
				{#if twoGames}
					<div class="grid gap-3 sm:col-span-2 sm:grid-cols-2">
						{#each draft.games as game (game)}
							<Field
								label="{GAME_LABEL[game]} repository"
								id="source-{game}"
								issues={at(`sources.${game}`)}
							>
								<input
									id="source-{game}"
									type="url"
									class={INPUT}
									value={draft.sources?.[game] ?? ''}
									oninput={(event) => setPerGame('sources', game, event.currentTarget.value)}
								/>
							</Field>
						{/each}
					</div>
				{/if}
			{/if}
		</section>

		<!-- Classification -->
		<section class="grid gap-4 sm:grid-cols-2">
			<Field label="Category" id="category" hint="By primary purpose." issues={at('category')}>
				<select id="category" class={INPUT} bind:value={draft.category}>
					<option value="">Choose</option>
					{#each categories as category (category.id)}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</Field>
			<Field label="Also in" hint="Secondary purposes only." issues={at('alsoIn')}>
				<div class="flex flex-wrap gap-x-4 gap-y-1 py-1.5 text-[13.5px]">
					{#each alsoInOptions as category (category.id)}
						<label class="flex items-center gap-1.5">
							<input
								type="checkbox"
								class={CHECK}
								checked={draft.alsoIn.includes(category.id)}
								onchange={() =>
									(draft.alsoIn = toggle(
										draft.alsoIn,
										category.id,
										categories.map((c) => c.id)
									))}
							/>
							{category.name}
						</label>
					{/each}
				</div>
			</Field>
			<div class="sm:col-span-2">
				<Field
					label="Tags"
					id="tag"
					hint="Enter or comma adds. Never repeat what another field says."
					issues={allIssues.filter((i) => i.path.startsWith('tags')).map((i) => i.message)}
				>
					<div
						class="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1"
					>
						{#each draft.tags as tag (tag)}
							<span
								class="inline-flex items-center gap-1 rounded border border-line bg-raised/60 px-1.5 font-mono text-[12px] text-ink"
							>
								{tag}
								<button
									type="button"
									class="text-faint hover:text-ink"
									aria-label="Remove tag {tag}"
									onclick={() => (draft.tags = draft.tags.filter((t) => t !== tag))}>×</button
								>
							</span>
						{/each}
						<input
							id="tag"
							list="known-tags"
							class="h-7 min-w-32 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint"
							placeholder={draft.tags.length === 0 ? 'overlay, price-check' : ''}
							bind:value={tagInput}
							onkeydown={onTagKey}
							onblur={() => addTag(tagInput)}
						/>
						<datalist id="known-tags">
							{#each knownTags as tag (tag)}
								<option value={tag}></option>
							{/each}
						</datalist>
					</div>
				</Field>
			</div>
			<Field label="Pricing" issues={at('pricing')}>
				<div class="flex gap-4 py-1.5 text-[13.5px]">
					{#each Pricing.options as pricing (pricing)}
						<label class="flex items-center gap-1.5">
							<input type="radio" class={CHECK} value={pricing} bind:group={draft.pricing} />
							{PRICING_LABEL[pricing]}
						</label>
					{/each}
				</div>
			</Field>
			<Field label="Status" issues={at('status')}>
				<div class="flex gap-4 py-1.5 text-[13.5px]">
					{#each Status.options as status (status)}
						<label class="flex items-center gap-1.5">
							<input type="radio" class={CHECK} value={status} bind:group={draft.status} />
							{STATUS_LABEL[status]}
						</label>
					{/each}
				</div>
			</Field>
			<Field
				label="Last verified"
				id="lastVerified"
				hint="The day you opened the site and checked it."
				issues={at('lastVerified')}
			>
				<div class="flex gap-2">
					<input id="lastVerified" type="date" class={INPUT} bind:value={draft.lastVerified} />
					<button type="button" class={BUTTON} onclick={() => (draft.lastVerified = today())}>
						Today
					</button>
				</div>
			</Field>
			<Field label="Flags">
				<div class="grid gap-1 py-1.5 text-[13.5px] sm:grid-cols-2">
					<label class="flex items-center gap-1.5">
						<input type="checkbox" class={CHECK} bind:checked={draft.editorsPick} />
						Editor's pick
					</label>
					<label class="flex items-center gap-1.5">
						<input type="checkbox" class={CHECK} bind:checked={draft.newPlayer} />
						Start here (new players)
					</label>
					<label class="flex items-center gap-1.5">
						<input type="checkbox" class={CHECK} bind:checked={draft.official} />
						Official GGG tool
					</label>
					<label class="flex items-center gap-1.5">
						<input type="checkbox" class={CHECK} bind:checked={draft.byMaintainer} />
						By a site maintainer
					</label>
				</div>
			</Field>
			{#if rankSections.length > 0}
				<div class="sm:col-span-2">
					<Field
						label="Rank"
						hint="Position inside a section; blank means unranked, A to Z after the ranked ones."
						issues={allIssues.filter((i) => i.path.startsWith('rank')).map((i) => i.message)}
					>
						<div class="flex flex-wrap gap-3">
							{#each rankSections as section (section)}
								<label class="flex items-center gap-2 text-[13px] text-muted">
									{sectionName(section)}
									<input
										type="number"
										min="1"
										class="{INPUT} w-20"
										value={draft.rank?.[section] ?? ''}
										oninput={(event) => setRank(section, event.currentTarget.value)}
									/>
								</label>
							{/each}
						</div>
					</Field>
				</div>
			{/if}
			<div class="sm:col-span-2">
				<Field
					label="Notes"
					id="notes"
					hint="One caveat worth knowing before clicking, up to 300 characters. {draft.notes
						?.length ?? 0}/300"
					issues={at('notes')}
				>
					<textarea id="notes" rows="2" class={TEXTAREA} bind:value={draft.notes}></textarea>
				</Field>
			</div>
		</section>

		<!-- Screenshots -->
		<section>
			<Field
				label="Screenshots"
				hint="Files in tools/{effectiveId ||
					'<id>'}/shots. Listed ones show on the tool page in this order; bun run validate fails on an unlisted file."
				issues={allIssues.filter((i) => i.path.startsWith('screenshots')).map((i) => i.message)}
			>
				{#if shots.length === 0}
					<p class="py-1.5 text-[13px] text-faint">No files in shots/.</p>
				{:else}
					<ul class="divide-y divide-line rounded-md border border-line bg-surface">
						{#each shots as shot (shot)}
							{@const index = draft.screenshots.indexOf(shot)}
							{@const onDisk = assets.shots.includes(shot)}
							<li class="flex items-center gap-3 px-3 py-1.5 text-[13px]">
								<label class="flex flex-1 items-center gap-2">
									<input
										type="checkbox"
										class={CHECK}
										checked={index !== -1}
										onchange={(event) => setListed(shot, event.currentTarget.checked)}
									/>
									<code class="font-mono text-[12.5px] text-ink">{shot}</code>
								</label>
								{#if !onDisk}
									<span class="text-[12px] text-danger">missing from shots/</span>
								{:else if index === -1}
									<span class="text-[12px] text-danger">not listed</span>
								{/if}
								{#if index !== -1}
									<button
										type="button"
										class={SMALL}
										disabled={index === 0}
										aria-label="Move {shot} up"
										onclick={() => (draft.screenshots = moved(draft.screenshots, index, index - 1))}
										>↑</button
									>
									<button
										type="button"
										class={SMALL}
										disabled={index === draft.screenshots.length - 1}
										aria-label="Move {shot} down"
										onclick={() => (draft.screenshots = moved(draft.screenshots, index, index + 1))}
										>↓</button
									>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Field>
		</section>

		<!-- Videos -->
		<section>
			<Field
				label="Videos"
				hint="Up to four tutorials about the tool. Paste a YouTube URL; only the id is kept."
				issues={allIssues.filter((i) => i.path === 'videos').map((i) => i.message)}
			>
				<div class="flex flex-col gap-3">
					{#each draft.videos as video, i (i)}
						<div class="grid gap-2 rounded-md border border-line bg-surface p-3 sm:grid-cols-2">
							<Field label="YouTube id" id="video-{i}-youtube" issues={at(`videos.${i}.youtube`)}>
								<input
									id="video-{i}-youtube"
									class="{INPUT} font-mono"
									value={video.youtube}
									onchange={(event) => setYoutube(i, event.currentTarget.value)}
								/>
							</Field>
							<Field label="Channel" id="video-{i}-channel" issues={at(`videos.${i}.channel`)}>
								<input id="video-{i}-channel" class={INPUT} bind:value={draft.videos[i].channel} />
							</Field>
							<div class="sm:col-span-2">
								<Field label="Title" id="video-{i}-title" issues={at(`videos.${i}.title`)}>
									<input id="video-{i}-title" class={INPUT} bind:value={draft.videos[i].title} />
								</Field>
							</div>
							<label class="flex items-center gap-1.5 text-[13.5px]">
								<input type="checkbox" class={CHECK} bind:checked={draft.videos[i].byCreator} />
								By the tool's creator
							</label>
							<div class="flex items-center justify-end gap-2">
								{#if twoGames}
									<select
										class="{INPUT} w-auto"
										aria-label="Game the video covers"
										value={video.game ?? ''}
										onchange={(event) =>
											(draft.videos[i].game = (event.currentTarget.value || undefined) as
												Game | undefined)}
									>
										<option value="">Both games</option>
										{#each draft.games as game (game)}
											<option value={game}>{GAME_LABEL[game]}</option>
										{/each}
									</select>
								{/if}
								<button
									type="button"
									class={SMALL}
									disabled={i === 0}
									aria-label="Move video up"
									onclick={() => (draft.videos = moved(draft.videos, i, i - 1))}>↑</button
								>
								<button
									type="button"
									class={SMALL}
									disabled={i === draft.videos.length - 1}
									aria-label="Move video down"
									onclick={() => (draft.videos = moved(draft.videos, i, i + 1))}>↓</button
								>
								<button
									type="button"
									class={SMALL}
									onclick={() => (draft.videos = draft.videos.filter((_, j) => j !== i))}
								>
									Remove
								</button>
							</div>
						</div>
					{/each}
					{#if draft.videos.length < MAX_VIDEOS}
						<div>
							<button type="button" class={BUTTON} onclick={addVideo}>Add video</button>
						</div>
					{/if}
				</div>
			</Field>
		</section>

		<div class="flex items-center gap-3 border-t border-line pt-4">
			<button type="submit" class={PRIMARY} disabled={!canSave}>
				{busy ? 'Saving' : creating ? 'Create' : 'Save'}
			</button>
			{#if !dirty && !creating}
				<span class="text-[12.5px] text-faint">No changes</span>
			{:else if !parsed.success}
				<span class="text-[12.5px] text-faint">Fix the issues to save</span>
			{/if}
			{#if !creating}
				<button type="button" class="{BUTTON} ml-auto" disabled={busy} onclick={remove}>
					Delete tool
				</button>
			{/if}
		</div>
	</form>

	<aside class="lg:sticky lg:top-6 lg:self-start">
		<ToolPreview tool={previewTool} {yaml} issues={[...issues, ...serverIssues]} {file} />
	</aside>
</div>
