import type { Issue } from '$lib/catalog/issues';
import type { Category } from '$lib/catalog/schema';
import type { ToolDraft } from './form';
import type { EditorCatalog, EditorTool } from './types';

export class EditorApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly issues: Issue[] = [],
		readonly data: unknown = undefined
	) {
		super(message);
		this.name = 'EditorApiError';
	}
}

export const errorText = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
	const response = await fetch(`/__editor/${path}`, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (response.status === 204) return undefined as T;
	const data = (await response.json().catch(() => ({}))) as { error?: string; issues?: Issue[] };
	if (!response.ok) {
		throw new EditorApiError(
			data.error ?? `${method} ${path} failed with ${response.status}`,
			response.status,
			data.issues ?? [],
			data
		);
	}
	return data as T;
}

export interface SavedTool {
	tool: EditorTool;
	yaml: string;
}

/** The dev server's /__editor API. Every call resolves to the response body or throws `EditorApiError`. */
export const api = {
	catalog: () => request<EditorCatalog>('GET', 'catalog'),
	saveTool: (id: string, draft: ToolDraft) => request<SavedTool>('PUT', `tools/${id}`, draft),
	createTool: (id: string, draft: ToolDraft) =>
		request<SavedTool>('POST', 'tools', { id, metadata: draft }),
	deleteTool: (id: string) => request<void>('DELETE', `tools/${id}`),
	saveCategories: (categories: Category[]) =>
		request<{ categories: Category[]; yaml: string }>('PUT', 'categories', { categories }),
	saveRanking: (sectionId: string, ranked: string[]) =>
		request<{ changed: string[] }>('PUT', `sections/${sectionId}/ranking`, { ranked })
};
