import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { createEditorApi } from './handlers';

const PREFIX = '/__editor';

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolveBody, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

/**
 * The JSON API behind the catalog editor at /edit. Dev server only (`apply: 'serve'`), so it
 * never exists in the static build. Registered directly in `configureServer`, which puts it
 * ahead of Vite's own middlewares and SvelteKit's catch-all.
 */
export function editorApi(toolsDirectory = resolve(process.cwd(), 'tools')): Plugin {
	return {
		name: 'exile-party-editor-api',
		apply: 'serve',
		configureServer(server) {
			const api = createEditorApi(toolsDirectory);
			server.middlewares.use(PREFIX, async (req: IncomingMessage, res: ServerResponse) => {
				const send = (status: number, body?: unknown) => {
					res.statusCode = status;
					if (body === undefined) {
						res.end();
						return;
					}
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(body));
				};
				const method = req.method ?? 'GET';
				const path = (req.url ?? '/').split('?')[0];
				let body: unknown;
				if (method !== 'GET' && method !== 'DELETE') {
					try {
						const text = await readBody(req);
						body = text ? JSON.parse(text) : undefined;
					} catch {
						send(400, { error: 'Malformed JSON body' });
						return;
					}
				}
				const response = api.handle({ method, path, body });
				send(response.status, response.body);
			});
		}
	};
}
