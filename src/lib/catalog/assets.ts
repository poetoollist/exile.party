import type { Tool } from './schema';

/**
 * Vite turns every collocated image into a production asset URL. Keeping this glob in client-safe
 * code lets the Node-only catalogue loader continue to run directly under Bun for validation.
 */
const assetUrls = import.meta.glob('../../../tools/**/*.{svg,png,webp,jpg}', {
	eager: true,
	import: 'default',
	query: '?url'
}) as Record<string, string>;

const icons = new Map<string, string>();
for (const [path, url] of Object.entries(assetUrls)) {
	const match = path.match(/^\.\.\/\.\.\/\.\.\/tools\/([^/]+)\/icon\.(?:svg|png|webp)$/);
	if (match) icons.set(match[1], url);
}

/** Convention-based tools/<id>/icon.{svg,png,webp}, or null for a monogram. */
export function iconUrl(tool: Tool): string | null {
	return icons.get(tool.id) ?? null;
}

/** A bundled URL for a screenshot named in the tool's about.yaml. */
export function screenshotUrl(tool: Tool, file: string): string {
	const path = `../../../tools/${tool.id}/shots/${file}`;
	const url = assetUrls[path];
	if (!url) throw new Error(`Missing tool asset: ${path}`);
	return url;
}
