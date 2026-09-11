import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { messagesAt, stripPrefix, zodIssues } from './issues';

describe('issues', () => {
	const schema = z.strictObject({
		name: z.string().min(1),
		videos: z.array(z.object({ id: z.string() }))
	});
	const error = schema.safeParse({ name: '', videos: [{ id: 1 }] }).error!;

	it('flattens zod paths with dots', () => {
		expect(zodIssues(error).map((i) => i.path)).toEqual(['name', 'videos.0.id']);
	});

	it('finds the messages at one path', () => {
		expect(messagesAt(zodIssues(error), 'videos.0.id')).toHaveLength(1);
		expect(messagesAt(zodIssues(error), 'videos')).toEqual([]);
	});

	it('strips a tools.N. prefix and leaves other paths alone', () => {
		const issues = [
			{ path: 'tools.3.category', message: 'a' },
			{ path: 'tools.3', message: 'b' },
			{ path: 'tools.4.category', message: 'c' }
		];
		expect(stripPrefix(issues, 'tools.3.').map((i) => i.path)).toEqual([
			'category',
			'',
			'tools.4.category'
		]);
	});
});
