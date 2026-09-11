import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { sections } from '../../catalog/home';
import { stripPrefix, zodIssues, type Issue } from '../../catalog/issues';
import { applyRanking, rankingIssues } from '../../catalog/ranking';
import { Catalog, CategoryFile, ToolMetadata, type Tool } from '../../catalog/schema';
import { categoriesYaml, toolYaml } from '../../catalog/yaml';
import type { EditorTool, ToolAssets } from '../../editor/types';
import { loadCatalog } from '../catalog';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ICON = /^icon\.(svg|png|webp)$/;

export interface EditorRequest {
	method: string;
	/** Below `/__editor`, e.g. `/tools/scalpel`. */
	path: string;
	body?: unknown;
}

export interface EditorResponse {
	status: number;
	body?: unknown;
}

const NewTool = z.object({ id: z.string(), metadata: z.unknown() });
const Ranking = z.object({ ranked: z.array(z.string()) });

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The editor's file operations over one tools directory. Every write validates the whole
 * catalog with the change applied before touching the disk, so an unknown category or a
 * duplicate id is refused the same way the build would refuse it.
 */
export function createEditorApi(toolsDirectory: string) {
	const toolDir = (id: string) => resolve(toolsDirectory, id);
	const aboutFile = (id: string) => resolve(toolDir(id), 'about.yaml');
	const categoriesFile = resolve(toolsDirectory, 'categories.yaml');
	const isTool = (id: string) => KEBAB.test(id) && existsSync(aboutFile(id));

	function assets(id: string): ToolAssets {
		const files = readdirSync(toolDir(id), { withFileTypes: true });
		const icon = files.find((f) => f.isFile() && ICON.test(f.name))?.name ?? null;
		const shotsDir = resolve(toolDir(id), 'shots');
		const shots = existsSync(shotsDir)
			? readdirSync(shotsDir, { withFileTypes: true })
					.filter((f) => f.isFile())
					.map((f) => f.name)
					.sort()
			: [];
		return { icon, shots };
	}

	const withAssets = (tool: Tool): EditorTool => ({ ...tool, assets: assets(tool.id) });

	/** Writes LF text, converted to CRLF when the file already uses it. */
	function writeText(file: string, text: string) {
		const crlf = existsSync(file) && readFileSync(file, 'utf8').includes('\r\n');
		writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
	}

	/** `metadata` as tool `id` inside the current catalog, replacing any tool with that id. */
	function checkTool(
		id: string,
		metadata: unknown,
		catalog: Catalog
	): { tool: Tool } | { issues: Issue[] } {
		const parsed = ToolMetadata.safeParse(metadata);
		if (!parsed.success) return { issues: zodIssues(parsed.error) };
		const tool: Tool = { id, ...parsed.data };
		const others = catalog.tools.filter((t) => t.id !== id);
		const result = Catalog.safeParse({ categories: catalog.categories, tools: [...others, tool] });
		if (result.success) return { tool };
		return { issues: stripPrefix(zodIssues(result.error), `tools.${others.length}.`) };
	}

	function getCatalog(): EditorResponse {
		const catalog = loadCatalog(toolsDirectory);
		return {
			status: 200,
			body: { categories: catalog.categories, tools: catalog.tools.map(withAssets) }
		};
	}

	function putTool(id: string, body: unknown): EditorResponse {
		if (!isTool(id)) return { status: 404, body: { error: `No tool ${id}` } };
		const checked = checkTool(id, body, loadCatalog(toolsDirectory));
		if ('issues' in checked) return { status: 400, body: { issues: checked.issues } };
		const yaml = toolYaml(checked.tool);
		writeText(aboutFile(id), yaml);
		return { status: 200, body: { tool: withAssets(checked.tool), yaml } };
	}

	function postTool(body: unknown): EditorResponse {
		const parsed = NewTool.safeParse(body);
		if (!parsed.success) return { status: 400, body: { issues: zodIssues(parsed.error) } };
		const { id, metadata } = parsed.data;
		if (!KEBAB.test(id)) {
			return { status: 400, body: { issues: [{ path: 'id', message: 'kebab-case id' }] } };
		}
		if (existsSync(toolDir(id))) {
			return { status: 409, body: { error: `tools/${id} already exists` } };
		}
		const checked = checkTool(id, metadata, loadCatalog(toolsDirectory));
		if ('issues' in checked) return { status: 400, body: { issues: checked.issues } };
		const yaml = toolYaml(checked.tool);
		mkdirSync(toolDir(id));
		writeText(aboutFile(id), yaml);
		return { status: 201, body: { tool: withAssets(checked.tool), yaml } };
	}

	function deleteTool(id: string): EditorResponse {
		if (!isTool(id)) return { status: 404, body: { error: `No tool ${id}` } };
		rmSync(toolDir(id), { recursive: true });
		return { status: 204 };
	}

	function putCategories(body: unknown): EditorResponse {
		const parsed = CategoryFile.safeParse(body);
		if (!parsed.success) return { status: 400, body: { issues: zodIssues(parsed.error) } };
		const catalog = loadCatalog(toolsDirectory);
		const result = Catalog.safeParse({ categories: parsed.data.categories, tools: catalog.tools });
		if (!result.success) return { status: 400, body: { issues: zodIssues(result.error) } };
		const existing = readFileSync(categoriesFile, 'utf8').replace(/\r\n/g, '\n');
		const yaml = categoriesYaml(parsed.data.categories, existing);
		writeText(categoriesFile, yaml);
		return { status: 200, body: { categories: parsed.data.categories, yaml } };
	}

	function putRanking(sectionId: string, body: unknown): EditorResponse {
		const catalog = loadCatalog(toolsDirectory);
		if (!KEBAB.test(sectionId) || !sections(catalog.categories).some((s) => s.id === sectionId)) {
			return { status: 404, body: { error: `No section ${sectionId}` } };
		}
		const parsed = Ranking.safeParse(body);
		if (!parsed.success) return { status: 400, body: { issues: zodIssues(parsed.error) } };
		const issues = rankingIssues(catalog.tools, sectionId, parsed.data.ranked);
		if (issues.length > 0) return { status: 400, body: { issues } };
		const changed: string[] = [];
		try {
			for (const tool of applyRanking(catalog.tools, sectionId, parsed.data.ranked)) {
				writeText(aboutFile(tool.id), toolYaml(tool));
				changed.push(tool.id);
			}
		} catch (error) {
			return { status: 500, body: { error: errorMessage(error), changed } };
		}
		return { status: 200, body: { changed } };
	}

	const notFound = (request: EditorRequest): EditorResponse => ({
		status: 404,
		body: { error: `No route ${request.method} ${request.path}` }
	});

	function route(request: EditorRequest): EditorResponse {
		const { method, body } = request;
		const [head, id, tail, ...rest] = request.path.split('/').filter(Boolean);
		if (rest.length > 0) return notFound(request);
		if (head === 'catalog' && !id && method === 'GET') return getCatalog();
		if (head === 'tools' && !id && method === 'POST') return postTool(body);
		if (head === 'tools' && id && !tail && method === 'PUT') return putTool(id, body);
		if (head === 'tools' && id && !tail && method === 'DELETE') return deleteTool(id);
		if (head === 'categories' && !id && method === 'PUT') return putCategories(body);
		if (head === 'sections' && id && tail === 'ranking' && method === 'PUT') {
			return putRanking(id, body);
		}
		return notFound(request);
	}

	/** Never throws: a loader or file error becomes a 500 carrying its message. */
	function handle(request: EditorRequest): EditorResponse {
		try {
			return route(request);
		} catch (error) {
			return { status: 500, body: { error: errorMessage(error) } };
		}
	}

	return { handle };
}

export type EditorApi = ReturnType<typeof createEditorApi>;
