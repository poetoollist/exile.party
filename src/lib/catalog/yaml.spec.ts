import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES_FILE, parseCategories, parseTool, TOOLS_DIRECTORY } from '../server/catalog';
import type { ToolMetadata } from './schema';
import { categoriesYaml, toolYaml } from './yaml';

const lf = (text: string) => text.replace(/\r\n/g, '\n');

const ids = readdirSync(TOOLS_DIRECTORY, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);

describe('toolYaml', () => {
	it.each(ids)('round-trips tools/%s/about.yaml byte for byte', (id) => {
		const text = lf(readFileSync(resolve(TOOLS_DIRECTORY, id, 'about.yaml'), 'utf8'));
		expect(toolYaml(parseTool(text, id))).toBe(text);
	});

	it('writes every key in canonical order and leaves defaults out', () => {
		const full: ToolMetadata = {
			name: 'T',
			author: 'A',
			headline: 'Headline of ten chars',
			description: 'Description of the tool.',
			url: 'https://t.example',
			urls: { poe2: 'https://t.example/poe2' },
			games: ['poe1', 'poe2'],
			category: 'trade',
			alsoIn: ['crafting'],
			tags: ['x'],
			platforms: ['web'],
			pricing: 'free',
			openSource: true,
			source: 'https://github.com/t/t',
			sources: { poe1: 'https://github.com/t/t1' },
			official: false,
			byMaintainer: true,
			editorsPick: true,
			newPlayer: false,
			rank: { trade: 2 },
			status: 'active',
			lastVerified: '2026-09-10',
			notes: 'Note.',
			screenshots: ['a.webp'],
			videos: [{ youtube: 'abcdefghijk', title: 'V', channel: 'C', byCreator: false, game: 'poe1' }]
		};
		expect(toolYaml(full)).toBe(`name: T
author: A
headline: Headline of ten chars
description: Description of the tool.
url: https://t.example
urls:
  poe2: https://t.example/poe2
games:
  - poe1
  - poe2
category: trade
alsoIn:
  - crafting
tags:
  - x
platforms:
  - web
pricing: free
openSource: true
source: https://github.com/t/t
sources:
  poe1: https://github.com/t/t1
byMaintainer: true
editorsPick: true
rank:
  trade: 2
status: active
lastVerified: 2026-09-10
notes: Note.
screenshots:
  - a.webp
videos:
  - youtube: abcdefghijk
    title: V
    channel: C
    game: poe1
`);
	});

	it('always writes openSource, and drops empty maps and lists', () => {
		const minimal: ToolMetadata = {
			name: 'T',
			description: 'Description of the tool.',
			url: 'https://t.example',
			urls: {},
			games: ['poe1'],
			category: 'trade',
			alsoIn: [],
			tags: [],
			platforms: ['web'],
			pricing: 'free',
			openSource: false,
			official: false,
			byMaintainer: false,
			editorsPick: false,
			newPlayer: false,
			rank: {},
			status: 'active',
			lastVerified: '2026-09-10',
			screenshots: [],
			videos: []
		};
		expect(toolYaml(minimal)).toBe(`name: T
description: Description of the tool.
url: https://t.example
games:
  - poe1
category: trade
platforms:
  - web
pricing: free
openSource: false
status: active
lastVerified: 2026-09-10
`);
	});
});

describe('categoriesYaml', () => {
	it('round-trips tools/categories.yaml with its header comment', () => {
		const text = lf(readFileSync(CATEGORIES_FILE, 'utf8'));
		expect(categoriesYaml(parseCategories(text), text)).toBe(text);
	});

	it('writes no header when there is no existing text', () => {
		expect(categoriesYaml([{ id: 'trade', name: 'Trade' }])).toBe(
			'categories:\n  - id: trade\n    name: Trade\n'
		);
	});
});
