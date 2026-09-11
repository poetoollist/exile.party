import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createEditorApi, type EditorApi } from './handlers';

const CATEGORIES = `# Shared category definitions.
categories:
  - id: trade
    name: Trade
  - id: crafting
    name: Crafting
    description: Crafting simulators.
`;

const ALPHA = `name: Alpha
description: Prices items fast.
url: https://alpha.example
games:
  - poe1
category: trade
platforms:
  - web
pricing: free
openSource: false
editorsPick: true
rank:
  trade: 1
status: active
lastVerified: 2026-09-10
screenshots:
  - a.webp
`;

const BETA = `name: Beta
description: Simulates crafting outcomes.
url: https://beta.example
games:
  - poe1
  - poe2
category: crafting
alsoIn:
  - trade
platforms:
  - windows
pricing: free
openSource: true
newPlayer: true
status: active
lastVerified: 2026-09-10
`;

const GAMMA = `name: Gamma
description: Bulk trade listings.
url: https://gamma.example
games:
  - poe2
category: trade
platforms:
  - web
pricing: freemium
openSource: false
status: unmaintained
lastVerified: 2026-01-01
`;

let root: string;
let api: EditorApi;

function write(path: string, text: string) {
	mkdirSync(join(root, path, '..'), { recursive: true });
	writeFileSync(join(root, path), text);
}
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const about = (id: string) => parse(read(`${id}/about.yaml`));

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'editor-'));
	write('categories.yaml', CATEGORIES);
	write('alpha/about.yaml', ALPHA);
	write('alpha/icon.png', '');
	write('alpha/shots/a.webp', '');
	write('beta/about.yaml', BETA);
	write('gamma/about.yaml', GAMMA);
	api = createEditorApi(root);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('GET /catalog', () => {
	it('lists tools with what is on disk beside them', () => {
		const response = api.handle({ method: 'GET', path: '/catalog' });
		expect(response.status).toBe(200);
		const body = response.body as {
			categories: unknown[];
			tools: { id: string; assets: unknown }[];
		};
		expect(body.categories).toHaveLength(2);
		expect(body.tools.map((t) => t.id)).toEqual(['alpha', 'beta', 'gamma']);
		expect(body.tools[0].assets).toEqual({ icon: 'icon.png', shots: ['a.webp'] });
		expect(body.tools[1].assets).toEqual({ icon: null, shots: [] });
	});
});

describe('PUT /tools/:id', () => {
	const alpha = () => parse(ALPHA);

	it('writes the file and returns the yaml', () => {
		const response = api.handle({
			method: 'PUT',
			path: '/tools/alpha',
			body: { ...alpha(), description: 'Prices items faster.' }
		});
		expect(response.status).toBe(200);
		expect(read('alpha/about.yaml')).toBe((response.body as { yaml: string }).yaml);
		expect(about('alpha').description).toBe('Prices items faster.');
	});

	it('reports field issues and leaves the file alone', () => {
		const response = api.handle({
			method: 'PUT',
			path: '/tools/alpha',
			body: { ...alpha(), description: 'short' }
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ issues: [{ path: 'description' }] });
		expect(read('alpha/about.yaml')).toBe(ALPHA);
	});

	it('reports catalog issues on the field, not on tools.N', () => {
		const response = api.handle({
			method: 'PUT',
			path: '/tools/alpha',
			body: { ...alpha(), category: 'nope', rank: undefined }
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({
			issues: [{ path: 'category', message: 'unknown category nope' }]
		});
	});

	it('is 404 for an unknown or unsafe id', () => {
		expect(api.handle({ method: 'PUT', path: '/tools/zeta', body: alpha() }).status).toBe(404);
		expect(api.handle({ method: 'PUT', path: '/tools/..', body: alpha() }).status).toBe(404);
	});

	it('keeps CRLF when the file uses it', () => {
		write('gamma/about.yaml', GAMMA.replace(/\n/g, '\r\n'));
		const response = api.handle({
			method: 'PUT',
			path: '/tools/gamma',
			body: { ...parse(GAMMA), status: 'active' }
		});
		expect(response.status).toBe(200);
		expect(read('gamma/about.yaml')).toContain('status: active\r\n');
	});
});

describe('POST /tools', () => {
	const metadata = { ...parse(GAMMA), name: 'Delta' };

	it('creates the directory and file', () => {
		const response = api.handle({
			method: 'POST',
			path: '/tools',
			body: { id: 'delta', metadata }
		});
		expect(response.status).toBe(201);
		expect(about('delta').name).toBe('Delta');
		expect(existsSync(join(root, 'delta/shots'))).toBe(false);
	});

	it('refuses an existing directory', () => {
		const response = api.handle({
			method: 'POST',
			path: '/tools',
			body: { id: 'alpha', metadata }
		});
		expect(response.status).toBe(409);
	});

	it('refuses a bad id at the id field without touching the disk', () => {
		const response = api.handle({
			method: 'POST',
			path: '/tools',
			body: { id: 'Bad Id', metadata }
		});
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({ issues: [{ path: 'id' }] });
		expect(existsSync(join(root, 'Bad Id'))).toBe(false);
	});
});

describe('DELETE /tools/:id', () => {
	it('removes the directory once', () => {
		expect(api.handle({ method: 'DELETE', path: '/tools/alpha' }).status).toBe(204);
		expect(existsSync(join(root, 'alpha'))).toBe(false);
		expect(api.handle({ method: 'DELETE', path: '/tools/alpha' }).status).toBe(404);
	});
});

describe('PUT /categories', () => {
	it('reorders and keeps the header comment', () => {
		const categories = [
			{ id: 'crafting', name: 'Crafting', description: 'Crafting simulators.' },
			{ id: 'trade', name: 'Trading' }
		];
		const response = api.handle({ method: 'PUT', path: '/categories', body: { categories } });
		expect(response.status).toBe(200);
		expect(read('categories.yaml')).toBe(
			'# Shared category definitions.\ncategories:\n  - id: crafting\n    name: Crafting\n    description: Crafting simulators.\n  - id: trade\n    name: Trading\n'
		);
	});

	it('refuses to drop a category a tool still uses', () => {
		const response = api.handle({
			method: 'PUT',
			path: '/categories',
			body: { categories: [{ id: 'trade', name: 'Trade' }] }
		});
		expect(response.status).toBe(400);
		expect(JSON.stringify(response.body)).toContain('unknown category crafting');
		expect(read('categories.yaml')).toBe(CATEGORIES);
	});
});

describe('PUT /sections/:id/ranking', () => {
	it('rewrites rank in every affected file', () => {
		const response = api.handle({
			method: 'PUT',
			path: '/sections/trade/ranking',
			body: { ranked: ['gamma', 'alpha'] }
		});
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ changed: ['alpha', 'gamma'] });
		expect(about('alpha').rank).toEqual({ trade: 2 });
		expect(about('gamma').rank).toEqual({ trade: 1 });
		expect(read('beta/about.yaml')).toBe(BETA);
	});

	it('drops an emptied rank map', () => {
		api.handle({ method: 'PUT', path: '/sections/trade/ranking', body: { ranked: ['beta'] } });
		expect(about('alpha').rank).toBeUndefined();
		expect(about('beta').rank).toEqual({ trade: 1 });
	});

	it('ranks the virtual start-here section', () => {
		const response = api.handle({
			method: 'PUT',
			path: '/sections/start-here/ranking',
			body: { ranked: ['beta'] }
		});
		expect(response.status).toBe(200);
		expect(about('beta').rank).toEqual({ 'start-here': 1 });
	});

	it('refuses ids outside the section and unknown sections', () => {
		expect(
			api.handle({
				method: 'PUT',
				path: '/sections/trade/ranking',
				body: { ranked: ['beta', 'nope'] }
			})
		).toMatchObject({ status: 400, body: { issues: [{ path: 'ranked.1' }] } });
		expect(
			api.handle({ method: 'PUT', path: '/sections/none/ranking', body: { ranked: [] } }).status
		).toBe(404);
		expect(read('alpha/about.yaml')).toBe(ALPHA);
	});
});

describe('routing', () => {
	it('is 404 elsewhere and 500 for a broken catalog', () => {
		expect(api.handle({ method: 'GET', path: '/nope' }).status).toBe(404);
		expect(api.handle({ method: 'GET', path: '/tools/alpha/extra' }).status).toBe(404);
		write('gamma/about.yaml', 'name: Gamma\nunknown: 1\n');
		const broken = api.handle({ method: 'GET', path: '/catalog' });
		expect(broken.status).toBe(500);
		expect(JSON.stringify(broken.body)).toContain('gamma');
	});
});
