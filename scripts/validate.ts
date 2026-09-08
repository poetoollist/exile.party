import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalog, TOOLS_DIRECTORY } from '../src/lib/server/catalog';

const ICON = /^icon\.(svg|png|webp)$/;
const SCREENSHOT = /^[a-z0-9-]+\.(png|webp|jpg)$/;

try {
	const catalog = loadCatalog();
	const errors: string[] = [];
	let icons = 0;
	let screenshots = 0;

	for (const tool of catalog.tools) {
		const directory = resolve(TOOLS_DIRECTORY, tool.id);
		const iconFiles = readdirSync(directory, { withFileTypes: true })
			.filter((entry) => entry.isFile() && ICON.test(entry.name))
			.map((entry) => entry.name);
		if (iconFiles.length > 1) {
			errors.push(`${tool.id} has multiple icons: ${iconFiles.join(', ')}`);
		}
		icons += iconFiles.length;

		const shotsDirectory = resolve(directory, 'shots');
		const actual = existsSync(shotsDirectory)
			? readdirSync(shotsDirectory, { withFileTypes: true })
					.filter((entry) => entry.isFile())
					.map((entry) => entry.name)
			: [];
		const listed = new Set(tool.screenshots);

		for (const file of tool.screenshots) {
			if (!actual.includes(file)) errors.push(`${tool.id}/about.yaml lists missing shots/${file}`);
		}
		for (const file of actual) {
			if (!SCREENSHOT.test(file)) errors.push(`${tool.id}/shots/${file} is not a supported image`);
			else if (!listed.has(file))
				errors.push(`${tool.id}/shots/${file} is not listed in about.yaml`);
		}
		screenshots += actual.length;
	}

	if (errors.length > 0) throw new Error(`Tool asset validation failed:\n  ${errors.join('\n  ')}`);

	console.log(
		`tools/ OK: ${catalog.categories.length} categories, ${catalog.tools.length} tools, ${icons} icons and ${screenshots} screenshots present`
	);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
