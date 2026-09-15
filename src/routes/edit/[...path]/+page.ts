import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';

/**
 * The catalog editor. Client rendered against the dev server's /__editor API, so nothing is
 * prerendered: no entries, and vite.config.ts tells the prerenderer this route is expected to
 * go unseen. The client router still ships the route, and the 404.html fallback would boot it
 * with no API behind it, so outside `vite dev` it is a 404.
 */
export const ssr = false;
export const prerender = true;
export const entries: EntryGenerator = () => [];

export const load: PageLoad = () => {
	if (!dev) error(404, 'Not Found');
};
