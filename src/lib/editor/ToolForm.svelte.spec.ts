import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { emptyTool } from './form';
import ToolForm from './ToolForm.svelte';

test('shows a field issue and keeps Save disabled until the draft is valid and changed', async () => {
	const screen = await render(ToolForm, {
		id: 'alpha',
		initial: {
			...emptyTool(),
			name: 'Alpha',
			description: 'Prices items fast.',
			url: 'https://alpha.example',
			games: ['poe1'],
			category: 'trade',
			platforms: ['web']
		},
		categories: [{ id: 'trade', name: 'Trade' }],
		assets: { icon: null, shots: [] },
		knownTags: [],
		onsaved: () => {}
	});

	const save = screen.getByRole('button', { name: 'Save' });
	await expect.element(save).toBeDisabled();

	const name = screen.getByLabelText('Name', { exact: true });
	await name.fill('');
	/* The message shows under the field and again in the preview's issue list; take the first. */
	await expect.element(screen.getByText(/Too small/).first()).toBeVisible();
	await expect.element(save).toBeDisabled();

	await name.fill('Beta');
	await expect.element(save).toBeEnabled();
	await expect.element(screen.getByText('name: Beta')).toBeVisible();
});
