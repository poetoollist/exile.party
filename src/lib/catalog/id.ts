/** Directory id for a tool, derived from its name: ASCII, lowercase, kebab-case. `poe.ninja` gives `poe-ninja`. */
export function toolId(name: string): string {
	return name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
