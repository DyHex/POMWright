/**
 * The order of a page's session storage calls. Per page and origin, each call's task runs once the previous one has
 * settled, whether it succeeded or failed. A call joins its origin's chain synchronously, so calls that overlap (a
 * `Promise.all`, a missing `await`) act in the order they were made, exactly as awaited ones do. Every
 * `SessionStorage` on a page shares the chains, whichever page object or test created it. On a page whose URL has no
 * origin, such as an `about:blank` popup that inherited one, a call cannot tell its origin synchronously: it takes a
 * page-wide turn, after every earlier call on the page, and every later call on the page waits for it.
 */

/** The key of a call on a page whose URL has no origin: its turn comes after every earlier call on the page. */
export const PAGE_WIDE: unique symbol = Symbol("page-wide");

type Turns = {
	/** The last call of each origin's chain. */
	perOrigin: Map<string, Promise<void>>;
	/** The last page-wide call, which a chain started after it waits for. */
	pageWide: Promise<void> | undefined;
};

const turns = new WeakMap<object, Turns>();

/** Runs `task` in its turn for `key` on `page`, an origin or `PAGE_WIDE`, and returns its result. */
export const takeTurn = <T>(page: object, key: string | typeof PAGE_WIDE, task: () => Promise<T>): Promise<T> => {
	let state = turns.get(page);
	if (state === undefined) {
		state = { perOrigin: new Map(), pageWide: undefined };
		turns.set(page, state);
	}
	const { perOrigin } = state;
	const previous =
		key === PAGE_WIDE
			? Promise.all([...perOrigin.values(), state.pageWide])
			: (perOrigin.get(key) ?? state.pageWide ?? Promise.resolve());
	const call = previous.then(() => task());
	// the next call waits for this one, whether it succeeds or fails
	const settled = call.then(
		() => undefined,
		() => undefined,
	);
	if (key === PAGE_WIDE) {
		// every chain there is ends with it, and a chain started later begins after it
		for (const origin of perOrigin.keys()) {
			perOrigin.set(origin, settled);
		}
		state.pageWide = settled;
	} else {
		perOrigin.set(key, settled);
	}
	const turnsOfPage = state;
	settled.then(() => {
		for (const [origin, last] of turnsOfPage.perOrigin) {
			if (last === settled) {
				turnsOfPage.perOrigin.delete(origin);
			}
		}
		if (turnsOfPage.pageWide === settled) {
			turnsOfPage.pageWide = undefined;
		}
	});
	return call;
};
