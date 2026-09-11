import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { editorApi } from './src/lib/server/editor/plugin';

/**
 * The catalog editor at /edit only exists under `vite dev` (see src/lib/server/editor/plugin.ts),
 * so the prerenderer never sees its route. Any other unseen route is still a failed build.
 */
const EDITOR_ROUTE = '/edit/[...path]';
function handleUnseenRoutes({ routes, message }: { routes: string[]; message: string }) {
	const others = routes.filter((route) => route !== EDITOR_ROUTE);
	if (others.length > 0)
		throw new Error(`Unseen routes besides the editor: ${others.join(', ')}\n${message}`);
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		editorApi(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
			prerender: { handleUnseenRoutes }
		})
	],
	server: {
		fs: {
			// Tool images live outside SvelteKit's default src-only dev-server allow list.
			allow: [resolve(process.cwd(), 'tools')]
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
