import type { z } from 'zod';

/** One validation problem, addressed by a dotted path such as `videos.1.game`, or `''` for the whole object. */
export interface Issue {
	path: string;
	message: string;
}

export function zodIssues(error: z.ZodError): Issue[] {
	return error.issues.map((issue) => ({
		path: issue.path.map(String).join('.'),
		message: issue.message
	}));
}

/** Messages of the issues at exactly `path`. */
export function messagesAt(issues: readonly Issue[], path: string): string[] {
	return issues.filter((issue) => issue.path === path).map((issue) => issue.message);
}

/** Drops a `tools.3.` style prefix so a catalog-level issue about one tool lands on that tool's field. */
export function stripPrefix(issues: readonly Issue[], prefix: string): Issue[] {
	const bare = prefix.slice(0, -1);
	return issues.map((issue) =>
		issue.path === bare || issue.path.startsWith(prefix)
			? { ...issue, path: issue.path.slice(prefix.length) }
			: issue
	);
}
