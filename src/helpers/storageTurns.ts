/**
 * The order of a page's session storage calls. Per page and origin, each call's task runs once the previous one has
 * settled, whether it succeeded or failed. A call joins its origin's chain synchronously, so calls that overlap (a
 * `Promise.all`, a missing `await`) act in the order they were made, exactly as awaited ones do. Every
 * `SessionStorage` on a page shares the chains, whichever page object or test created it.
 */

const chains = new WeakMap<object, Map<string, Promise<void>>>();

/**
 * Runs `task` in its turn for `origin` on `page` and returns its result. `origin` is `""` for a page without one, so a
 * call there still takes its turn before it fails.
 */
export const takeTurn = <T>(page: object, origin: string, task: () => Promise<T>): Promise<T> => {
	let perOrigin = chains.get(page);
	if (perOrigin === undefined) {
		perOrigin = new Map();
		chains.set(page, perOrigin);
	}
	const call = (perOrigin.get(origin) ?? Promise.resolve()).then(task);
	// the next call waits for this one, whether it succeeds or fails
	const settled = call.then(
		() => undefined,
		() => undefined,
	);
	perOrigin.set(origin, settled);
	const origins = perOrigin;
	settled.then(() => {
		if (origins.get(origin) === settled) {
			origins.delete(origin);
		}
	});
	return call;
};
