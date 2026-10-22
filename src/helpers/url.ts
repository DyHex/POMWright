/**
 * URL helpers for PageObject navigation.
 *
 * String URLs behave exactly like Playwright's `baseURL` handling: a target is resolved with
 * `new URL(input, baseUrl)`. A string `baseUrl` must be a non-empty origin and a string `urlPath`
 * must be "" or a single-slash path; both are validated by PageObject at construction. When either
 * part is a RegExp the page is identified by a {@link UrlMatcher}, which tests the base against the
 * URL's origin and the path against the rest of the URL, each regex exactly as written; a string part is
 * compared in the form the browser reports, as `new URL` writes it (`/søk` is `/s%C3%B8k`).
 */

/**
 * The `fullUrl` of a page object whose `baseUrl` or `urlPath` is a RegExp: a URL predicate that tests the origin
 * against the base and the rest of the URL against the path, which Playwright's `page.waitForURL`,
 * `expect(page).toHaveURL` and `page.route` take.
 *
 * @example
 * ```ts
 * await expect(page).toHaveURL(accountPage.fullUrl);
 * const onAccountPage = accountPage.fullUrl.test(page.url());
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-navigation/#urlmatcher
 */
export interface UrlMatcher {
	(url: URL): boolean;
	/** The `baseUrl` the page object was constructed with. */
	readonly base: string | RegExp;
	/** The `urlPath` the page object was constructed with. */
	readonly path: string | RegExp;
	/**
	 * Tests a URL, as the predicate does.
	 *
	 * @param url A URL string or a `URL`.
	 * @returns Whether the URL is this page's.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-navigation/#test
	 */
	test(url: string | URL): boolean;
	/**
	 * A readable form, used in step titles and error messages: `origin "https://shop.example" + path /^\/account\/\d+$/`.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-navigation/#tostring
	 */
	toString(): string;
}

const BASE_URL_RULE =
	'baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" ' +
	"(scheme, host, optional port, no path, query or hash)";

const isOrigin = (value: string): boolean => {
	if (value === "") {
		return false;
	}
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	// a bare "?" or "#" leaves search and hash empty but stays in href
	return url.host !== "" && url.pathname === "/" && url.search === "" && url.hash === "" && url.href.endsWith("/");
};

/** The base a string path resolves against when the page object's base is a RegExp, for checks and the matcher. */
const PLACEHOLDER_BASE = "http://h";

/** Throws unless `value` is a string or a RegExp, the two forms of `baseUrl` and `urlPath`. */
export const assertUrlPart = (name: "baseUrl" | "urlPath", value: unknown, label: string): void => {
	if (typeof value !== "string" && !(value instanceof RegExp)) {
		const received = value === null || typeof value !== "object" ? String(value) : "an object";
		throw new Error(`${label}: ${name} must be a string or a RegExp; received ${received}.`);
	}
};

/** Throws unless `value` is a non-empty origin (`scheme://host[:port]`, optional trailing slash). */
export const assertBaseUrl = (value: string, label: string): void => {
	if (!isOrigin(value)) {
		throw new Error(`${label}: ${BASE_URL_RULE}; received ${JSON.stringify(value)}.`);
	}
};

/**
 * Throws unless `value` is "" or a path on the base's origin: it starts with exactly one "/", and resolving it keeps
 * the origin. The URL standard reads a backslash as "/" and drops tabs and line breaks, so a backslash, or a tab and a
 * "/", after the first "/" name a host as "//host" does.
 */
export const assertUrlPath = (value: string, base: string | RegExp, label: string): void => {
	if (value !== "" && (!value.startsWith("/") || value.startsWith("//"))) {
		throw new Error(`${label}: urlPath must be "" or start with exactly one "/"; received ${JSON.stringify(value)}.`);
	}
	const origin = new URL(typeof base === "string" ? base : PLACEHOLDER_BASE).origin;
	let host: string | undefined;
	try {
		const resolved = new URL(value, origin);
		if (resolved.origin === origin) {
			return;
		}
		host = resolved.host;
	} catch {
		// a lone "/" and backslash name an empty host, which new URL rejects
	}
	throw new Error(
		`${label}: urlPath must be a path on the page object's origin; received ${JSON.stringify(value)}, which names ${
			host ? `the host ${JSON.stringify(host)}` : "a host"
		} instead. A "/" followed by another "/" or a "\\", also with a tab or line break between them, starts a host.`,
	);
};

/** True when `input` starts with a URL scheme, so `new URL` will ignore any base. */
export const isAbsoluteUrl = (input: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(input);

/** `new URL(input, baseUrl).href`, the resolution Playwright applies against `use.baseURL`. */
export const resolveUrl = (input: string, baseUrl: string): string => {
	try {
		return new URL(input, baseUrl).href;
	} catch (error) {
		throw new Error(`Cannot resolve ${JSON.stringify(input)} against baseUrl ${JSON.stringify(baseUrl)}.`, {
			cause: error,
		});
	}
};

/**
 * The URL after its origin, as `href` writes it: path, query and fragment, an empty "?" or "#" included, as Playwright's
 * own URL matching sees them (`pathname + search + hash` reports an empty query or fragment as "").
 */
const restOf = (url: URL): string => {
	const credentials =
		url.username === "" && url.password === ""
			? ""
			: `${url.username}${url.password === "" ? "" : `:${url.password}`}@`;
	const start = `${url.protocol}//${credentials}${url.host}`;
	return url.href.startsWith(start) ? url.href.slice(start.length) : url.pathname + url.search + url.hash;
};

const toUrl = (input: string | URL): URL => (typeof input === "string" ? new URL(input) : input);

const testRegExp = (regExp: RegExp, value: string): boolean => {
	regExp.lastIndex = 0;
	return regExp.test(value);
};

/**
 * Builds the matcher for a base and a path. A string base is exact origin equality after URL
 * normalisation; a string path is exact against the rest of the URL, path, query and fragment, in the form `new URL`
 * gives it (an empty "?" or "#" included),
 * with "" meaning "/".
 * A RegExp base is tested against the origin and a RegExp path against the rest, as written.
 */
export const createUrlMatcher = (base: string | RegExp, path: string | RegExp): UrlMatcher => {
	const expectedOrigin = typeof base === "string" ? new URL(base).origin : undefined;
	// a string path as the browser reports it: percent-encoded, dot segments resolved, as fullUrl is
	const expectedRest =
		typeof path === "string"
			? restOf(new URL(path || "/", typeof base === "string" ? base : PLACEHOLDER_BASE))
			: undefined;

	const matches = (url: URL): boolean => {
		const rest = restOf(url);
		const baseMatches = base instanceof RegExp ? testRegExp(base, url.origin) : url.origin === expectedOrigin;
		const pathMatches = path instanceof RegExp ? testRegExp(path, rest) : rest === expectedRest;
		return baseMatches && pathMatches;
	};

	return Object.assign((url: URL) => matches(url), {
		base,
		path,
		test: (input: string | URL) => matches(toUrl(input)),
		toString: () =>
			`origin ${expectedOrigin === undefined ? String(base) : JSON.stringify(expectedOrigin)} + path ${
				expectedRest === undefined ? String(path) : JSON.stringify(expectedRest)
			}`,
	});
};

/**
 * The page identity for a base and a path: the resolved URL string when both are strings,
 * otherwise a {@link UrlMatcher}.
 */
export function composeFullUrl(base: string, path: string): string;
export function composeFullUrl(base: string | RegExp, path: string | RegExp): UrlMatcher;
export function composeFullUrl(base: string | RegExp, path: string | RegExp): string | UrlMatcher {
	if (typeof base === "string" && typeof path === "string") {
		return resolveUrl(path, base);
	}
	return createUrlMatcher(base, path);
}
