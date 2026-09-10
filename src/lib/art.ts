import poe1Jpg from './assets/chooser/poe1.jpg';
import poe1Webp from './assets/chooser/poe1.webp';
import poe2Jpg from './assets/chooser/poe2.jpg';
import poe2Webp from './assets/chooser/poe2.webp';
import type { Game } from './catalog/schema';

export interface Art {
	jpg: string;
	webp: string;
	width: number;
	height: number;
	/** Point between the character's eyes, as fractions of the image. */
	eye: { x: number; y: number };
}

/** Crops of this art must anchor on `eye`, never the image centre: a centred cover crop of
 *  these portraits lands on the waist. */
export const ART: Record<Game, Art> = {
	poe1: { jpg: poe1Jpg, webp: poe1Webp, width: 1800, height: 1600, eye: { x: 0.4, y: 0.29 } },
	poe2: { jpg: poe2Jpg, webp: poe2Webp, width: 1800, height: 1473, eye: { x: 0.565, y: 0.265 } }
};
