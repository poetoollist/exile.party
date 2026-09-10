import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

test('a game page shows its own chooser art faintly behind the heading', async ({ page }) => {
	await page.goto('/poe1');
	await expect(page.locator('[data-testid="listing-art"] img')).toHaveAttribute('src', /poe1/);

	await page.goto('/poe2');
	await expect(page.locator('[data-testid="listing-art"] img')).toHaveAttribute('src', /poe2/);
});

test('the unlocked directory has no listing art', async ({ page }) => {
	await page.goto('/tools');
	await expect(page.locator('[data-testid="listing-art"]')).toHaveCount(0);
});
