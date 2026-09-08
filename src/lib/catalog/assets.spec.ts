import { describe, expect, it } from 'vitest';
import { iconUrl, screenshotUrl } from './assets';
import { loadCatalog } from '../server/catalog';

const catalog = loadCatalog();

describe('tool assets', () => {
	it('bundles a convention-based icon', () => {
		const scalpel = catalog.tools.find((tool) => tool.id === 'scalpel')!;
		expect(iconUrl(scalpel)).toMatch(/icon\.png(?:\?|$)/);
	});

	it('falls back when a tool has no icon', () => {
		const reddit = catalog.tools.find((tool) => tool.id === 'r-pathofexile')!;
		expect(iconUrl(reddit)).toBeNull();
	});

	it('bundles screenshots from the tool directory', () => {
		const scalpel = catalog.tools.find((tool) => tool.id === 'scalpel')!;
		expect(screenshotUrl(scalpel, 'filter-editor.webp')).toMatch(/filter-editor\.webp(?:\?|$)/);
	});
});
