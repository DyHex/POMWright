/**
 * Deferred seeding of `sessionStorage` for an origin the page is not on.
 *
 * `SessionStorage.seed()` records the entries as pending for the origin in one registry per page. The
 * registry answers the next main-frame navigation that reaches the origin with a writer document, served
 * at the requested URL, whose script stores the entries and then continues the navigation, so the app's
 * first script already sees them. While a seed is pending, main-frame navigations to other origins are
 * fetched by Playwright with redirects disabled so that a server redirect towards the pending origin can
 * be turned into a client-side navigation the route sees; nothing is registered on a page that never
 * seeds, and everything is removed once the last pending seed has been applied.
 *
 * See release-3.0.0/PLAN-1.5-SESSION-STORAGE.md, section 3.2.
 */
import type { APIResponse, Frame, Route } from "@playwright/test";

/** The subset of `Page` the registry uses. A real `Page` satisfies it; unit tests pass a fake. */
export interface SeedPage {
	route(url: (url: URL) => boolean, handler: (route: Route) => Promise<unknown> | unknown): Promise<unknown>;
	unroute(url: (url: URL) => boolean, handler?: (route: Route) => Promise<unknown> | unknown): Promise<unknown>;
	on(event: "framenavigated", listener: (frame: Frame) => void): unknown;
	on(event: "close", listener: () => void): unknown;
	off(event: "framenavigated", listener: (frame: Frame) => void): unknown;
	off(event: "close", listener: () => void): unknown;
	mainFrame(): Frame;
}

/** What the registry needs to know about the running test when the page closes. */
export type TestOutcome = { status: string; errors: readonly unknown[] };

/** Reads the running test's outcome; `undefined` outside a test. `SessionStorage` injects `test.info()`. */
export type ReadTestOutcome = () => TestOutcome | undefined;

/** A seed waiting for the next main-frame navigation to its origin. */
export type PendingSeed = {
	/** Encoded entries, merged across `seed` calls with later values winning per key. */
	entries: Record<string, string>;
	/** Step title of the `seed` call that created the entry, for error messages. */
	title: string;
	/** Stack frames of that `seed` call, so errors raised from listeners point at the test. */
	site: string;
	/** The writer document has been served for `target`. */
	fired: boolean;
	/** The writer document has committed; its own replace request comes next and is let through. */
	committed: boolean;
	/** The URL the writer document was served at. */
	target?: string;
};

/** The origin of a URL, or `undefined` for URLs without one such as `about:blank`. */
export const originOf = (url: string): string | undefined => {
	let origin: string;
	try {
		origin = new URL(url).origin;
	} catch {
		return undefined;
	}
	return origin === "null" ? undefined : origin;
};

/** `request.url()` never carries a fragment while `frame.url()` does; compare them without it. */
export const withoutFragment = (url: string): string => {
	const index = url.indexOf("#");
	return index === -1 ? url : url.slice(0, index);
};

const FORM_URLENCODED = "application/x-www-form-urlencoded";

/** Whether a navigation can be re-issued by a document of POMWright's own: a GET, or a form POST. */
export const reissuable = (method: string, contentType: string | undefined): boolean =>
	method === "GET" || (method === "POST" && (contentType ?? "").toLowerCase().startsWith(FORM_URLENCODED));

/**
 * The registrable domain used for `Sec-Fetch-Site: same-site`, approximated as the last two labels of
 * the host. There is no public suffix list here, so `a.co.uk` and `b.co.uk` count as the same site.
 */
const registrableDomain = (hostname: string): string => {
	const labels = hostname.split(".");
	return labels.length <= 2 ? hostname : labels.slice(-2).join(".");
};

/** The `Sec-Fetch-Site` value the browser would send for a navigation to `url` from `referer`. */
export const secFetchSite = (url: string, referer: string | undefined): string => {
	if (referer === undefined || referer === "") {
		return "none";
	}
	const target = originOf(url);
	const source = originOf(referer);
	if (target === undefined || source === undefined) {
		return "cross-site";
	}
	if (target === source) {
		return "same-origin";
	}
	const a = new URL(target);
	const b = new URL(source);
	return a.protocol === b.protocol && registrableDomain(a.hostname) === registrableDomain(b.hostname)
		? "same-site"
		: "cross-site";
};

/**
 * Headers for the proxied fetch of a navigation: the browser's own, minus the conditional ones (a 304
 * handed to a fulfilled navigation has no body), plus the `Sec-Fetch-*` headers the browser adds after
 * interception and therefore never shows to a route.
 */
export const proxyHeaders = (url: string, requestHeaders: Record<string, string>): Record<string, string> => {
	const headers: Record<string, string> = {};
	for (const [name, value] of Object.entries(requestHeaders)) {
		const lower = name.toLowerCase();
		if (lower !== "if-none-match" && lower !== "if-modified-since") {
			headers[lower] = value;
		}
	}
	headers["sec-fetch-mode"] = "navigate";
	headers["sec-fetch-dest"] = "document";
	headers["sec-fetch-site"] = secFetchSite(url, headers.referer);
	return headers;
};

/** JSON for an inline script: `<` can never close the script and the line separators stay inside the literal. */
export const escapeForScript = (value: unknown): string =>
	JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");

/** UTF-8 so a re-submitted form encodes its fields as the original page did; no referrer, as `page.goto` sends none. */
const HEAD = '<meta charset="utf-8"><meta name="referrer" content="no-referrer">';

const continueScript = (url: string, method: string, postData: string | null): string => {
	if (method === "GET") {
		return `location.replace(${escapeForScript(url)});`;
	}
	return (
		`var form = document.createElement("form"); form.method = "post"; form.acceptCharset = "utf-8"; form.action = ${escapeForScript(url)}; ` +
		`new URLSearchParams(${escapeForScript(postData ?? "")}).forEach(function (value, name) { ` +
		'var input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; ' +
		"form.appendChild(input); }); document.body.appendChild(form); form.submit();"
	);
};

/**
 * The document that answers the hop: stores every entry, then continues the navigation, a GET with
 * `location.replace` and a form POST by re-submitting the same fields. A failed write is rendered into the
 * page under a telling title and the navigation is skipped, so a stalled test explains itself.
 */
export const buildSeedDocument = (
	entries: Record<string, string>,
	url: string,
	method: string,
	postData: string | null,
): string =>
	`<!doctype html>${HEAD}<title>POMWright session storage seed</title><body><script>(function () { ` +
	`var entries = ${escapeForScript(entries)}; ` +
	"try { Object.keys(entries).forEach(function (key) { sessionStorage.setItem(key, entries[key]); }); } " +
	'catch (error) { document.title = "POMWright seed failed"; document.body.textContent = ' +
	'"POMWright could not write sessionStorage for " + location.origin + " (keys: " + Object.keys(entries).join(", ") + "): " + error; return; } ' +
	`${continueScript(url, method, postData)} })();</script></body>`;

/** The document that replaces a server redirect seen by the proxy: performs the same navigation itself. */
export const buildRedirectDocument = (url: string, method: string, postData: string | null): string =>
	`<!doctype html>${HEAD}<title>POMWright redirect</title><body><script>(function () { ${continueScript(
		url,
		method,
		postData,
	)} })();</script></body>`;

const INTERNAL_FRAME = /[\\/]sessionStorage(Seed)?\.(ts|js|mjs|cjs)|[\\/]pomwright[\\/]dist[\\/]index\.(js|mjs|cjs)/;

/** The stack frames of the caller outside POMWright, captured where `seed` is called. */
export const captureCallSite = (): string => {
	const lines = (new Error().stack ?? "").split("\n").slice(1);
	return lines.filter((line) => !INTERNAL_FRAME.test(line)).join("\n");
};

/** Rewrites the stack so the error points at the `seed` call rather than at a listener. */
const atSite = (error: Error, site: string): Error => {
	if (site !== "") {
		error.stack = `${error.name}: ${error.message}\n${site}`;
	}
	return error;
};

const describeKeys = (entries: Record<string, string>): string => Object.keys(entries).join(", ");

export const bypassError = (pending: PendingSeed, origin: string, url: string): Error =>
	atSite(
		new Error(
			`${pending.title}: the page navigated to ${url} but the pending seed for ${origin} was not applied; ` +
				"the navigation was not intercepted: a service worker registered by the app answered it, or a route the " +
				"test registered after seed() fulfilled it; the app ran without the entries. Fixes: set " +
				'use: { serviceWorkers: "block" } in the Playwright config; seed before the app\'s first load in this ' +
				"context; unregister the worker in the test before seeding; or let the test's own route call " +
				"route.fallback() for that navigation",
		),
		pending.site,
	);

export const unsupportedNavigationError = (
	pending: PendingSeed,
	origin: string,
	method: string,
	contentType: string | undefined,
): Error =>
	atSite(
		new Error(
			`${pending.title}: cannot re-issue a ${method} ${contentType ?? "(no content-type)"} navigation to ${origin}; ` +
				`the app loaded without the entries. Only GET and ${FORM_URLENCODED} POST navigations can be seeded`,
		),
		pending.site,
	);

export const proxyFailureError = (pending: PendingSeed, url: string, origin: string, cause: unknown): Error =>
	atSite(
		new Error(`${pending.title}: could not fetch ${url} while a seed for ${origin} was pending`, { cause }),
		pending.site,
	);

export const neverAppliedError = (pendings: readonly (readonly [string, PendingSeed])[]): Error => {
	const [first] = pendings;
	if (first === undefined) {
		throw new Error("neverAppliedError needs at least one pending seed");
	}
	const details = pendings
		.map(([origin, pending]) => `the seed for ${origin} (keys: ${describeKeys(pending.entries)})`)
		.join(" and ");
	return atSite(
		new Error(
			`${first[1].title}: ${details} was never applied: the page closed without navigating there; ` +
				"remove the seed call, or navigate to the origin before the test ends",
		),
		first[1].site,
	);
};

const isRedirect = (status: number): boolean => status >= 300 && status < 400;

/** One per page, shared by every `SessionStorage` on it. See the module comment. */
export class SeedRegistry {
	private readonly pending = new Map<string, PendingSeed>();
	private failure: Error | undefined;
	/** One reference for `route` and `unroute`, which match the URL predicate by identity. */
	private readonly matchAll = (_url: URL): boolean => true;

	constructor(
		private readonly page: SeedPage,
		private readonly readTestOutcome: ReadTestOutcome,
	) {}

	/** Origins with a pending seed, oldest first. */
	get pendingOrigins(): string[] {
		return [...this.pending.keys()];
	}

	/** Throws a failure recorded by the route handler, once. Every helper method calls this first. */
	throwIfFailed(): void {
		if (this.failure !== undefined) {
			const failure = this.failure;
			this.failure = undefined;
			throw failure;
		}
	}

	/** Records entries for `origin`; the first pending seed on the page registers the route and listeners. */
	async add(origin: string, entries: Record<string, string>, title: string, site: string): Promise<void> {
		const first = this.pending.size === 0;
		const existing = this.pending.get(origin);
		if (existing === undefined) {
			this.pending.set(origin, { entries: { ...entries }, title, site, fired: false, committed: false });
		} else {
			Object.assign(existing.entries, entries);
		}
		if (first) {
			this.page.on("framenavigated", this.onNavigated);
			this.page.on("close", this.onClose);
			await this.page.route(this.matchAll, this.handler);
		}
	}

	private readonly handler = async (route: Route): Promise<void> => {
		const request = route.request();
		if (!request.isNavigationRequest() || request.frame() !== this.page.mainFrame()) {
			await route.fallback();
			return;
		}
		const url = request.url();
		const origin = originOf(url);
		if (origin === undefined) {
			await route.fallback();
			return;
		}
		const method = request.method();
		const headers = request.headers();
		const contentType = headers["content-type"];
		const pending = this.pending.get(origin);

		if (pending?.committed === true && url === pending.target) {
			// The writer document's own replace: the seed is applied, let the real navigation through natively.
			this.pending.delete(origin);
			await route.fallback();
			await this.teardownIfIdle();
			return;
		}
		if (pending !== undefined) {
			// The hop itself, or a retry after a hop that was cancelled before the writer committed.
			if (!reissuable(method, contentType)) {
				this.failure = unsupportedNavigationError(pending, origin, method, contentType);
				await route.fallback();
				return;
			}
			pending.fired = true;
			pending.target = url;
			pending.committed = false;
			await route.fulfill({
				contentType: "text/html",
				body: buildSeedDocument(pending.entries, url, method, request.postData()),
			});
			return;
		}

		// Any other main-frame navigation while a seed is pending: fetch it with redirects disabled, so a
		// server redirect towards a pending origin becomes a navigation the route sees.
		let response: APIResponse;
		try {
			response = await route.fetch({ maxRedirects: 0, timeout: 0, headers: proxyHeaders(url, headers) });
		} catch (error) {
			this.failure = proxyFailureError(this.anyPending(), url, this.pendingOrigins.join(", "), error);
			await route.abort("failed");
			return;
		}
		const status = response.status();
		const location = response.headers().location;
		if (isRedirect(status) && location !== undefined) {
			const keepMethod = status === 307 || status === 308;
			if (keepMethod && !reissuable(method, contentType)) {
				await route.fulfill({ response });
				return;
			}
			const target = new URL(location, url).href;
			await route.fulfill({
				contentType: "text/html",
				body: buildRedirectDocument(target, keepMethod ? method : "GET", keepMethod ? request.postData() : null),
			});
			return;
		}
		await route.fulfill({ response });
	};

	private readonly onNavigated = (frame: Frame): void => {
		if (frame !== this.page.mainFrame()) {
			return;
		}
		const url = withoutFragment(frame.url());
		const origin = originOf(url);
		const pending = origin === undefined ? undefined : this.pending.get(origin);
		if (pending === undefined || origin === undefined) {
			return;
		}
		if (!pending.fired || url !== pending.target) {
			const failure = this.failure ?? bypassError(pending, origin, frame.url());
			this.failure = undefined;
			throw failure; // thrown from a page listener: fails the running test at once
		}
		pending.committed = true;
	};

	private readonly onClose = (): void => {
		const outcome = this.readTestOutcome();
		if (outcome === undefined || outcome.status !== "passed" || outcome.errors.length > 0) {
			return;
		}
		if (this.failure !== undefined) {
			const failure = this.failure;
			this.failure = undefined;
			throw failure;
		}
		if (this.pending.size > 0) {
			throw neverAppliedError([...this.pending.entries()]);
		}
	};

	private anyPending(): PendingSeed {
		const first = this.pending.values().next();
		if (first.done === true) {
			throw new Error("SeedRegistry: no pending seed");
		}
		return first.value;
	}

	private async teardownIfIdle(): Promise<void> {
		if (this.pending.size > 0) {
			return;
		}
		await this.page.unroute(this.matchAll, this.handler);
		this.page.off("framenavigated", this.onNavigated);
		this.page.off("close", this.onClose);
	}
}

const registries = new WeakMap<SeedPage, SeedRegistry>();

/** The page's registry, created on first use. */
export const registryFor = (page: SeedPage, readTestOutcome: ReadTestOutcome): SeedRegistry => {
	let registry = registries.get(page);
	if (registry === undefined) {
		registry = new SeedRegistry(page, readTestOutcome);
		registries.set(page, registry);
	}
	return registry;
};

/** The page's registry if a seed was ever recorded on it. */
export const existingRegistryFor = (page: SeedPage): SeedRegistry | undefined => registries.get(page);
