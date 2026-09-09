/** The public watch page; what the facade links to before hydration or on a modified click. */
export function watchUrl(id: string): string {
	return `https://www.youtube.com/watch?v=${id}`;
}

/** The player, on the cookie-free host. Autoplays because it only replaces a facade the user
 *  clicked; `rel=0` keeps the end screen to the same channel. */
export function embedUrl(id: string): string {
	return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}

/** The 480x360 poster. Every video has one; larger sizes exist only for some. */
export function thumbnailUrl(id: string): string {
	return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
