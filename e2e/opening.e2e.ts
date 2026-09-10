import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

declare global {
	interface Window {
		__opening?: string[];
	}
}

/** Records every value `html[data-opening]` takes, so a transition that ran and then cleaned up
 *  after itself still leaves a trace to assert on. */
async function watchOpening(page: Page) {
	await page.evaluate(() => {
		const seen: string[] = [];
		window.__opening = seen;
		new MutationObserver(() => {
			const v = document.documentElement.dataset.opening;
			if (v) seen.push(v);
		}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-opening'] });
	});
}

const seen = (page: Page) => page.evaluate(() => window.__opening ?? null);

/** Clicks the first card and waits for the opening to run. A click that lands before hydration
 *  is a full page load with no transition; that leaves no observer, so the attempt is retried. */
async function openFirstCard(page: Page): Promise<string> {
	let id = '';
	await expect(async () => {
		if (!/\/poe1$/.test(page.url())) await page.goto('/poe1');
		await watchOpening(page);
		const card = page.locator('[data-opening="card"]').first();
		id = (await card.getAttribute('data-tool')) ?? '';
		await card.locator('a').click();
		await expect.poll(() => seen(page), { timeout: 3000 }).toContain('open');
	}).toPass({ timeout: 20000 });
	return id;
}

test('opening a tool from its card runs the card transition and lands on the tool page', async ({
	page
}) => {
	await page.goto('/poe1');
	const id = await openFirstCard(page);
	await expect(page).toHaveURL(new RegExp(`/tools/${id}$`));
	await expect(page.locator('main aside [data-opening="name"]')).toBeVisible();
	// Cleaned up after itself: no scope attribute, no names left on elements.
	await expect(page.locator('html')).not.toHaveAttribute('data-opening');
	await expect(page.locator('[style*="view-transition-name"]')).toHaveCount(0);
});

test('going back folds the tool page into its card', async ({ page }) => {
	await page.goto('/poe1');
	const id = await openFirstCard(page);
	await expect(page).toHaveURL(new RegExp(`/tools/${id}$`));
	await watchOpening(page);
	await page.goBack();
	await expect(page).toHaveURL(/\/poe1$/);
	await expect.poll(() => seen(page)).toContain('close');
	await expect(page.locator('html')).not.toHaveAttribute('data-opening');
	// A tool can sit in more than one section; the page folded into whichever card was on screen.
	const card = page.locator(`[data-opening="card"][data-tool="${id}"]`).first();
	await expect(card.locator('[data-opening="icon"]')).toBeVisible();
	await expect(card.locator('[data-opening="name"]')).toBeVisible();
	await expect(page.locator('[style*="view-transition-name"]')).toHaveCount(0);
});

test('reduced motion opens the tool page with a plain cut', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/poe1');
	await watchOpening(page);
	const card = page.locator('[data-opening="card"]').first();
	await card.locator('a').click();
	await expect(page).toHaveURL(/\/tools\//);
	// Either a client-side navigation with no transition, or a full load with no observer at all.
	expect((await seen(page)) ?? []).toEqual([]);
});
