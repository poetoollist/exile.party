import { loadCatalog } from '../src/lib/server/catalog';

try {
	const c = loadCatalog();
	console.log(`tools.yaml OK: ${c.categories.length} categories, ${c.tools.length} tools`);
} catch (e) {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
}
