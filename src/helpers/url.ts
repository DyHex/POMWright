/**
 * URL helpers for PageObject navigation.
 *
 * String URLs behave exactly like Playwright's `baseURL` handling: a target is resolved with
 * `new URL(input, baseUrl)`. A string `baseUrl` must be a non-empty origin and a string `urlPath`
 * must be "" or a single-slash path; both are validated by PageObject at construction. When either
 * part is a RegExp the page is identified by a {@link UrlMatcher}, which tests the base against the
 * URL's origin and the path against the rest of the URL, each regex exactly as written.
 *
 * See release-3.0.0/PLAN-1.3-1.4-URL-NAVIGATION.md.
 */

/**
 * Identity of a page object whose `baseUrl` or `urlPath` is a RegExp. Callable as the predicate
 * form accepted by `page.waitForURL`, `expect(page).toHaveURL`, and `page.route`.
 */
export interface UrlMatcher {
	(url: URL): boolean;
	/** The `baseUrl` the page object was constructed with. */
	readonly base: string | RegExp;
	/** The `urlPath` the page object was constructed with. */
	readonly path: string | RegExp;
	/** The same test for a URL string or a `URL` instance. */
	test(url: string | URL): boolean;
	/** Readable form, used in step titles and error messages. */
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
	return url.host !== "" && url.pathname === "/" && url.search === "" && url.hash === "";
};

/** Throws unless `value` is a non-empty origin (`scheme://host[:port]`, optional trailing slash). */
export const assertBaseUrl = (value: string, label: string): void => {
	if (!isOrigin(value)) {
		throw new Error(`${label}: ${BASE_URL_RULE}; received ${JSON.stringify(value)}.`);
	}
};

/** Throws unless `value` is "" or starts with exactly one "/" (a leading "//" would change host). */
export const assertUrlPath = (value: string, label: string): void => {
	if (value !== "" && (!value.startsWith("/") || value.startsWith("//"))) {
		throw new Error(`${label}: urlPath must be "" or start with exactly one "/"; received ${JSON.stringify(value)}.`);
	}
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

const toUrl = (input: string | URL): URL => (typeof input === "string" ? new URL(input) : input);

const testRegExp = (regExp: RegExp, value: string): boolean => {
	regExp.lastIndex = 0;
	return regExp.test(value);
};

/**
 * Builds the matcher for a base and a path. A string base is exact origin equality after URL
 * normalisation; a string path is exact against `pathname + search + hash`, with "" meaning "/".
 * A RegExp base is tested against the origin and a RegExp path against the rest, as written.
 */
export const createUrlMatcher = (base: string | RegExp, path: string | RegExp): UrlMatcher => {
	const expectedOrigin = typeof base === "string" ? new URL(base).origin : undefined;
	const expectedRest = typeof path === "string" ? path || "/" : undefined;

	const matches = (url: URL): boolean => {
		const rest = url.pathname + url.search + url.hash;
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
