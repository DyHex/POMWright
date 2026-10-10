import { expect, test } from "@fixtures/testApp.fixtures";
import type { User } from "@page-object-models/testApp/pages/teststorage/teststorage.locatorSchema";
import type TestStorage from "@page-object-models/testApp/pages/teststorage/teststorage.page";
import type { Page, Route } from "@playwright/test";
import { PageObject, SessionStorage } from "pomwright";

const A = "http://localhost:9000";
const B = "http://127.0.0.1:9000";
const user: User = { name: "Ada", age: 36 };
const userJson = JSON.stringify(user);

// The fixture page renders what its first script saw (#startup), the current entries (#current), the
// request method and posted fields, the Referer and Sec-Fetch headers the server received, and who
// served the document. Locators auto-wait, so a read right after a navigation lands on the real page.
const readJson = async (page: Page, id: string) => JSON.parse((await page.locator(`#${id}`).textContent()) ?? "null");
const startup = (page: Page) => readJson(page, "startup");
const current = (page: Page) => readJson(page, "current");
const headers = (page: Page) => readJson(page, "headers");
const servedBy = (page: Page) => page.locator("#served-by").textContent();
const onSecondOrigin = (url: URL) => url.origin === B && url.pathname === "/teststorage";
const storedItem = (page: Page, key: string) => page.evaluate((k) => sessionStorage.getItem(k), key);

test.describe("set, get and clear", () => {
	test("set stores strings as given and declared keys through their codec; the app reads them raw", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set({ token: "abc", user });
		await testStorage.sessionStorage.set("theme", "dark");

		expect(await storedItem(page, "token")).toBe("abc");
		expect(await storedItem(page, "theme")).toBe("dark");
		expect(await storedItem(page, "user")).toBe(userJson);
		expect(await testStorage.sessionStorage.get("user")).toEqual(user);
		expect(await testStorage.sessionStorage.get("token")).toBe("abc");

		await page.reload();
		expect(await current(page)).toEqual({ token: "abc", theme: "dark", user: userJson });
	});

	test("a JSON string for an undeclared key is stored verbatim and read back as a string", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set({ raw: userJson });

		expect(await storedItem(page, "raw")).toBe(userJson);
		expect(await testStorage.sessionStorage.get("raw")).toBe(userJson);
	});

	test("an empty string survives, a missing key is null, a computed empty list reads nothing, and get() decodes declared keys", async ({
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set({ empty: "" });

		expect(await testStorage.sessionStorage.get("empty")).toBe("");
		expect(await testStorage.sessionStorage.get(["empty", "missing"])).toEqual({ empty: "", missing: null });
		const none: string[] = [];
		expect(await testStorage.sessionStorage.get(none)).toEqual({});

		await testStorage.sessionStorage.set({ user, token: "abc" });
		expect(await testStorage.sessionStorage.get()).toEqual({ empty: "", user, token: "abc" });
	});

	test("clear removes everything, one key, or a list; a computed empty list removes nothing", async ({ testStorage }) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set({ a: "1", b: "2", c: "3" });

		await testStorage.sessionStorage.clear("a");
		expect(await testStorage.sessionStorage.get(["a", "b", "c"])).toEqual({ a: null, b: "2", c: "3" });
		await testStorage.sessionStorage.clear(["b"]);
		const none: string[] = [];
		await testStorage.sessionStorage.clear(none);
		expect(await testStorage.sessionStorage.get()).toEqual({ c: "3" });
		await testStorage.sessionStorage.clear();
		expect(await testStorage.sessionStorage.get()).toEqual({});
	});

	test("on a page without an origin every method fails at once, naming the label and the method", async ({
		context,
	}) => {
		const fresh = await context.newPage();
		const storage = new SessionStorage(fresh, { label: "Fresh" });

		await expect(storage.set({ token: "abc" })).rejects.toThrow(
			"Fresh.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()",
		);
		await expect(storage.get()).rejects.toThrow("Fresh.SessionStorage.get: the page has no origin yet (about:blank)");
		await expect(storage.clear()).rejects.toThrow("Fresh.SessionStorage.clear: the page has no origin yet (about:blank)");
	});

	test("a page object's helper refuses another origin, naming both; a standalone helper follows the page", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorageSecond.navigation.goto();

		await expect(testStorage.sessionStorage.get()).rejects.toThrow(
			`TestStorage.SessionStorage.get: the page is on ${B}, not on this page object's origin ${A}; ` +
				"another origin's sessionStorage is reachable only from a document on it. " +
				`Use the page object for ${B}, or a standalone SessionStorage without an origin`,
		);
		await expect(testStorage.sessionStorage.set({ token: "x" })).rejects.toThrow(
			/^TestStorage\.SessionStorage\.set: the page is on/,
		);
		await expect(testStorage.sessionStorage.clear()).rejects.toThrow(/^TestStorage\.SessionStorage\.clear: the page is on/);

		await testStorageSecond.sessionStorage.set({ token: "on-b" });
		expect(await testStorageSecond.sessionStorage.get("token")).toBe("on-b");
		const standalone = new SessionStorage(page);
		expect(await standalone.get("token")).toBe("on-b");

		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set({ token: "on-a" });
		expect(await standalone.get("token")).toBe("on-a");
		await expect(testStorageSecond.sessionStorage.get()).rejects.toThrow(
			/^TestStorageSecond\.SessionStorage\.get: the page is on http:\/\/localhost:9000, not on this page object's origin http:\/\/127\.0\.0\.1:9000/,
		);
	});

	test("codec failures name the key: a stored value that is not valid JSON, and an object for an undeclared key", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await page.evaluate(() => sessionStorage.setItem("user", "{not json"));

		await expect(testStorage.sessionStorage.get("user")).rejects.toThrow(
			'TestStorage.SessionStorage.get: value for "user" could not be decoded: {not json',
		);
		await expect(testStorage.sessionStorage.set({ other: { x: 1 } as unknown as string })).rejects.toThrow(
			'TestStorage.SessionStorage.set: value for "other" is not a string and no codec is declared for it',
		);
	});
});

test.describe("seed", () => {
	test("seed then goto on a fresh page: nothing happens until the navigation, and the app's first script sees the entries", async ({
		page,
		testStorage,
	}) => {
		const navigations: string[] = [];
		page.on("request", (request) => {
			if (request.isNavigationRequest()) {
				navigations.push(request.url());
			}
		});

		await testStorage.sessionStorage.seed({ token: "abc", user });
		expect(page.url()).toBe("about:blank");
		expect(navigations).toEqual([]);

		await testStorage.navigation.goto();
		expect(await servedBy(page)).toBe("server");
		expect(await startup(page)).toEqual({ token: "abc", user: userJson });
	});

	test("seed while already on the origin writes at once; the app sees the values on its next load", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.seed({ token: "abc" });

		expect(page.url()).toBe(testStorage.fullUrl);
		expect(await testStorage.sessionStorage.get("token")).toBe("abc");
		expect(await current(page)).toEqual({});
		await page.reload();
		expect(await startup(page)).toEqual({ token: "abc" });
	});

	const posted = {
		plain: "simple",
		spaces: "a b c",
		amp: "x&y",
		eq: "k=v",
		plus: "1+1",
		percent: "100%",
		unicode: "åæø 🚀",
		dup: ["1", "2"],
		empty: "",
	};
	const hops: {
		name: string;
		trigger: (poc: TestStorage) => Promise<void>;
		url: string;
		method: "GET" | "POST";
		posted?: Record<string, unknown>;
	}[] = [
		{ name: "link", trigger: (p) => p.getLocator("body.link@toSecondOrigin").click(), url: `${B}/teststorage?hop=link`, method: "GET" },
		{ name: "script redirect", trigger: (p) => p.getLocator("body.button@scriptToSecondOrigin").click(), url: `${B}/teststorage?hop=script`, method: "GET" },
		{ name: "meta refresh", trigger: (p) => p.getLocator("body.button@metaToSecondOrigin").click(), url: `${B}/teststorage?hop=meta`, method: "GET" },
		{ name: "form POST", trigger: (p) => p.getLocator("body.button@submitToSecondOrigin").click(), url: `${B}/teststorage`, method: "POST", posted },
		{ name: "server 302", trigger: (p) => p.getLocator("body.link@redirect302").click(), url: `${B}/teststorage?hop=302`, method: "GET" },
		{ name: "POST then 303", trigger: (p) => p.getLocator("body.button@submit303").click(), url: `${B}/teststorage?hop=303`, method: "GET" },
		{ name: "POST then 307", trigger: (p) => p.getLocator("body.button@submit307").click(), url: `${B}/teststorage?hop=307`, method: "POST", posted: { u: "x y" } },
		{ name: "two-hop redirect chain", trigger: (p) => p.getLocator("body.link@chain").click(), url: `${B}/teststorage?hop=chain`, method: "GET" },
	];
	for (const hop of hops) {
		test(`a seed for the second origin is applied on a hop by ${hop.name}`, async ({ page, testStorage, testStorageSecond }) => {
			await testStorage.navigation.goto();
			await testStorageSecond.sessionStorage.seed({ token: "from-A", user });
			expect(page.url()).toBe(testStorage.fullUrl);

			await hop.trigger(testStorage);
			await page.waitForURL(onSecondOrigin);

			expect(await servedBy(page)).toBe("server");
			expect(await startup(page)).toEqual({ token: "from-A", user: userJson });
			expect(page.url()).toBe(hop.url);
			await expect(page.locator("#method")).toHaveText(hop.method);
			if (hop.posted !== undefined) {
				expect(await readJson(page, "posted")).toEqual(hop.posted);
			}
			const received = await headers(page);
			expect(received.referer).toBeNull();
			expect(received["sec-fetch-site"]).toBe("same-origin");
		});
	}

	test("after a seeded link hop, history grew by one and goBack lands on the first origin", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		const before = await page.evaluate(() => history.length);
		await testStorageSecond.sessionStorage.seed({ token: "abc" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "abc" });
		expect(await page.evaluate(() => history.length)).toBe(before + 1);

		await page.goBack();
		expect(page.url()).toBe(testStorage.fullUrl);
	});

	test("the proxy exists only while a seed is pending", async ({ page, testStorage }) => {
		// A whole-page mock registered before the seed is the indicator: a proxied navigation performs the real
		// request and never reaches it, a native navigation is answered by it.
		const secondPage = (url: URL) => url.href === `${A}/teststorage?second=1`;
		await page.route(secondPage, (route) =>
			route.fulfill({ contentType: "text/html", body: '<!doctype html><title>mocked</title><pre id="served-by">mock</pre>' }),
		);

		// no seed: native, so the mock answers; a native 302 hop carries the browser's own Sec-Fetch-Site
		await testStorage.navigation.goto();
		await testStorage.getLocator("body.link@sameOrigin").click();
		await page.waitForURL(secondPage);
		expect(await servedBy(page)).toBe("mock");
		await testStorage.navigation.goto();
		await testStorage.getLocator("body.link@redirect302").click();
		await page.waitForURL(onSecondOrigin);
		expect((await headers(page))["sec-fetch-site"]).toBe("cross-site");

		// pending: the same navigation is proxied, so the real page loads with the synthesised headers
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.seed({ token: "x" }, { origin: B });
		await testStorage.getLocator("body.link@sameOrigin").click();
		await page.waitForURL(secondPage);
		expect(await servedBy(page)).toBe("server");
		expect((await headers(page))["sec-fetch-site"]).toBe("same-origin");

		// the hop applies the seed; afterwards the mock answers again
		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "x" });
		await page.goto(`${A}/teststorage?second=1`);
		expect(await servedBy(page)).toBe("mock");
	});

	test("sub-resource requests and iframes pass through while a seed is pending, and the seed still fires", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto("/teststorage?frames=1");
		await testStorageSecond.sessionStorage.seed({ token: "from-A" });

		expect(await page.evaluate((url) => fetch(url).then((r) => r.json()), `${B}/teststorage/api`)).toEqual({ ok: true });
		const secondFrame = page.frames().find((frame) => frame.url().startsWith(`${B}/teststorage/frame`));
		expect(secondFrame).toBeDefined();
		await secondFrame?.goto(`${B}/teststorage/frame?again=1`);
		await expect(secondFrame?.locator("#frame-startup") ?? page.locator("#never")).toHaveText("{}");

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "from-A" });
	});

	test("seeds for one origin merge across calls and across helpers on the same page; one document is served per hop", async ({
		page,
		testStorage,
		testStorageTwin,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		const served: string[] = [];
		page.on("response", (response) => {
			if (
				response.request().isNavigationRequest() &&
				response.url().startsWith(B) &&
				response.headers()["x-served-by"] === "server"
			) {
				served.push(response.url());
			}
		});

		await testStorageSecond.sessionStorage.seed({ token: "first", keep: "yes" });
		await testStorageSecond.sessionStorage.seed({ token: "second" });
		await testStorageTwin.sessionStorage.seed({ twin: "x" }, { origin: B });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "second", keep: "yes", twin: "x" });
		expect(served).toEqual([`${B}/teststorage?hop=link`]);
	});

	test("seeding both origins first: each first script sees only its own entries, and the first origin keeps its state on return", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorageSecond.sessionStorage.seed({ who: "B" });
		await testStorage.sessionStorage.seed({ who: "A" });

		await testStorage.navigation.goto();
		expect(await startup(page)).toEqual({ who: "A" });
		await testStorage.sessionStorage.set({ work: "done-on-A" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ who: "B" });

		await testStorage.navigation.goto();
		expect(await startup(page)).toEqual({ who: "A", work: "done-on-A" });
	});

	for (const [name, query] of [
		["Cross-Origin-Opener-Policy", "coop=1"],
		["COOP and Cross-Origin-Embedder-Policy", "coop=1&coep=1"],
	] as const) {
		test(`entries survive loading the app with ${name}`, async ({ page, testStorage }) => {
			await testStorage.sessionStorage.seed({ token: "abc" });
			await testStorage.navigation.goto(`/teststorage?${query}`);
			expect(await startup(page)).toEqual({ token: "abc" });
		});
	}

	test("a seed that is never applied fails the test when the page closes", async ({ testStorage, testStorageSecond }) => {
		test.fail(true, "the never-applied seed must fail this test at close");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "never" });
	});

	test("a hop that opens a new tab cannot be seeded: the popup has its own storage and the seed stays pending", async ({
		context,
		testStorage,
		testStorageSecond,
	}) => {
		test.fail(true, "the seed stays pending on the original page and fails this test at close");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "never" });

		const popupPromise = context.waitForEvent("page");
		await testStorage.getLocator("body.link@popup").click();
		const popup = await popupPromise;
		expect(await startup(popup)).toEqual({});
	});

	test("a proxy failure is reported by the next call, pointing at the seed call; the seed still applies afterwards", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "later" });

		await expect(page.goto("http://localhost:9999/nothing-listens-here")).rejects.toThrow();
		let error: Error | undefined;
		try {
			await testStorage.sessionStorage.get();
		} catch (caught) {
			error = caught as Error;
		}
		expect(error?.message).toBe(
			`TestStorageSecond.SessionStorage.seed: could not fetch http://localhost:9999/nothing-listens-here while a seed for ${B} was pending`,
		);
		expect(error?.stack).toContain("sessionStorage.spec.ts");
		expect(error?.cause).toBeInstanceOf(Error);

		// the aborted navigation leaves the tab on Chromium's error page, which can still be committing; once back on
		// a real document the failure is not repeated
		await expect(async () => {
			await testStorage.navigation.goto();
		}).toPass({ timeout: 5_000 });
		expect(await testStorage.sessionStorage.get()).toEqual({});

		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "later" });
	});

	test("whole-page mocks registered after seed are served, those registered before are bypassed, and API mocks are unaffected", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		const secondPage = (url: URL) => url.href === `${A}/teststorage?second=1`;
		const mock = (route: Route) =>
			route.fulfill({ contentType: "text/html", body: '<!doctype html><title>mocked</title><pre id="served-by">mock</pre>' });
		await testStorage.navigation.goto();
		await page.route(secondPage, mock);
		await page.route(
			(url) => url.href === `${B}/teststorage/api`,
			(route) => route.fulfill({ contentType: "application/json", body: '{"mocked":true}' }),
		);
		await testStorageSecond.sessionStorage.seed({ token: "t" });

		await testStorage.getLocator("body.link@sameOrigin").click();
		await page.waitForURL(secondPage);
		expect(await servedBy(page)).toBe("server");
		expect(await page.evaluate((url) => fetch(url).then((r) => r.json()), `${B}/teststorage/api`)).toEqual({
			mocked: true,
		});

		await page.route(secondPage, mock);
		await page.goto(`${A}/teststorage?second=1`);
		expect(await servedBy(page)).toBe("mock");

		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "t" });
	});

	test("the page object seeds its own origin without an argument; a RegExp-base page object needs one", async ({
		page,
	}) => {
		class RegExpBaseStorage extends PageObject<"body", { baseUrlType: RegExp }> {
			constructor(page: Page) {
				super(page, /127\.0\.0\.1/, "/teststorage", { label: "RegExpBase" });
			}
			protected defineLocators() {
				this.add("body").locator("body");
			}
			protected pageActionsToPerformAfterNavigation() {
				return null;
			}
		}
		const poc = new RegExpBaseStorage(page);

		await expect(poc.sessionStorage.seed({ token: "x" })).rejects.toThrow(
			"RegExpBase.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one",
		);
		await expect(poc.sessionStorage.seed({ token: "x" }, { origin: "127.0.0.1:9000" })).rejects.toThrow(
			/^RegExpBase\.SessionStorage\.seed: origin must be an origin such as/,
		);
		await poc.sessionStorage.seed({ token: "x" }, { origin: B });
		await poc.navigation.goto(`${B}/teststorage`);
		expect(await startup(page)).toEqual({ token: "x" });
	});
});

test.describe("iframes", () => {
	test("a same-origin iframe shares the main frame's storage, and a hop started inside a cross-origin iframe is seeded", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto("/teststorage?frames=1");
		await testStorage.sessionStorage.set({ shared: "yes" });
		const sameFrame = page.frames().find((frame) => frame.url() === `${A}/teststorage/frame`);
		expect(sameFrame).toBeDefined();
		await sameFrame?.goto(`${A}/teststorage/frame?again=1`);
		await expect(sameFrame?.locator("#frame-startup") ?? page.locator("#never")).toHaveText('{"shared":"yes"}');

		await testStorageSecond.sessionStorage.seed({ token: "from-frame" });
		const secondFrame = page.frames().find((frame) => frame.url().startsWith(`${B}/teststorage/frame`));
		await secondFrame?.locator("#hop-from-frame").click();
		await page.waitForURL(onSecondOrigin);
		expect(page.url()).toBe(`${B}/teststorage?hop=frame`);
		expect(await servedBy(page)).toBe("server");
		expect(await startup(page)).toEqual({ token: "from-frame" });
	});

	test("a hop started inside a same-origin iframe is seeded too", async ({ page, testStorage, testStorageSecond }) => {
		await testStorage.navigation.goto("/teststorage?frames=1");
		await testStorageSecond.sessionStorage.seed({ token: "from-same-frame" });
		const sameFrame = page.frames().find((frame) => frame.url() === `${A}/teststorage/frame`);
		await sameFrame?.locator("#hop-from-frame").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "from-same-frame" });
	});

	test("an iframe of the seeded origin sees the entries on its own origin", async ({ page, testStorageSecond }) => {
		await testStorageSecond.sessionStorage.seed({ token: "seeded" });
		await testStorageSecond.navigation.goto("/teststorage?frames=1");
		expect(await startup(page)).toEqual({ token: "seeded" });
		const ownFrame = page.frames().find((frame) => frame.url() === `${B}/teststorage/frame`);
		await expect(ownFrame?.locator("#frame-startup") ?? page.locator("#never")).toHaveText('{"token":"seeded"}');
	});

	test("a cross-site iframe of the seeded origin shares that origin's tab storage in Chromium and Firefox, not in WebKit", async ({
		page,
		browserName,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorageSecond.sessionStorage.seed({ token: "seeded" });
		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "seeded" });

		await testStorage.navigation.goto("/teststorage?frames=1");
		const embedded = page.frames().find((frame) => frame.url() === `${B}/teststorage/frame`);
		await expect(embedded?.locator("#frame-startup") ?? page.locator("#never")).toHaveText(
			browserName === "webkit" ? "{}" : '{"token":"seeded"}',
		);
	});
});

test.describe("service workers", () => {
	const controlled = (page: Page) => page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	const unregister = (page: Page) =>
		page.evaluate(async () => {
			for (const registration of await navigator.serviceWorker.getRegistrations()) {
				await registration.unregister();
			}
		});

	test("a worker that answers navigations bypasses a pending seed, which fails the test at once", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		test.fail(true, "the bypass must fail this test");
		await testStorageSecond.navigation.goto("/teststorage?worker=1");
		await controlled(page);
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "lost" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		await expect(page.locator("#served-by")).toHaveText("service-worker");
	});

	test("a worker that lets navigations through does not bypass the seed", async ({ page, testStorage, testStorageSecond }) => {
		await testStorageSecond.navigation.goto("/teststorage?worker=passthrough");
		await controlled(page);
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "kept" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await servedBy(page)).toBe("server");
		expect(await startup(page)).toEqual({ token: "kept" });
	});

	test.describe("with serviceWorkers blocked", () => {
		test.use({ serviceWorkers: "block" });

		test("the same flow seeds, because the worker never registers", async ({ page, testStorage, testStorageSecond }) => {
			await testStorageSecond.navigation.goto("/teststorage?worker=1");
			await expect(page.locator("#controlled")).toHaveText("no");
			await testStorage.navigation.goto();
			await testStorageSecond.sessionStorage.seed({ token: "blocked" });

			await testStorage.getLocator("body.link@toSecondOrigin").click();
			await page.waitForURL(onSecondOrigin);
			expect(await servedBy(page)).toBe("server");
			expect(await startup(page)).toEqual({ token: "blocked" });
		});
	});

	test("seeding on a fresh context before the app registers its worker works", async ({ page, testStorageSecond }) => {
		await testStorageSecond.sessionStorage.seed({ token: "early" });
		await testStorageSecond.navigation.goto("/teststorage?worker=1");
		expect(await servedBy(page)).toBe("server");
		expect(await startup(page)).toEqual({ token: "early" });
	});

	test("unregistering the worker in the test restores the seed", async ({ page, testStorage, testStorageSecond }) => {
		await testStorageSecond.navigation.goto("/teststorage?worker=1");
		await controlled(page);
		await unregister(page);
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "restored" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await servedBy(page)).toBe("server");
		expect(await startup(page)).toEqual({ token: "restored" });
	});
});
