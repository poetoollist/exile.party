import { z } from 'zod';

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const id = z.string().regex(kebab, 'kebab-case id');
const https = z.url({ protocol: /^https$/ });

export const Game = z.enum(['poe1', 'poe2']);
export const Status = z.enum(['active', 'unmaintained', 'dead']);
export const Pricing = z.enum(['free', 'freemium', 'paid']);
export const Platform = z.enum(['windows', 'macos', 'linux', 'web', 'android', 'ios']);

/** Id of the virtual "Start here" section the directory leads with. `tools.yaml` cannot define a category with it. */
export const START_HERE_ID = 'start-here';

/** Per-game links, for tools that split PoE1 and PoE2 across separate URLs. */
const PerGame = z.strictObject({ poe1: https.optional(), poe2: https.optional() });

/** A bare file name; no directories, so the YAML cannot point outside its tool folder. */
const assetFile = (extensions: string) =>
	z
		.string()
		.regex(
			new RegExp(`^[a-z0-9-]+\\.(${extensions})$`),
			`file name like name.${extensions.split('|')[0]}`
		);

/** Lives at tools/<tool id>/shots/<file>. */
const screenshotFile = assetFile('png|webp|jpg');

export const Category = z.strictObject({
	id,
	name: z.string().min(1),
	description: z.string().max(120).optional()
});

export const CategoryFile = z.strictObject({
	categories: z.array(Category).nonempty()
});

const listedForEveryGame = (map: Record<string, unknown> | undefined, games: readonly string[]) =>
	Object.keys(map ?? {}).every((g) => games.includes(g));

const ToolMetadataObject = z.strictObject({
	name: z.string().min(1),
	description: z.string().min(10).max(300),
	url: https,
	urls: PerGame.optional(),
	games: z.array(Game).nonempty(),
	category: id,
	/** Secondary categories. The tool is listed under each of these as well as under `category`. */
	alsoIn: z.array(id).default([]),
	/** Position inside every section the tool appears in. Ranked tools lead, ascending; unranked follow A to Z. */
	rank: z.number().int().positive().optional(),
	tags: z.array(z.string().regex(kebab)).default([]),
	platforms: z.array(Platform).nonempty(),
	pricing: Pricing,
	/** Stated explicitly rather than inferred from `source`, so a missing repo link is never read as proprietary. */
	openSource: z.boolean(),
	source: https.optional(),
	sources: PerGame.optional(),
	/** Published by Grinding Gear Games rather than the community. */
	official: z.boolean().default(false),
	editorsPick: z.boolean().default(false),
	/** Written by someone who maintains this directory. Disclosed on the card. */
	byMaintainer: z.boolean().default(false),
	status: Status,
	lastVerified: z.iso.date(),
	notes: z.string().max(300).optional(),
	/** Who makes the tool, as they call themselves. Derived from the repository owner when absent. */
	author: z.string().min(1).max(60).optional(),
	/** A sentence about what the tool does, for the tool page headline. Derived from `description` when absent. */
	headline: z.string().min(10).max(120).optional(),
	/** Files under tools/<id>/shots/, shown on the tool page in this order. */
	screenshots: z.array(screenshotFile).default([])
});

type ToolMetadataShape = z.infer<typeof ToolMetadataObject>;

function validateToolMetadata(t: ToolMetadataShape, ctx: z.RefinementCtx) {
	if (!listedForEveryGame(t.urls, t.games)) {
		ctx.addIssue({ code: 'custom', message: 'urls keys must be listed in games', path: ['urls'] });
	}
	if (!listedForEveryGame(t.sources, t.games)) {
		ctx.addIssue({
			code: 'custom',
			message: 'sources keys must be listed in games',
			path: ['sources']
		});
	}
	if ((t.source ?? t.sources) && !t.openSource) {
		ctx.addIssue({
			code: 'custom',
			message: 'a repository link means openSource must be true',
			path: ['openSource']
		});
	}
	if (new Set(t.alsoIn).size !== t.alsoIn.length || t.alsoIn.includes(t.category)) {
		ctx.addIssue({
			code: 'custom',
			message: 'alsoIn must not repeat category or list an id twice',
			path: ['alsoIn']
		});
	}
}

/** The contents of one tools/<id>/about.yaml file. The directory supplies the id. */
export const ToolMetadata = ToolMetadataObject.superRefine(validateToolMetadata);

/** Runtime tool shape after the directory id has been added. */
export const Tool = z
	.strictObject({ id, ...ToolMetadataObject.shape })
	.superRefine(validateToolMetadata);

export const Catalog = z
	.strictObject({
		categories: z.array(Category).nonempty(),
		tools: z.array(Tool)
	})
	.superRefine((c, ctx) => {
		c.categories.forEach((cat, i) => {
			if (cat.id === START_HERE_ID) {
				ctx.addIssue({
					code: 'custom',
					path: ['categories', i, 'id'],
					message: `${START_HERE_ID} is reserved for the Start here section`
				});
			}
		});
		const cats = new Set(c.categories.map((x) => x.id));
		const seen = new Set<string>();
		c.tools.forEach((t, i) => {
			if (seen.has(t.id)) {
				ctx.addIssue({ code: 'custom', path: ['tools', i, 'id'], message: `duplicate id ${t.id}` });
			}
			seen.add(t.id);
			if (!cats.has(t.category)) {
				ctx.addIssue({
					code: 'custom',
					path: ['tools', i, 'category'],
					message: `unknown category ${t.category}`
				});
			}
			t.alsoIn.forEach((a, j) => {
				if (!cats.has(a)) {
					ctx.addIssue({
						code: 'custom',
						path: ['tools', i, 'alsoIn', j],
						message: `unknown category ${a}`
					});
				}
			});
		});
	});

export type Game = z.infer<typeof Game>;
export type Pricing = z.infer<typeof Pricing>;
export type Status = z.infer<typeof Status>;
export type Platform = z.infer<typeof Platform>;
export type Tool = z.infer<typeof Tool>;
export type Category = z.infer<typeof Category>;
export type Catalog = z.infer<typeof Catalog>;
