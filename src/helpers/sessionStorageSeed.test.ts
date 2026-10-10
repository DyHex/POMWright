import type { APIResponse, Frame, Request, Route } from "@playwright/test";
import { describe, expect, it } from "vitest";
import {
	buildRedirectDocument,
	buildSeedDocument,
	bypassError,
	captureCallSite,
	escapeForScript,
	existingRegistryFor,
	neverAppliedError,
	originOf,
	type PendingSeed,
	proxyHeaders,
	registryFor,
	reissuable,
	type SeedPage,
	SeedRegistry,
	secFetchSite,
	type TestOutcome,
	withoutFragment,
} from "./sessionStorageSeed";

const A = "http://localhost:9000";
const B = "http://127.0.0.1:9000";

describe("originOf", () => {
	it("returns the origin of a URL and undefined for URLs without one", () => {
		expect(originOf(`${A}/path?q=1#h`)).toBe(A);
		expect(originOf("https://App.example:443/x")).toBe("https://app.example");
		expect(originOf("about:blank")).toBeUndefined();
		expect(originOf("")).toBeUndefined();
		expect(originOf("not a url")).toBeUndefined();
		expect(originOf("data:text/html,hi")).toBeUndefined();
	});
});

describe("withoutFragment", () => {
	it("drops a fragment and leaves everything else", () => {
		expect(withoutFragment(`${B}/app?x=1#section`)).toBe(`${B}/app?x=1`);
		expect(withoutFragment(`${B}/app?x=1`)).toBe(`${B}/app?x=1`);
		expect(withoutFragment(`${B}/#`)).toBe(`${B}/`);
	});
});

describe("reissuable", () => {
	it("accepts GET and form-urlencoded POST, nothing else", () => {
		expect(reissuable("GET", undefined)).toBe(true);
		expect(reissuable("POST", "application/x-www-form-urlencoded")).toBe(true);
		expect(reissuable("POST", "Application/X-WWW-Form-Urlencoded; charset=UTF-8")).toBe(true);
		expect(reissuable("POST", "multipart/form-data; boundary=x")).toBe(false);
		expect(reissuable("POST", "text/plain")).toBe(false);
		expect(reissuable("POST", undefined)).toBe(false);
		expect(reissuable("PUT", "application/x-www-form-urlencoded")).toBe(false);
	});
});

describe("secFetchSite and proxyHeaders", () => {
	it("computes the site relation from the referrer", () => {
		expect(secFetchSite(`${A}/x`, undefined)).toBe("none");
		expect(secFetchSite(`${A}/x`, "")).toBe("none");
		expect(secFetchSite(`${A}/x`, `${A}/y`)).toBe("same-origin");
		expect(secFetchSite("https://b.app.example/x", "https://a.app.example/y")).toBe("same-site");
		expect(secFetchSite("https://app.example/x", "https://other.example/y")).toBe("cross-site");
		expect(secFetchSite("http://app.example/x", "https://app.example/y")).toBe("cross-site");
		expect(secFetchSite(`${B}/x`, `${A}/y`)).toBe("cross-site");
	});

	it("drops the conditional headers, keeps the rest lower-cased, and adds the Sec-Fetch headers", () => {
		const headers = proxyHeaders(`${A}/dashboard`, {
			"User-Agent": "ua",
			Referer: `${A}/`,
			"If-None-Match": '"v1"',
			"If-Modified-Since": "yesterday",
			cookie: "a=1",
		});
		expect(headers).toEqual({
			"user-agent": "ua",
			referer: `${A}/`,
			cookie: "a=1",
			"sec-fetch-mode": "navigate",
			"sec-fetch-dest": "document",
			"sec-fetch-site": "same-origin",
		});
	});
});

describe("escapeForScript", () => {
	it("keeps every character inside the literal, including </script> and the line separators", () => {
		const escaped = escapeForScript({ k: "</script><b>\u2028\u2029" });
		expect(escaped).not.toContain("<");
		expect(escaped).not.toContain("\u2028");
		expect(escaped).toBe('{"k":"\\u003c/script>\\u003cb>\\u2028\\u2029"}');
		expect(JSON.parse(escaped)).toEqual({ k: "</script><b>\u2028\u2029" });
	});
});

describe("buildSeedDocument", () => {
	const entries = { token: "abc", user: '{"name":"Ada"}', empty: "", tricky: "</script>" };

	it("stores every entry inside a try, then replaces itself with the URL for a GET", () => {
		const html = buildSeedDocument(entries, `${B}/app?x=1`, "GET", null);
		expect(
			html.startsWith(
				'<!doctype html><meta name="referrer" content="no-referrer"><title>POMWright session storage seed</title>',
			),
		).toBe(true);
		expect(html).toContain(`var entries = ${escapeForScript(entries)};`);
		expect(html.indexOf("sessionStorage.setItem")).toBeLessThan(html.indexOf("location.replace"));
		expect(html).toContain(
			"try { Object.keys(entries).forEach(function (key) { sessionStorage.setItem(key, entries[key]); }); }",
		);
		expect(html).toContain('document.title = "POMWright seed failed"');
		expect(html).toContain("return; }");
		expect(html).toContain(`location.replace(${JSON.stringify(`${B}/app?x=1`)});`);
		expect(html).not.toContain("</script><b>");
		expect(html.match(/<\/script>/g)).toHaveLength(1);
	});

	it("re-submits a form with one hidden input per field for a POST", () => {
		const html = buildSeedDocument(
			entries,
			`${B}/app`,
			"POST",
			"SAMLResponse=xyz&RelayState=r+s%26t&empty=&dup=1&dup=2",
		);
		expect(html).toContain('form.method = "post"');
		expect(html).toContain(`form.action = ${JSON.stringify(`${B}/app`)}`);
		expect(html).toContain('new URLSearchParams("SAMLResponse=xyz&RelayState=r+s%26t&empty=&dup=1&dup=2").forEach');
		expect(html).toContain('input.type = "hidden"');
		expect(html).toContain("form.submit();");
		expect(html).not.toContain("location.replace");
	});
});

describe("buildRedirectDocument", () => {
	it("performs the navigation without storing anything", () => {
		const get = buildRedirectDocument(`${B}/app`, "GET", null);
		expect(get).toContain('<meta name="referrer" content="no-referrer">');
		expect(get).toContain("<title>POMWright redirect</title>");
		expect(get).toContain(`location.replace(${JSON.stringify(`${B}/app`)});`);
		expect(get).not.toContain("sessionStorage");
		const post = buildRedirectDocument(`${B}/app`, "POST", "a=1");
		expect(post).toContain('form.method = "post"');
		expect(post).toContain('new URLSearchParams("a=1")');
	});
});

describe("captureCallSite", () => {
	it("keeps the caller's frames and drops POMWright's own", () => {
		const site = captureCallSite();
		expect(site).toContain("sessionStorageSeed.test.ts");
		expect(site).not.toMatch(/[\\/]sessionStorageSeed\.ts/);
		expect(site).not.toMatch(/[\\/]sessionStorage\.ts/);
	});
});

// ---------------------------------------------------------------------------------------------------
// The registry, driven by a fake page.

type RouteCalls = {
	fulfill: Record<string, unknown>[];
	fallback: number;
	abort: string[];
	fetch: Record<string, unknown>[];
};

const frame = (url: string): Frame & { current: string } => {
	const f = { current: url, url: () => f.current } as unknown as Frame & { current: string };
	return f;
};

const fakePage = () => {
	const main = frame("about:blank");
	const routes: { url: (url: URL) => boolean; handler: (route: Route) => Promise<unknown> | unknown }[] = [];
	const listeners: { event: string; listener: unknown }[] = [];
	const page = {
		main,
		routes,
		listeners,
		route: async (url: (url: URL) => boolean, handler: (route: Route) => Promise<unknown> | unknown) => {
			routes.push({ url, handler });
		},
		unroute: async (url: (url: URL) => boolean, handler?: (route: Route) => Promise<unknown> | unknown) => {
			for (let i = routes.length - 1; i >= 0; i--) {
				const r = routes[i];
				if (r !== undefined && r.url === url && (handler === undefined || r.handler === handler)) {
					routes.splice(i, 1);
				}
			}
		},
		on: (event: string, listener: unknown) => {
			listeners.push({ event, listener });
		},
		off: (event: string, listener: unknown) => {
			const index = listeners.findIndex((l) => l.event === event && l.listener === listener);
			if (index !== -1) {
				listeners.splice(index, 1);
			}
		},
		mainFrame: () => main,
		/** Dispatches a request through the registered route handlers, last registered first. */
		dispatch: async (route: Route) => {
			for (const r of [...routes].reverse()) {
				await r.handler(route);
			}
		},
		/** Emits framenavigated for `f` (the main frame by default) after moving it to `url`. */
		navigate: (url: string, f: Frame & { current: string } = main) => {
			f.current = url;
			for (const l of listeners.filter((x) => x.event === "framenavigated")) {
				(l.listener as (frame: Frame) => void)(f);
			}
		},
		close: () => {
			for (const l of listeners.filter((x) => x.event === "close")) {
				(l.listener as () => void)();
			}
		},
	};
	return page satisfies SeedPage;
};

const fakeRequest = (options: {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	postData?: string | null;
	navigation?: boolean;
	frame?: Frame;
}): Request =>
	({
		url: () => options.url,
		method: () => options.method ?? "GET",
		headers: () => options.headers ?? {},
		postData: () => options.postData ?? null,
		isNavigationRequest: () => options.navigation ?? true,
		frame: () => options.frame,
	}) as unknown as Request;

const fakeResponse = (status: number, headers: Record<string, string> = {}): APIResponse =>
	({ status: () => status, headers: () => headers }) as unknown as APIResponse;

const fakeRoute = (request: Request, fetch?: () => Promise<APIResponse>) => {
	const calls: RouteCalls = { fulfill: [], fallback: 0, abort: [], fetch: [] };
	const route = {
		request: () => request,
		fulfill: async (options: Record<string, unknown>) => {
			calls.fulfill.push(options);
		},
		fallback: async () => {
			calls.fallback++;
		},
		abort: async (code: string) => {
			calls.abort.push(code);
		},
		fetch: async (options: Record<string, unknown>) => {
			calls.fetch.push(options);
			if (fetch === undefined) {
				throw new Error("network down");
			}
			return fetch();
		},
	} as unknown as Route;
	return { route, calls };
};

const passed: TestOutcome = { status: "passed", errors: [] };
const site = "    at Object.<anonymous> (/suite/tests/login.spec.ts:12:34)";
const title = "Login.SessionStorage.seed";

const setup = (outcome: () => TestOutcome | undefined = () => passed) => {
	const page = fakePage();
	const registry = new SeedRegistry(page, outcome);
	return { page, registry };
};

describe("SeedRegistry", () => {
	it("registers the route and both listeners once, merges later entries per origin, and adds nothing for a second origin", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1", keep: "k" }, title, site);
		expect(page.routes).toHaveLength(1);
		expect(page.listeners.map((l) => l.event)).toEqual(["framenavigated", "close"]);
		await registry.add(B, { token: "2" }, title, site);
		await registry.add("http://127.0.0.2:9000", { other: "x" }, title, site);
		expect(page.routes).toHaveLength(1);
		expect(page.listeners).toHaveLength(2);
		expect(registry.pendingOrigins).toEqual([B, "http://127.0.0.2:9000"]);
		const { route, calls } = fakeRoute(fakeRequest({ url: `${B}/app`, frame: page.main }));
		await page.dispatch(route);
		expect(calls.fulfill).toHaveLength(1);
		expect(String(calls.fulfill[0]?.body)).toContain(escapeForScript({ token: "2", keep: "k" }));
	});

	it("lets non-navigation and sub-frame requests fall back without touching the seed", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1" }, title, site);
		const sub = frame(`${B}/frame`);
		const cases = [
			fakeRoute(fakeRequest({ url: `${B}/api`, navigation: false, frame: page.main })),
			fakeRoute(fakeRequest({ url: `${B}/frame`, frame: sub })),
			fakeRoute(fakeRequest({ url: "data:text/html,x", frame: page.main })),
		];
		for (const { route, calls } of cases) {
			await page.dispatch(route);
			expect(calls.fallback).toBe(1);
			expect(calls.fulfill).toHaveLength(0);
			expect(calls.fetch).toHaveLength(0);
		}
		// a sub-frame commit at the pending origin is not a bypass
		expect(() => page.navigate(`${B}/frame`, sub)).not.toThrow();
		expect(registry.pendingOrigins).toEqual([B]);
	});

	it("answers the hop with the writer document, answers again before a commit, and clears on the writer's replace", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1" }, title, site);
		const hop = fakeRoute(fakeRequest({ url: `${B}/app?x=1`, frame: page.main, headers: { referer: `${A}/` } }));
		await page.dispatch(hop.route);
		expect(hop.calls.fulfill).toEqual([
			{ contentType: "text/html", body: buildSeedDocument({ token: "1" }, `${B}/app?x=1`, "GET", null) },
		]);
		expect(registry.pendingOrigins).toEqual([B]);
		// a retry before any commit (the first hop was cancelled) is answered again
		const retry = fakeRoute(fakeRequest({ url: `${B}/app?x=1`, frame: page.main }));
		await page.dispatch(retry.route);
		expect(retry.calls.fulfill).toHaveLength(1);
		// the writer commits at the target, fragment ignored, then issues its replace, which goes through natively
		expect(() => page.navigate(`${B}/app?x=1#section`)).not.toThrow();
		expect(registry.pendingOrigins).toEqual([B]);
		const replace = fakeRoute(fakeRequest({ url: `${B}/app?x=1`, frame: page.main }));
		await page.dispatch(replace.route);
		expect(replace.calls.fallback).toBe(1);
		expect(replace.calls.fulfill).toHaveLength(0);
		expect(registry.pendingOrigins).toEqual([]);
		expect(page.routes).toHaveLength(0);
		expect(page.listeners).toHaveLength(0);
		// the real document's commit finds nothing pending
		expect(() => page.navigate(`${B}/app?x=1`)).not.toThrow();
	});

	it("keeps the route while another origin is still pending", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1" }, title, site);
		await registry.add("http://127.0.0.2:9000", { other: "x" }, title, site);
		await page.dispatch(fakeRoute(fakeRequest({ url: `${B}/app`, frame: page.main })).route);
		page.navigate(`${B}/app`);
		await page.dispatch(fakeRoute(fakeRequest({ url: `${B}/app`, frame: page.main })).route);
		expect(registry.pendingOrigins).toEqual(["http://127.0.0.2:9000"]);
		expect(page.routes).toHaveLength(1);
		expect(page.listeners).toHaveLength(2);
	});

	it("reports a commit at the pending origin that the route never served as a bypass, pointing at the seed call", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1", user: "u" }, title, site);
		let error: Error | undefined;
		try {
			page.navigate(`${B}/orders`);
		} catch (e) {
			error = e as Error;
		}
		expect(error?.message).toBe(
			`${title}: the page navigated to ${B}/orders but the pending seed for ${B} was not applied; the navigation was not intercepted: a service worker registered by the app answered it, or a route the test registered after seed() fulfilled it; the app ran without the entries. Fixes: set use: { serviceWorkers: "block" } in the Playwright config; seed before the app's first load in this context; unregister the worker in the test before seeding; or let the test's own route call route.fallback() for that navigation`,
		);
		expect(error?.stack).toBe(`Error: ${error?.message}\n${site}`);
	});

	it("reports a commit at another URL of the origin after the writer was served as a bypass", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1" }, title, site);
		await page.dispatch(fakeRoute(fakeRequest({ url: `${B}/app`, frame: page.main })).route);
		expect(() => page.navigate(`${B}/elsewhere`)).toThrow(
			/pending seed for http:\/\/127\.0\.0\.1:9000 was not applied/,
		);
	});

	it("records an unsupported navigation, lets it through, and reports it on the commit, by the next call, or at close", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1" }, title, site);
		const { route, calls } = fakeRoute(
			fakeRequest({
				url: `${B}/app`,
				method: "POST",
				headers: { "content-type": "multipart/form-data; boundary=x" },
				frame: page.main,
			}),
		);
		await page.dispatch(route);
		expect(calls.fallback).toBe(1);
		expect(calls.fulfill).toHaveLength(0);
		const message = `${title}: cannot re-issue a POST multipart/form-data; boundary=x navigation to ${B}; the app loaded without the entries. Only GET and application/x-www-form-urlencoded POST navigations can be seeded`;
		expect(() => page.navigate(`${B}/app`)).toThrow(message);
		// reported once: the commit consumed it
		expect(() => registry.throwIfFailed()).not.toThrow();

		const again = setup();
		await again.registry.add(B, { token: "1" }, title, site);
		await again.page.dispatch(
			fakeRoute(
				fakeRequest({
					url: `${B}/app`,
					method: "POST",
					headers: { "content-type": "text/plain" },
					frame: again.page.main,
				}),
			).route,
		);
		expect(() => again.registry.throwIfFailed()).toThrow(/cannot re-issue a POST text\/plain navigation/);
		expect(() => again.registry.throwIfFailed()).not.toThrow();

		const atClose = setup();
		await atClose.registry.add(B, { token: "1" }, title, site);
		await atClose.page.dispatch(
			fakeRoute(
				fakeRequest({
					url: `${B}/app`,
					method: "POST",
					headers: { "content-type": "text/plain" },
					frame: atClose.page.main,
				}),
			).route,
		);
		expect(() => atClose.page.close()).toThrow(/cannot re-issue a POST text\/plain navigation/);
	});

	describe("proxy while pending", () => {
		it("fetches other main-frame navigations with redirects disabled, no fetch timeout, and the proxy headers", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			const response = fakeResponse(200, { "content-type": "text/html" });
			const { route, calls } = fakeRoute(
				fakeRequest({
					url: `${A}/dashboard`,
					headers: { referer: `${A}/`, "if-none-match": '"v1"' },
					frame: page.main,
				}),
				async () => response,
			);
			await page.dispatch(route);
			expect(calls.fetch).toEqual([
				{
					maxRedirects: 0,
					timeout: 0,
					headers: {
						referer: `${A}/`,
						"sec-fetch-mode": "navigate",
						"sec-fetch-dest": "document",
						"sec-fetch-site": "same-origin",
					},
				},
			]);
			expect(calls.fulfill).toEqual([{ response }]);
			expect(calls.fallback).toBe(0);
		});

		it("turns a 301, 302 or 303 into a GET navigation document", async () => {
			for (const status of [301, 302, 303]) {
				const { page, registry } = setup();
				await registry.add(B, { token: "1" }, title, site);
				const { route, calls } = fakeRoute(
					fakeRequest({
						url: `${A}/login`,
						method: "POST",
						headers: { "content-type": "application/x-www-form-urlencoded" },
						postData: "u=x",
						frame: page.main,
					}),
					async () => fakeResponse(status, { location: "/next?via=redirect" }),
				);
				await page.dispatch(route);
				expect(calls.fulfill).toEqual([
					{ contentType: "text/html", body: buildRedirectDocument(`${A}/next?via=redirect`, "GET", null) },
				]);
			}
		});

		it("keeps method and body for a 307 or 308 form POST, and lets a 307 of another POST through natively", async () => {
			for (const status of [307, 308]) {
				const { page, registry } = setup();
				await registry.add(B, { token: "1" }, title, site);
				const { route, calls } = fakeRoute(
					fakeRequest({
						url: `${A}/login`,
						method: "POST",
						headers: { "content-type": "application/x-www-form-urlencoded" },
						postData: "u=x",
						frame: page.main,
					}),
					async () => fakeResponse(status, { location: `${B}/app` }),
				);
				await page.dispatch(route);
				expect(calls.fulfill).toEqual([
					{ contentType: "text/html", body: buildRedirectDocument(`${B}/app`, "POST", "u=x") },
				]);
			}
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			const native = fakeResponse(307, { location: `${B}/app` });
			const { route, calls } = fakeRoute(
				fakeRequest({
					url: `${A}/upload`,
					method: "POST",
					headers: { "content-type": "multipart/form-data; boundary=x" },
					frame: page.main,
				}),
				async () => native,
			);
			await page.dispatch(route);
			expect(calls.fulfill).toEqual([{ response: native }]);
		});

		it("aborts the navigation when the fetch fails and reports it by the next call", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			const { route, calls } = fakeRoute(fakeRequest({ url: `${A}/dashboard`, frame: page.main }));
			await page.dispatch(route);
			expect(calls.abort).toEqual(["failed"]);
			let error: Error | undefined;
			try {
				registry.throwIfFailed();
			} catch (e) {
				error = e as Error;
			}
			expect(error?.message).toBe(`${title}: could not fetch ${A}/dashboard while a seed for ${B} was pending`);
			expect(error?.cause).toEqual(new Error("network down"));
			expect(error?.stack).toContain(site);
		});
	});

	describe("page close", () => {
		it("fails a passing test when a seed was never applied, naming origins and keys and pointing at the seed call", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1", user: "u" }, title, site);
			await registry.add("http://127.0.0.2:9000", { other: "x" }, "Other.SessionStorage.seed", site);
			let error: Error | undefined;
			try {
				page.close();
			} catch (e) {
				error = e as Error;
			}
			expect(error?.message).toBe(
				`${title}: the seed for ${B} (keys: token, user) and the seed for http://127.0.0.2:9000 (keys: other) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends`,
			);
			expect(error?.stack).toBe(`Error: ${error?.message}\n${site}`);
		});

		it("stays quiet when the test did not pass, already has errors, or is not running", async () => {
			for (const outcome of [
				(): TestOutcome | undefined => ({ status: "failed", errors: [new Error("own")] }),
				(): TestOutcome | undefined => ({ status: "timedOut", errors: [] }),
				(): TestOutcome | undefined => ({ status: "skipped", errors: [] }),
				(): TestOutcome | undefined => ({ status: "passed", errors: [new Error("soft")] }),
				(): TestOutcome | undefined => undefined,
			]) {
				const { page, registry } = setup(outcome);
				await registry.add(B, { token: "1" }, title, site);
				expect(() => page.close()).not.toThrow();
			}
		});

		it("stays quiet when every seed was applied", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			await page.dispatch(fakeRoute(fakeRequest({ url: `${B}/app`, frame: page.main })).route);
			page.navigate(`${B}/app`);
			await page.dispatch(fakeRoute(fakeRequest({ url: `${B}/app`, frame: page.main })).route);
			expect(() => page.close()).not.toThrow();
		});
	});

	it("is shared per page and created on first use", () => {
		const page = fakePage();
		expect(existingRegistryFor(page)).toBeUndefined();
		const registry = registryFor(page, () => passed);
		expect(registryFor(page, () => passed)).toBe(registry);
		expect(existingRegistryFor(page)).toBe(registry);
		expect(existingRegistryFor(fakePage())).toBeUndefined();
	});
});

describe("error builders", () => {
	const pending: PendingSeed = { entries: { token: "1" }, title, site, fired: false, committed: false };

	it("carry the seed call site as their stack", () => {
		expect(bypassError(pending, B, `${B}/x`).stack).toBe(
			`Error: ${bypassError(pending, B, `${B}/x`).message}\n${site}`,
		);
		expect(neverAppliedError([[B, pending]]).stack).toContain(site);
	});

	it("leave the stack alone when no site was captured", () => {
		const error = bypassError({ ...pending, site: "" }, B, `${B}/x`);
		expect(error.stack).toContain("sessionStorageSeed");
	});
});
