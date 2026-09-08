export interface Maintainer {
	login: string;
	/** Display name, when it should read as something other than the GitHub login. */
	name?: string;
	/** Short role, e.g. "Design". Left off until someone fills it in rather than guessed at. */
	role?: string;
}

/** Order is as given, not ranked. Tools marked `byMaintainer` in about.yaml belong to this list. */
export const MAINTAINERS: readonly Maintainer[] = [
	{ login: 'fredfhammer' },
	{ login: 'juddisjudd' },
	{ login: 'sbsrnt' },
	{ login: 'eniner' },
	{ login: 'sengokudaikon' }
];

/** GitHub serves an avatar at /<login>.png, so no API call and no rate limit. */
export function avatarUrl(login: string, size = 160): string {
	return `https://github.com/${login}.png?size=${size}`;
}

export function profileUrl(login: string): string {
	return `https://github.com/${login}`;
}
