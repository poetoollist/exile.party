import { describe, expect, it } from 'vitest';
import { embedUrl, thumbnailUrl, watchUrl } from './video';

describe('video urls', () => {
	it('links to the watch page', () => {
		expect(watchUrl('pF22I1o9lrg')).toBe('https://www.youtube.com/watch?v=pF22I1o9lrg');
	});

	it('embeds through the privacy-enhanced host, autoplaying and without related videos', () => {
		expect(embedUrl('pF22I1o9lrg')).toBe(
			'https://www.youtube-nocookie.com/embed/pF22I1o9lrg?autoplay=1&rel=0'
		);
	});

	it('points at the high-quality default thumbnail', () => {
		expect(thumbnailUrl('pF22I1o9lrg')).toBe('https://i.ytimg.com/vi/pF22I1o9lrg/hqdefault.jpg');
	});
});
