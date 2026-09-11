import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stdout } from 'node:process';
import { z } from 'zod';
import { toolId } from '../src/lib/catalog/id';
import { toolYaml } from '../src/lib/catalog/yaml';
import {
	Game,
	Platform,
	Pricing,
	Status,
	ToolMetadata,
	type Tool
} from '../src/lib/catalog/schema';
import { loadCatalog, TOOLS_DIRECTORY } from '../src/lib/server/catalog';

interface Choice<T extends string> {
	value: T;
	label: string;
}

async function requiredName(existingTools: readonly Tool[]): Promise<string> {
	const value = await input({
		message: 'Name',
		required: true,
		validate: (candidate) => {
			const name = candidate.trim();
			if (!name) return 'Name is required.';
			const existing = existingTools.find(
				(tool) => tool.name.toLocaleLowerCase() === name.toLocaleLowerCase()
			);
			return existing
				? `A tool named "${existing.name}" already exists at tools/${existing.id}.`
				: true;
		}
	});
	return value.trim();
}

async function directoryId(name: string): Promise<string> {
	const suggested = toolId(name);
	const value = await input({
		message: 'Directory id',
		default: suggested || undefined,
		validate: (candidate) => {
			const id = candidate.trim();
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
				return 'Use a kebab-case id, for example my-tool.';
			}
			return existsSync(resolve(TOOLS_DIRECTORY, id))
				? `tools/${id} already exists. Choose another id.`
				: true;
		}
	});
	return value.trim();
}

async function requiredText(label: string, min: number, max: number): Promise<string> {
	const value = await input({
		message: label,
		required: true,
		validate: (candidate) => {
			const length = candidate.trim().length;
			return length >= min && length <= max ? true : `Enter between ${min} and ${max} characters.`;
		}
	});
	return value.trim();
}

async function optionalText(label: string, max: number, min = 1): Promise<string | undefined> {
	const value = await input({
		message: `${label} (optional)`,
		validate: (candidate) => {
			const length = candidate.trim().length;
			return length === 0 || (length >= min && length <= max)
				? true
				: `Enter between ${min} and ${max} characters, or leave it blank.`;
		}
	});
	return value.trim() || undefined;
}

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

async function httpsUrl(label: string, optional = false): Promise<string | undefined> {
	const value = await input({
		message: `${label}${optional ? ' (optional)' : ''}`,
		required: !optional,
		validate: (candidate) => {
			const url = candidate.trim();
			return (optional && !url) || isHttpsUrl(url) ? true : 'Enter a complete https:// URL.';
		}
	});
	return value.trim() || undefined;
}

async function yesNo(label: string, fallback: boolean): Promise<boolean> {
	return confirm({ message: label, default: fallback });
}

async function chooseOne<T extends string>(
	label: string,
	choices: readonly Choice<T>[],
	fallback?: T
): Promise<T> {
	return select<T>({
		message: label,
		choices: choices.map((choice) => ({ name: choice.label, value: choice.value })),
		default: fallback,
		loop: false,
		pageSize: choices.length
	});
}

async function chooseMany<T extends string>(
	label: string,
	choices: readonly Choice<T>[]
): Promise<T[]> {
	return checkbox<T>({
		message: label,
		choices: choices.map((choice) => ({ name: choice.label, value: choice.value })),
		required: true,
		loop: false,
		pageSize: choices.length
	});
}

async function optionalList(
	label: string,
	pattern: RegExp,
	example: string
): Promise<string[] | undefined> {
	const value = await input({
		message: `${label} (comma-separated, optional)`,
		validate: (candidate) => {
			const values = candidate
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);
			return values.length === 0 || values.every((item) => pattern.test(item))
				? true
				: `Use comma-separated values like ${example}.`;
		}
	});
	const values = [
		...new Set(
			value
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		)
	];
	return values.length > 0 ? values : undefined;
}

async function verifiedDate(): Promise<string> {
	const value = await input({
		message: 'Last verified',
		default: new Date().toISOString().slice(0, 10),
		validate: (candidate) =>
			z.iso.date().safeParse(candidate.trim()).success || 'Use the YYYY-MM-DD date format.'
	});
	return value.trim();
}

async function main() {
	const catalog = loadCatalog();
	stdout.write('Required fields\n');

	const name = await requiredName(catalog.tools);
	const id = await directoryId(name);
	const directory = resolve(TOOLS_DIRECTORY, id);
	const description = await requiredText('Description', 10, 300);
	const url = (await httpsUrl('Website or repository URL'))!;
	const games = await chooseMany(
		'Games',
		Game.options.map((value) => ({
			value,
			label: value === 'poe1' ? 'Path of Exile 1' : 'Path of Exile 2'
		}))
	);
	const category = await chooseOne(
		'Category',
		catalog.categories.map(({ id: value, name: categoryName }) => ({
			value,
			label: `${categoryName} (${value})`
		}))
	);
	const platforms = await chooseMany(
		'Platforms',
		Platform.options.map((value) => ({ value, label: value }))
	);
	const pricing = await chooseOne(
		'Pricing',
		Pricing.options.map((value) => ({ value, label: value })),
		'free'
	);
	const openSource = await yesNo('Open source?', false);
	const status = await chooseOne(
		'Status',
		Status.options.map((value) => ({ value, label: value })),
		'active'
	);
	const lastVerified = await verifiedDate();

	const tool: Record<string, unknown> = {
		name,
		description,
		url,
		games,
		category,
		platforms,
		pricing,
		openSource,
		status,
		lastVerified
	};

	stdout.write('\nOptional fields\n');

	if (
		games.length > 1 &&
		(await yesNo('Use separate website or repository URLs for each game?', false))
	) {
		const urls: Record<string, string> = {};
		for (const game of games) {
			urls[game] = (await httpsUrl(`${game} website or repository URL`))!;
		}
		tool.urls = urls;
	}

	if (openSource) {
		const source = await httpsUrl('Repository URL, if different from the primary URL', true);
		if (source) tool.source = source;
		if (games.length > 1 && (await yesNo('Use separate repositories for each game?', false))) {
			const sources: Record<string, string> = {};
			for (const game of games) sources[game] = (await httpsUrl(`${game} repository URL`))!;
			tool.sources = sources;
		}
	}

	const author = await optionalText('Author', 60);
	if (author) tool.author = author;
	const headline = await optionalText('Headline', 120, 10);
	if (headline) tool.headline = headline;
	const tags = await optionalList('Tags', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'overlay, price-check');
	if (tags) tool.tags = tags;
	const notes = await optionalText('Notes', 300);
	if (notes) tool.notes = notes;
	if (await yesNo('Official Grinding Gear Games tool?', false)) tool.official = true;
	if (await yesNo("Editor's pick?", false)) tool.editorsPick = true;
	if (await yesNo('Made by an exile.party maintainer?', false)) tool.byMaintainer = true;
	const screenshots = await optionalList(
		'Screenshot filenames',
		/^[a-z0-9-]+\.(?:png|webp|jpg)$/,
		'overview.webp, price-check.webp'
	);
	if (screenshots) tool.screenshots = screenshots;

	const result = ToolMetadata.safeParse(tool);
	if (!result.success) {
		throw new Error(`The generated metadata failed validation:\n${z.prettifyError(result.error)}`);
	}

	mkdirSync(directory);
	writeFileSync(resolve(directory, 'about.yaml'), toolYaml(result.data), { flag: 'wx' });
	if (screenshots) mkdirSync(resolve(directory, 'shots'));

	stdout.write(`\nCreated tools/${id}/about.yaml\n`);
	stdout.write('Next:\n');
	stdout.write(`  - optionally add tools/${id}/icon.{svg,png,webp}\n`);
	if (screenshots) stdout.write(`  - copy the listed screenshots into tools/${id}/shots/\n`);
	stdout.write('  - run bun run validate\n');
}

try {
	await main();
} catch (error) {
	if (error instanceof Error && error.name === 'ExitPromptError') {
		console.error('\nCancelled.');
		process.exitCode = 130;
	} else {
		console.error(`\n${error instanceof Error ? error.message : error}`);
		process.exitCode = 1;
	}
}
