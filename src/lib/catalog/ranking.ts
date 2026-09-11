import { inSection, sortTools } from './home';
import type { Issue } from './issues';
import type { Tool } from './schema';

export interface SectionOrder {
	/** In rank order, ascending. */
	ranked: Tool[];
	/** A to Z. */
	unranked: Tool[];
}

/** The tools in a section, split into the ranked group in its order and the rest A to Z. */
export function sectionOrder(tools: readonly Tool[], sectionId: string): SectionOrder {
	const members = sortTools(
		tools.filter((t) => inSection(t, sectionId)),
		sectionId
	);
	return {
		ranked: members.filter((t) => t.rank?.[sectionId] !== undefined),
		unranked: members.filter((t) => t.rank?.[sectionId] === undefined)
	};
}

/** Why `rankedIds` cannot be applied to the section: an id outside it, or one listed twice. Empty when it can. */
export function rankingIssues(
	tools: readonly Tool[],
	sectionId: string,
	rankedIds: readonly string[]
): Issue[] {
	const members = new Set(tools.filter((t) => inSection(t, sectionId)).map((t) => t.id));
	const seen = new Set<string>();
	const issues: Issue[] = [];
	rankedIds.forEach((id, i) => {
		if (!members.has(id)) {
			issues.push({ path: `ranked.${i}`, message: `${id} is not in section ${sectionId}` });
		} else if (seen.has(id)) {
			issues.push({ path: `ranked.${i}`, message: `${id} is listed twice` });
		}
		seen.add(id);
	});
	return issues;
}

/**
 * The tools whose `rank` changes when `rankedIds` becomes the section's ranked order: listed
 * tools get position + 1, the rest of the section lose the key, and an emptied map is dropped.
 * Returns copies in catalog order; unchanged tools are left out.
 */
export function applyRanking(
	tools: readonly Tool[],
	sectionId: string,
	rankedIds: readonly string[]
): Tool[] {
	return tools.flatMap((tool) => {
		if (!inSection(tool, sectionId)) return [];
		const position = rankedIds.indexOf(tool.id);
		const next = position === -1 ? undefined : position + 1;
		if (tool.rank?.[sectionId] === next) return [];
		const rank: Record<string, number> = { ...tool.rank };
		if (next === undefined) delete rank[sectionId];
		else rank[sectionId] = next;
		return [{ ...tool, rank: Object.keys(rank).length > 0 ? rank : undefined }];
	});
}
