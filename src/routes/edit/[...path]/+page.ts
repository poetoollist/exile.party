import type { EntryGenerator } from './$types';

/**
 * The catalog editor. Client rendered against the dev server's /__editor API, so nothing is
 * prerendered: no entries, and vite.config.ts tells the prerenderer this route is expected to
 * go unseen. `prerender` stays true so adapter-static's strict check passes.
 */
export const ssr = false;
export const prerender = true;
export const entries: EntryGenerator = () => [];
