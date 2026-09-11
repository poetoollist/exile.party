import type { Category, Tool } from '../catalog/schema';

/** What is on disk beside about.yaml. */
export interface ToolAssets {
	/** `icon.png`, `icon.svg` or `icon.webp`, or null when there is none. */
	icon: string | null;
	/** File names under shots/, A to Z. */
	shots: string[];
}

export interface EditorTool extends Tool {
	assets: ToolAssets;
}

export interface EditorCatalog {
	categories: Category[];
	tools: EditorTool[];
}
