import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
// Relative import on purpose: `bun run validate` runs this file outside Vite, where $lib does not resolve.
import { Catalog, CategoryFile, Tool, ToolMetadata } from '../catalog/schema';

/** cwd is the repo root for `bun run build`, vitest, and the validate script. */
export const TOOLS_DIRECTORY = resolve(process.cwd(), 'tools');
export const CATEGORIES_FILE = resolve(TOOLS_DIRECTORY, 'categories.yaml');

function parseYaml(text: string, source: string): unknown {
	try {
		return parse(text);
	} catch (error) {
		throw new Error(
			`${source} is not valid YAML:\n${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		);
	}
}

function validationError(source: string, error: z.ZodError): Error {
	return new Error(`${source} failed validation:\n${z.prettifyError(error)}`);
}

/** Parse shared category definitions. Split from file IO so tests can feed fixture strings. */
export function parseCategories(text: string, source = 'tools/categories.yaml') {
	const result = CategoryFile.safeParse(parseYaml(text, source));
	if (result.success) return result.data.categories;
	throw validationError(source, result.error);
}

/** Parse one tool metadata file and take its id from the containing directory. */
export function parseTool(text: string, id: string, source = `tools/${id}/about.yaml`): Tool {
	const metadata = ToolMetadata.safeParse(parseYaml(text, source));
	if (!metadata.success) throw validationError(source, metadata.error);

	const result = Tool.safeParse({ id, ...metadata.data });
	if (result.success) return result.data;
	throw validationError(source, result.error);
}

/** Build-time only. Imports from `*.server.ts` files and scripts. */
export function loadCatalog(directory = TOOLS_DIRECTORY): Catalog {
	const categoriesFile = resolve(directory, 'categories.yaml');
	const categories = parseCategories(readFileSync(categoriesFile, 'utf8'), categoriesFile);
	const tools = readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((entry) => {
			const about = resolve(directory, entry.name, 'about.yaml');
			if (!existsSync(about)) throw new Error(`${about} is missing`);
			return parseTool(readFileSync(about, 'utf8'), entry.name, about);
		});

	const result = Catalog.safeParse({ categories, tools });
	if (result.success) return result.data;
	throw validationError(directory, result.error);
}
