import { expect, test, type Locator } from '@playwright/test';

/** Retries an action until its effect shows, so a keystroke or click that lands before hydration
 *  has attached listeners is simply sent again. Both uses are toggles, so once the effect is
 *  already visible the action is skipped rather than re-sent, which would toggle it back off. */
async function untilVisible(act: () => Promise<void>, effect: Locator) {
	await expect(async () => {
		if (!(await effect.isVisible())) await act();
		await expect(effect).toBeVisible({ timeout: 1000 });
	}).toPass();
}

test('a game page is the directory locked to that game', async ({ page }) => {
	await page.goto('/poe1');
	await expect(page.locator('h1')).toHaveText('Path of Exile tools');
	await expect(page.getByRole('group', { name: 'Game' }).first()).toContainText('PoE 1');
	await expect(page.locator('a[href^="/tools/"]').first()).toBeVisible();
	await expect(page.locator('main p.tabular-nums').first()).not.toContainText('of');
});

test('a game page filter round-trips through the URL without a game param', async ({ page }) => {
	await page.goto('/poe1');
	const filtersButton = page.getByRole('button', { name: /^Filters/ });
	await untilVisible(() => filtersButton.click(), page.locator('#filters-panel'));
	// A string matches the label's normalised text; a regex would be tested against the raw
	// " Open source 6", so an anchored one never matches. "Closed source" does not contain this.
	await page.getByLabel('Open source').check();
	await expect(page).toHaveURL(/\/poe1\?code=open$/);
	await page.reload();
	await untilVisible(() => filtersButton.click(), page.locator('#filters-panel'));
	await expect(page.getByLabel('Open source')).toBeChecked();
	await expect(page.locator('main p.tabular-nums').first()).toContainText('of');
});

test('the chooser offers both games with live counts', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('Welcome to the Party, Exile');
	await expect(page.getByRole('link', { name: /^Path of Exile tools, \d+ listed$/ })).toBeVisible();
	await expect(
		page.getByRole('link', { name: /^Path of Exile 2 tools, \d+ listed$/ })
	).toBeVisible();
});

test('picking a game lands on its page and is remembered', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /^Path of Exile 2 tools/ }).click();
	await expect(page).toHaveURL(/\/poe2$/);
	// Scoped to main: the chooser's own h1 can still be mid-outro, pinned over this page.
	await expect(page.locator('main h1')).toHaveText('Path of Exile 2 tools');
	await expect(page.evaluate(() => localStorage.getItem('exile.game'))).resolves.toBe('poe2');
	await page.goto('/');
	await expect(page).toHaveURL(/\/poe2$/);
	await page.goto('/?choose');
	await expect(page.locator('h1')).toHaveText('Welcome to the Party, Exile');
});

test('the chooser works without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/');
	// position: both halves are full-viewport <a> elements distinguished only by clip-path, so
	// their bounding-box centers coincide exactly on the seam and the click would otherwise land
	// on whichever half paints on top there. A real pointer never lands on that literal hairline;
	// this aims the click at the corner that is unambiguously the left half's.
	await page
		.getByRole('link', { name: /^Path of Exile tools/ })
		.click({ position: { x: 20, y: 20 } });
	await expect(page).toHaveURL(/\/poe1$/);
	await context.close();
});

test('directory lists tool cards', async ({ page }) => {
	await page.goto('/tools');
	await expect(page.locator('h1')).toHaveText('All tools');
	await expect(page.locator('a[href^="/tools/"]').first()).toBeVisible();
});

test('tool page loads from the directory', async ({ page }) => {
	await page.goto('/tools');
	const first = page.locator('main li[data-games] a[href^="/tools/"]').first();
	const name = (await first.textContent())!.trim();
	await first.click();
	await expect(page).toHaveTitle(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `));
	await expect(page.locator('h1')).not.toBeEmpty();
	await expect(page.locator('main')).toContainText(name);
	await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open tool' })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Tools');
});

test('unknown tool id is a 404', async ({ page }) => {
	const res = await page.goto('/tools/does-not-exist');
	expect(res?.status()).toBe(404);
});

test('the submit dialog explains the pull request flow and closes on Escape', async ({ page }) => {
	await page.goto('/poe1');
	await page.getByRole('button', { name: 'Submit a tool' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText('tools.yaml');
	await expect(dialog).toContainText('bun run validate');
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
});

test('the theme toggle still lands on the chosen theme through the view transition', async ({
	page
}) => {
	await page.goto('/poe1');
	await page.getByRole('button', { name: 'Dark' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.getByRole('button', { name: 'Light' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	// The scoping attribute must be cleaned up, or the rules leak into later transitions.
	await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition', /.*/);
});

test('the footer reaches the maintainers page', async ({ page }) => {
	await page.goto('/poe1');
	await page.getByRole('link', { name: 'Maintainers' }).click();
	await expect(page).toHaveURL(/\/maintainers$/);
	await expect(page.locator('h1')).toHaveText('Maintainers');
	await expect(page.getByRole('link', { name: /juddisjudd/ })).toBeVisible();
});

test('a game page only lists tools for that game', async ({ page }) => {
	await page.goto('/poe2');
	await expect(page.locator('h1')).toHaveText('Path of Exile 2 tools');
	const cards = page.locator('main li[data-games]');
	await expect(cards.first()).toBeVisible();
	const count = await cards.count();
	for (let i = 0; i < count; i++) {
		await expect(cards.nth(i)).toHaveAttribute('data-games', /\bpoe2\b/);
	}
});

test('the search palette opens on Control+K and jumps to a tool', async ({ page }) => {
	await page.goto('/poe1');
	const box = page.getByRole('combobox', { name: 'Search tools' });
	await untilVisible(() => page.keyboard.press('Control+k'), box);
	await expect(box).toBeFocused();
	await box.fill('awakened');
	await expect(page.getByRole('option', { name: /Awakened PoE Trade/ })).toBeVisible();
	await expect(page.getByRole('option', { name: /Awakened PoE Trade/ })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/tools\/awakened-poe-trade$/);
});

test('the category rail jumps to its section', async ({ page }) => {
	await page.goto('/tools');
	await page
		.getByRole('navigation', { name: 'Categories' })
		.getByRole('link', { name: /^Trade/ })
		.click();
	await expect(page).toHaveURL(/\/tools#cat-trade$/);
	await expect(page.locator('#cat-trade')).toBeInViewport();
});

test('Start here leads the directory and the rail reaches it', async ({ page }) => {
	await page.goto('/tools');
	await expect(page.locator('main section h2').first()).toHaveText('Start here');
	await page
		.getByRole('navigation', { name: 'Categories' })
		.getByRole('link', { name: /^Start here/ })
		.click();
	await expect(page).toHaveURL(/\/tools#cat-start-here$/);
	await expect(page.locator('#cat-start-here')).toBeInViewport();
});

test("an editor's pick carries a star on its card", async ({ page }) => {
	await page.goto('/tools');
	const first = page.locator('#cat-start-here li').first();
	await expect(first.getByTitle("Editor's pick")).toBeAttached();
	await expect(first.getByText("Editor's pick")).toBeAttached();
});

test('the switch-game link reaches the chooser with the escape-hatch querystring', async ({
	page
}) => {
	await page.goto('/poe1');
	await page.getByRole('link', { name: 'Switch game' }).first().click();
	await expect(page).toHaveURL(/\/\?choose$/);
});

test('the picked half opens over the game page, then the chooser is removed', async ({ page }) => {
	await page.goto('/');
	await page
		.getByRole('link', { name: /^Path of Exile tools/ })
		.click({ position: { x: 20, y: 20 } });
	await expect(page).toHaveURL(/\/poe1$/);
	await expect(page.locator('.chooser')).toHaveAttribute('data-picked', 'poe1');
	// Scoped to main: the chooser's own h1 is still mid-outro, pinned over this page.
	await expect(page.locator('main h1')).toHaveText('Path of Exile tools');
	await expect(page.locator('.chooser')).toHaveCount(0);
});

test('reduced motion skips straight to the game page', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await page.getByRole('link', { name: /^Path of Exile 2 tools/ }).click();
	await expect(page).toHaveURL(/\/poe2$/);
	await expect(page.locator('.chooser')).toHaveCount(0);
});

test('client-side navigation to / also honours the remembered game', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /^Path of Exile 2 tools/ }).click();
	await expect(page).toHaveURL(/\/poe2$/);
	await page.goto('/poe1');
	await page.getByRole('link', { name: 'exile.party home' }).click();
	await expect(page).toHaveURL(/\/poe2$/);
	await page.getByRole('link', { name: 'Switch game' }).first().click();
	await expect(page).toHaveURL(/\/\?choose$/);
	await expect(page.locator('h1')).toHaveText('Welcome to the Party, Exile');
});

test('a panel can be picked from the keyboard', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /^Path of Exile tools/ }).focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/poe1$/);
});

test('a modifier click on a panel is left to the browser', async ({ page, context }) => {
	await page.goto('/');
	const [popup] = await Promise.all([
		context.waitForEvent('page'),
		page
			.getByRole('link', { name: /^Path of Exile 2 tools/ })
			.click({ modifiers: ['ControlOrMeta'] })
	]);
	await expect(popup).toHaveURL(/\/poe2$/);
	await expect(page).toHaveURL(/\/$/);
});

test('back from a picked game does not trap the visitor', async ({ page }) => {
	await page.goto('/poe1');
	await page.getByRole('link', { name: 'Switch game' }).first().click();
	await expect(page).toHaveURL(/\/\?choose$/);
	const poe2 = page.getByRole('link', { name: /^Path of Exile 2 tools/ });
	// position: "Switch game" sits over the poe1 half, and the browser re-hit-tests the stationary
	// pointer against the new page, so poe1 is still hovered here with no mouse movement at all.
	// Both panels are identical full-viewport <a> elements, so an unqualified click lands on their
	// shared bounding-box center, which the still-hovered poe1 half claims via the seam's hover
	// shift. Aim at the corner that is unambiguously poe2's regardless of that shift.
	const box = await poe2.boundingBox();
	await poe2.click({ position: { x: box!.width - 20, y: 20 } });
	await expect(page).toHaveURL(/\/poe2$/);
	await page.goBack();
	await expect(page).toHaveURL(/\/poe1$/);
	// Scoped to main: the chooser's own h1 can still be mid-outro from the earlier pick.
	await expect(page.locator('main h1')).toHaveText('Path of Exile tools');
	await expect(page.getByRole('group', { name: 'Game' }).first()).toContainText('PoE 1');
	const cards = page.locator('main li[data-games]');
	await expect(cards.first()).toBeVisible();
	const count = await cards.count();
	for (let i = 0; i < count; i++) {
		await expect(cards.nth(i)).toHaveAttribute('data-games', /\bpoe1\b/);
	}
});
