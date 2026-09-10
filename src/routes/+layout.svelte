<script lang="ts">
	import './layout.css';
	import { afterNavigate, beforeNavigate, goto, onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import SubmitDialog from '$lib/components/SubmitDialog.svelte';
	import { gameStore, readGame } from '$lib/game';
	import { openingNavigate } from '$lib/opening-transition';

	let { children, data } = $props();

	/* A remembered game skips the chooser on client-side navigation too; the inline script in
	   app.html only sees full loads. `?choose` is the way back in, exactly as on a full load.
	   Popstate (Back/Forward) is left alone here so Back out of a game page can never be trapped:
	   the guard would otherwise cancel a Back to `/` and re-push the remembered game forward. */
	beforeNavigate((navigation) => {
		if (navigation.type === 'popstate') return;
		if (navigation.to?.route.id !== '/' || navigation.to.url.searchParams.has('choose')) return;
		const game = readGame(gameStore());
		if (game === null) return;
		navigation.cancel();
		goto(resolve('/[game=game]', { game }), { replaceState: true });
	});

	/* Smooth scrolling is for the category rail's in-page jumps. Kit's own scroll reset after a
	   navigation, and the restore on Back, must still jump, so it is switched off for their duration. */
	beforeNavigate(() => {
		document.documentElement.style.scrollBehavior = 'auto';
	});
	afterNavigate(() => {
		document.documentElement.style.removeProperty('scroll-behavior');
	});

	/* A directory card opens its tool page out of the card, and Back folds it in again. */
	onNavigate(openingNavigate);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Column so a short page still pushes the footer to the bottom of the viewport. -->
<div class="flex min-h-dvh flex-col">
	{@render children()}
</div>

<SubmitDialog categoryIds={data.categoryIds} />
