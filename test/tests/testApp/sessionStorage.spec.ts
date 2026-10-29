import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@fixtures/testApp.fixtures";
import type { User } from "@page-object-models/testApp/pages/teststorage/teststorage.locatorSchema";
import type TestStorage from "@page-object-models/testApp/pages/teststorage/teststorage.page";
import type { Page, Route, TestInfo } from "@playwright/test";
import { PageObject, SessionStorage } from "pomwright";

const A = "http://localhost:9000";
const B = "http://127.0.0.1:9000";
const user: User = { name: "Ada", age: 36 };
const userJson = JSON.stringify(user);

// The fixture page renders what its first script saw (#startup), the current entries (#current), the
// request method and posted fields, the Referer and Sec-Fetch headers the server received, the
// navigation's type and document.referrer (#navigation), and who served the document.
const readJson = async (page: Page, id: string) => JSON.parse((await page.locator(`#${id}`).textContent()) ?? "null");
const startup = (page: Page) => readJson(page, "startup");
const current = (page: Page) => readJson(page, "current");
const headers = (page: Page) => readJson(page, "headers");
const navigation = (page: Page) => readJson(page, "navigation");
const servedBy = (page: Page) => page.locator("#served-by").textContent();
const onSecondOrigin = (url: URL) => url.origin === B && url.pathname === "/teststorage";
const storedItem = (page: Page, key: string) => page.evaluate((k) => sessionStorage.getItem(k), key);
// the storage of the origin the page is on now, not what its document rendered at load
const liveStorage = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)));
// a whole-page mock whose document snapshots its storage as the fixture page does
const mock = (route: Route) =>
	route.fulfill({
		contentType: "text/html",
		body:
			"<!doctype html><script>window.__startup = JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)));</script>" +
			'<title>mocked</title><pre id="served-by">mock</pre><pre id="startup"></pre>' +
			'<script>document.getElementById("startup").textContent = window.__startup;</script>',
	});

test.describe("a popup on about:blank, which inherits its opener's origin", () => {
	const openPopup = async (page: Page) => {
		await page.goto(`${A}/teststorage`);
		const [popup] = await Promise.all([page.waitForEvent("popup"), page.evaluate(() => void window.open())]);
		expect(popup.url()).toBe("about:blank");
		return popup;
	};

	test("a helper bound to another origin refuses it; one bound to the inherited origin writes there", async ({
		page,
	}) => {
		const popup = await openPopup(page);
		await expect(new SessionStorage(popup, { label: "Second", origin: B }).set("token", "for B")).rejects.toThrow(
			`Second.SessionStorage.set: the page (about:blank) is on ${A}, not on this page object's origin ${B}; another origin's sessionStorage is reachable only from a document on it. Use the page object for ${A}, or a standalone SessionStorage without an origin`,
		);
		await new SessionStorage(popup, { label: "First", origin: A }).set("token", "for A");
		await popup.goto(`${A}/teststorage`);
		expect(await current(popup)).toEqual({ token: "for A" });
	});

	test("overlapping calls from a bound and an unbound helper act in the order they were made", async ({ page }) => {
		const popup = await openPopup(page);
		const unbound = new SessionStorage(popup, { label: "Unbound" });
		const onA = new SessionStorage(popup, { label: "OnA", origin: A });
		// a long batch first: on two chains, the later call would finish before it
		const filler = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`f${i}`, "x"]));
		await Promise.all([unbound.set({ ...filler, shared: "earlier" }), onA.set({ shared: "later" })]);
		expect(await popup.evaluate(() => sessionStorage.getItem("shared"))).toBe("later");
		await Promise.all([onA.set({ ...filler, shared: "earlier" }), unbound.set({ shared: "later" })]);
		expect(await popup.evaluate(() => sessionStorage.getItem("shared"))).toBe("later");
	});

	test("a seed for the inherited origin writes at once, as set does there", async ({ page }) => {
		const popup = await openPopup(page);
		await new SessionStorage(popup, { origin: A }).seed({ token: "seeded" });
		expect(await popup.evaluate(() => sessionStorage.getItem("token"))).toBe("seeded");
		await popup.goto(`${A}/teststorage`);
		expect(await startup(popup)).toEqual({ token: "seeded" });
	});

	test("a write the browser refuses gets the browser's error, labeled, not the no-origin message", async ({ page }) => {
		const popup = await openPopup(page);
		const error = await new SessionStorage(popup, { label: "Popup" })
			.set("big", "x".repeat(6 * 1024 * 1024))
			.catch((e: Error) => e);
		expect((error as Error).message).toMatch(/^Popup\.SessionStorage\.set: webStorage\.setItem: .*quota/i);
	});

	test("a call after the popup closed gets Playwright's error, labeled", async ({ page }) => {
		const popup = await openPopup(page);
		const storage = new SessionStorage(popup, { label: "Popup" });
		await popup.close();
		const error = await storage.get("token").catch((e: Error) => e);
		// from the call's first request to the page, its handle to the document
		expect((error as Error).message).toBe(
			"Popup.SessionStorage.get: page.evaluateHandle: Target page, context or browser has been closed",
		);
	});

	test("a seed then a set for the inherited origin: the app starts with the set's value", async ({ page }) => {
		const popup = await openPopup(page);
		const storage = new SessionStorage(popup, { label: "Popup", origin: A });
		await storage.seed({ token: "seeded" });
		await storage.set("token", "set later");
		await popup.goto(`${A}/teststorage`);
		expect(await startup(popup)).toEqual({ token: "set later" });
	});
});

test.describe("a document with an opaque origin", () => {
	test("after a failed navigation to the origin, each browser's page: Firefox's error page is opaque", async ({
		page,
		context,
		browserName,
		testStorage,
	}) => {
		await page.goto(`${B}/testpath`);
		await context.setOffline(true);
		await page.goto(`${A}/teststorage`).catch(() => undefined);
		if (browserName !== "webkit") {
			// Chromium and Firefox commit an error page; WebKit stays on the page it was on
			await page.waitForURL((url) => url.href !== `${B}/testpath`, { waitUntil: "commit" });
		}
		const outcome = await testStorage.sessionStorage.set("token", "x").then(
			() => "resolved",
			(error: Error) => error.message,
		);
		await context.setOffline(false);
		const expected = {
			firefox: `TestStorage.SessionStorage.set: the document at ${A}/teststorage cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)`,
			chromium:
				"TestStorage.SessionStorage.set: the page has no origin yet (chrome-error://chromewebdata/); navigate to the origin first or use seed()",
			webkit: `TestStorage.SessionStorage.set: the page is on ${B}, not on this page object's origin ${A}; another origin's sessionStorage is reachable only from a document on it. Use the page object for ${B}, or a standalone SessionStorage without an origin`,
		}[browserName];
		expect(outcome).toBe(expected);
	});

	test("a sandboxed document: set, get and an on-origin seed say its origin is opaque", async ({
		page,
		testStorage,
	}) => {
		await page.goto(`${A}/teststorage/sandboxed`);
		const opaque = (method: string) =>
			`TestStorage.SessionStorage.${method}: the document at ${A}/teststorage/sandboxed cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)`;
		await expect(testStorage.sessionStorage.set("token", "x")).rejects.toThrow(opaque("set"));
		await expect(testStorage.sessionStorage.get("token")).rejects.toThrow(opaque("get"));
		await expect(testStorage.sessionStorage.seed({ token: "x" })).rejects.toThrow(opaque("seed"));
	});

	test("a sandboxed document whose script declares a global origin: still opaque", async ({ page, testStorage }) => {
		await page.goto(`${A}/teststorage/sandboxed?globals=1`);
		// the app's own variable replaces self.origin in its document
		expect(await page.evaluate(() => self.origin)).toBe(A);
		await expect(testStorage.sessionStorage.set("token", "x")).rejects.toThrow(
			`TestStorage.SessionStorage.set: the document at ${A}/teststorage/sandboxed?globals=1 cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)`,
		);
	});
});

test.describe("a batch the page leaves", () => {
	test("set fails with the label and the keys already written when the page navigates during it", async ({
		page,
		browserName,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		const entries = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`k${i}`, `v${i}`]));
		await page.evaluate((to) => setTimeout(() => (location.href = to), 5), `${B}/teststorage`);
		const outcome = await testStorage.sessionStorage.set(entries).then(
			() => "resolved",
			(error: Error) => error.message,
		);
		const navigated =
			/^TestStorage\.SessionStorage\.set: the page navigated to http:\/\/127\.0\.0\.1:9000\/teststorage while set\(\) was writing to http:\/\/localhost:9000; \d+ of 60 keys were written/;
		if (browserName === "webkit") {
			// WebKit finishes the batch before it leaves (60 of 60 in every probe); either outcome is correct
			expect(outcome === "resolved" || navigated.test(outcome), outcome).toBe(true);
		} else {
			expect(outcome).toMatch(navigated);
		}
		await page.waitForURL(onSecondOrigin);
		// the other origin's live storage: at most the key that was in flight when the page left, which the message names
		const inFlight = /; "(k\d+)" was being written and may have reached the new document$/.exec(outcome)?.[1];
		expect(Object.keys(await liveStorage(page)).filter((key) => key !== inFlight)).toEqual([]);
	});

	test.describe("the page commits on the other origin between two calls that both succeed", () => {
		/**
		 * After the helper's call number `calls` to `method` returns, the page commits on B before the call resolves: a
		 * navigation timed between two storage calls, by wrapping Playwright's call. It stands in for the moment alone (the
		 * navigation, the documents and the storage are real), so it cannot show how often real timing lands there; "set
		 * fails with the label and the keys already written when the page navigates during it" shows real timing.
		 */
		const commitOnBAfter = (page: Page, method: "setItem" | "removeItem" | "getItem" | "clear", calls: number) => {
			const storage = page.sessionStorage as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
			const original = storage[method]?.bind(storage);
			let count = 0;
			storage[method] = async (...args: unknown[]) => {
				const result = await original?.(...args);
				if (++count === calls) {
					await page.goto(`${B}/testpath`, { waitUntil: "commit" });
				}
				return result;
			};
		};
		const keys = ["k0", "k1", "k2", "k3", "k4", "k5"];
		const onB = async (page: Page, entries: Record<string, string> = {}) => {
			await page.goto(`${B}/testpath`);
			await page.evaluate((stored) => {
				sessionStorage.clear();
				for (const [key, value] of Object.entries(stored)) sessionStorage.setItem(key, value);
			}, entries);
		};
		const outcomeOf = (call: Promise<unknown>) =>
			call.then(
				() => "resolved",
				(error: Error) => error.message,
			);

		test("set stops, and nothing after the commit reaches the other origin", async ({ page, testStorage }) => {
			await onB(page);
			await testStorage.navigation.goto();
			commitOnBAfter(page, "setItem", 3);
			expect(await outcomeOf(testStorage.sessionStorage.set(Object.fromEntries(keys.map((key) => [key, "A"]))))).toBe(
				`TestStorage.SessionStorage.set: the page navigated to ${B}/testpath while set() was writing to ${A}; 2 of 6 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document`,
			);
			expect(await liveStorage(page)).toEqual({});
		});

		test("clear(keys) stops, and the other origin keeps its entries", async ({ page, testStorage }) => {
			const own = Object.fromEntries(keys.map((key) => [key, "B's own"]));
			await onB(page, own);
			await testStorage.navigation.goto();
			commitOnBAfter(page, "removeItem", 3);
			expect(await outcomeOf(testStorage.sessionStorage.clear(keys))).toBe(
				`TestStorage.SessionStorage.clear: the page navigated to ${B}/testpath while clear() was removing keys from ${A}; 2 of 6 keys were removed ("k0", "k1"); "k2" was being removed and may have reached the new document`,
			);
			expect(await liveStorage(page)).toEqual(own);
		});

		test("clear() fails, and the other origin keeps its entries", async ({ page, testStorage }) => {
			await onB(page, { token: "B's own" });
			await testStorage.navigation.goto();
			commitOnBAfter(page, "clear", 1);
			expect(await outcomeOf(testStorage.sessionStorage.clear())).toBe(
				`TestStorage.SessionStorage.clear: the page navigated to ${B}/testpath while clear() was removing every entry from ${A}; it may have reached the new document`,
			);
			expect(await liveStorage(page)).toEqual({ token: "B's own" });
		});

		test("get(keys) fails instead of returning what it read", async ({ page, testStorage }) => {
			await onB(page, { k0: "B's own" });
			await testStorage.navigation.goto();
			await testStorage.sessionStorage.set({ k0: "A", k1: "A", k2: "A" });
			commitOnBAfter(page, "getItem", 2);
			expect(await outcomeOf(testStorage.sessionStorage.get(["k0", "k1", "k2"]))).toMatch(
				/^TestStorage\.SessionStorage\.get: the page navigated to http:\/\/127\.0\.0\.1:9000\/testpath while get\(\) was reading "k[012]" from http:\/\/localhost:9000; it may have read the new document$/,
			);
		});

		test("an on-origin seed stops, and nothing after the commit reaches the other origin", async ({
			page,
			testStorage,
		}) => {
			await onB(page);
			await testStorage.navigation.goto();
			commitOnBAfter(page, "setItem", 3);
			expect(await outcomeOf(testStorage.sessionStorage.seed(Object.fromEntries(keys.map((key) => [key, "A"]))))).toBe(
				`TestStorage.SessionStorage.seed: the page navigated to ${B}/testpath while seed() was writing to ${A}; 2 of 6 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document`,
			);
			expect(await liveStorage(page)).toEqual({});
		});

		test("the waiting calls of a helper without an origin fail, and the other origin's storage stays as it was", async ({
			page,
			testStorage,
		}) => {
			await onB(page, { k0: "B's own" });
			await testStorage.navigation.goto();
			const unbound = new SessionStorage(page, { label: "Unbound" });
			commitOnBAfter(page, "setItem", 1);
			const outcomes = await Promise.all([
				outcomeOf(unbound.set({ k0: "A", k1: "A" })),
				outcomeOf(unbound.set("k2", "A")),
				outcomeOf(unbound.get()),
				outcomeOf(unbound.clear()),
			]);
			const waited = (method: string) =>
				`Unbound.SessionStorage.${method}: the page left ${A} for ${B} while ${method}() waited for its turn; the call did nothing`;
			expect(outcomes).toEqual([
				`Unbound.SessionStorage.set: the page navigated to ${B}/testpath while set() was writing to ${A}; 0 of 2 keys were written; "k0" was being written and may have reached the new document`,
				waited("set"),
				waited("get"),
				waited("clear"),
			]);
			expect(await liveStorage(page)).toEqual({ k0: "B's own" });
		});

		test("the waiting call of a helper with an origin fails with the origin message", async ({ page, testStorage }) => {
			await onB(page, { k0: "B's own" });
			await testStorage.navigation.goto();
			commitOnBAfter(page, "setItem", 1);
			const [, waiting] = await Promise.all([
				outcomeOf(testStorage.sessionStorage.set("k0", "A")),
				outcomeOf(testStorage.sessionStorage.get("k0")),
			]);
			expect(waiting).toBe(
				`TestStorage.SessionStorage.get: the page is on ${B}, not on this page object's origin ${A}; another origin's sessionStorage is reachable only from a document on it. Use the page object for ${B}, or a standalone SessionStorage without an origin`,
			);
			expect(await liveStorage(page)).toEqual({ k0: "B's own" });
		});

		test("a helper without an origin follows the page between awaited calls", async ({ page, testStorage }) => {
			await onB(page);
			await testStorage.navigation.goto();
			const unbound = new SessionStorage(page, { label: "Unbound" });
			await unbound.set("k0", "on A");
			await page.goto(`${B}/testpath`);
			await unbound.set("k0", "on B");
			expect(await unbound.get("k0")).toBe("on B");
			await testStorage.navigation.goto();
			expect(await unbound.get("k0")).toBe("on A");
		});
	});
});

test.describe("a reload or a redirect within the origin", () => {
	/**
	 * Runs `actions[n]` after the helper's storage call number `n` to `method` returns, before the call resolves: a
	 * navigation timed between two storage calls, which real timing hits only by chance. It stands in for the moment
	 * alone (the navigation, the documents and the storage are real), so it cannot show how often real timing lands
	 * there; the test with the page's own timer below shows a reload during a call.
	 */
	const afterStorageCall = (
		page: Page,
		method: "setItem" | "removeItem" | "getItem",
		actions: Record<number, () => Promise<unknown>>,
	) => {
		const storage = page.sessionStorage as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
		const original = storage[method]?.bind(storage);
		let count = 0;
		storage[method] = async (...args: unknown[]) => {
			const result = await original?.(...args);
			await actions[++count]?.();
			return result;
		};
		return () => {
			if (original) storage[method] = original;
		};
	};
	const outcomeOf = (call: Promise<unknown>) =>
		call.then(
			() => "resolved",
			(error: Error) => error.message,
		);
	const keys = ["k0", "k1", "k2", "k3", "k4", "k5"];
	const entries = Object.fromEntries(keys.map((key) => [key, "A"]));

	test("between two storage calls stops set, and the reloaded app's first script saw only the keys written before", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		afterStorageCall(page, "setItem", { 3: () => page.reload({ waitUntil: "commit" }) });
		expect(await outcomeOf(testStorage.sessionStorage.set(entries))).toBe(
			`TestStorage.SessionStorage.set: the page navigated to ${A}/teststorage while set() was writing to ${A}; 2 of 6 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document`,
		);
		await page.waitForLoadState();
		expect(await startup(page)).toEqual({ k0: "A", k1: "A", k2: "A" });
		expect(await liveStorage(page)).toEqual({ k0: "A", k1: "A", k2: "A" });
	});

	test("between two storage calls stops a seed on the origin, clear with keys and get with keys", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		let restore = afterStorageCall(page, "setItem", { 2: () => page.reload({ waitUntil: "commit" }) });
		expect(await outcomeOf(testStorage.sessionStorage.seed(entries))).toBe(
			`TestStorage.SessionStorage.seed: the page navigated to ${A}/teststorage while seed() was writing to ${A}; 1 of 6 keys were written ("k0"); "k1" was being written and may have reached the new document`,
		);
		restore();
		await page.waitForLoadState();
		await testStorage.sessionStorage.set(entries);

		restore = afterStorageCall(page, "removeItem", { 2: () => page.reload({ waitUntil: "commit" }) });
		expect(await outcomeOf(testStorage.sessionStorage.clear(keys))).toBe(
			`TestStorage.SessionStorage.clear: the page navigated to ${A}/teststorage while clear() was removing keys from ${A}; 1 of 6 keys were removed ("k0"); "k1" was being removed and may have reached the new document`,
		);
		restore();
		await page.waitForLoadState();
		expect(Object.keys(await liveStorage(page)).sort()).toEqual(["k2", "k3", "k4", "k5"]);

		afterStorageCall(page, "getItem", { 1: () => page.reload({ waitUntil: "commit" }) });
		expect(await outcomeOf(testStorage.sessionStorage.get(["k2", "k3", "k4"]))).toMatch(
			/^TestStorage\.SessionStorage\.get: the page navigated to http:\/\/localhost:9000\/teststorage while get\(\) was reading "k[234]" from http:\/\/localhost:9000; it may have read the new document$/,
		);
	});

	test("by the page's own timer during a call stops it", async ({ page, testStorage }) => {
		const many = Object.fromEntries(Array.from({ length: 300 }, (_, index) => [`k${index}`, "A"]));
		for (let round = 0; round < 2; round++) {
			await testStorage.navigation.goto();
			await page.evaluate(() => sessionStorage.clear());
			await page.evaluate(() => setTimeout(() => location.reload(), 30));
			expect(await outcomeOf(testStorage.sessionStorage.set(many))).toMatch(
				/^TestStorage\.SessionStorage\.set: the page navigated to http:\/\/localhost:9000\/teststorage while set\(\) was writing to http:\/\/localhost:9000; \d+ of 300 keys were written/,
			);
			await page.waitForLoadState();
		}
	});

	test("pushState and a hash change between two storage calls keep the document, and the call goes on", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		afterStorageCall(page, "setItem", {
			2: () => page.evaluate(() => history.pushState({}, "", "/teststorage?pushed=1")),
			4: () =>
				page.evaluate(() => {
					location.hash = "section";
				}),
		});
		expect(await outcomeOf(testStorage.sessionStorage.set(entries))).toBe("resolved");
		expect(page.url()).toBe(`${A}/teststorage?pushed=1#section`);
		expect(await liveStorage(page)).toEqual(entries);
	});

	test("a call that waited for its turn through a reload runs in the new document", async ({ page, testStorage }) => {
		await testStorage.navigation.goto();
		const unbound = new SessionStorage(page, { label: "Unbound" });
		afterStorageCall(page, "setItem", { 2: () => page.reload({ waitUntil: "commit" }) });
		const [first, waiting] = await Promise.all([
			outcomeOf(unbound.set({ k0: "A", k1: "A", k2: "A" })),
			outcomeOf(unbound.set("late", "x")),
		]);
		expect(first).toBe(
			`Unbound.SessionStorage.set: the page navigated to ${A}/teststorage while set() was writing to ${A}; 1 of 3 keys were written ("k0"); "k1" was being written and may have reached the new document`,
		);
		expect(waiting).toBe("resolved");
		await page.waitForLoadState();
		expect(await liveStorage(page)).toEqual({ k0: "A", k1: "A", late: "x" });
	});
});

test.describe("an app that navigates by itself: the patterns of the session storage page", () => {
	const entries = { k0: "A", k1: "A", k2: "A" };

	test("wait for where it ends up: expectThisPage after the app's redirect within the origin", async ({
		page,
		testStorage,
	}) => {
		for (let round = 0; round < 3; round++) {
			// the page object's own URL, which expectThisPage compares whole
			await page.goto(`${A}/teststorage/bounce?to=${encodeURIComponent(`${A}/teststorage`)}`, { waitUntil: "commit" });
			await testStorage.navigation.expectThisPage();
			await testStorage.sessionStorage.set(entries);
			expect(await liveStorage(page)).toEqual(entries);
			await page.evaluate(() => sessionStorage.clear());
		}
	});

	test("wait for the final state of an app that reloads itself as it loads, whose URL stays", async ({ browser }) => {
		for (let round = 0; round < 3; round++) {
			// a fresh page each round: the app reloads once per session
			const context = await browser.newContext();
			const page = await context.newPage();
			await page.goto(`${A}/teststorage/race?mode=reload`);
			await expect(page.locator("#startup")).toContainText('"raced":"1"');
			await new SessionStorage(page, { label: "TestStorage", origin: A }).set(entries);
			expect(await liveStorage(page)).toEqual({ ...entries, raced: "1", token: "app" });
			await context.close();
		}
	});

	test("seed before the navigation: the app's final document starts with the entries", async ({ browser }) => {
		for (let round = 0; round < 3; round++) {
			const context = await browser.newContext();
			const page = await context.newPage();
			await new SessionStorage(page, { label: "TestStorage", origin: A }).seed(entries);
			await page.goto(`${A}/teststorage/race?mode=reload`);
			await expect(page.locator("#startup")).toContainText('"raced":"1"');
			expect(await startup(page)).toEqual({ ...entries, raced: "1", token: "app" });
			await context.close();
		}
	});
});

test.describe("set, get and clear", () => {
	test("every call takes its arguments when it is made, as Playwright's calls do", async ({ page, testStorage }) => {
		await testStorage.navigation.goto();
		const entries: Record<string, string> = { k: "as passed" };
		const setting = testStorage.sessionStorage.set(entries);
		entries.k = "changed after the call";
		await setting;
		const seedEntries: Record<string, string> = { s: "as passed" };
		const seeding = testStorage.sessionStorage.seed(seedEntries);
		seedEntries.s = "changed after the call";
		await seeding;
		expect(await liveStorage(page)).toEqual({ k: "as passed", s: "as passed" });

		const read = ["k"];
		const getting = testStorage.sessionStorage.get(read);
		read.push("s");
		expect(await getting).toEqual({ k: "as passed" });
		const removed = ["k"];
		const clearing = testStorage.sessionStorage.clear(removed);
		removed.push("s");
		await clearing;
		expect(await liveStorage(page)).toEqual({ s: "as passed" });

		// a codec's value: the object as it was at the call
		const account: User = { name: "Ada", age: 36 };
		const settingUser = testStorage.sessionStorage.set("user", account);
		account.name = "changed after the call";
		await settingUser;
		expect(await storedItem(page, "user")).toBe(JSON.stringify({ name: "Ada", age: 36 }));
	});

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

	test("what clear removed stays removed after a reload, one key, several and every entry", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set({ token: "abc", theme: "dark", locale: "nb", extra: "x" });
		await testStorage.sessionStorage.clear("token");
		await testStorage.sessionStorage.clear(["theme", "locale"]);
		await page.reload();
		expect(await current(page)).toEqual({ extra: "x" });
		await testStorage.sessionStorage.clear();
		await page.reload();
		expect(await current(page)).toEqual({});
	});

	test("the browser's quota: 5,242,880 characters per origin, keys and values together; past it the write is refused", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		// one key of one character and a value of the rest fill it exactly
		await testStorage.sessionStorage.set("q", "x".repeat(5_242_879));
		expect(await page.evaluate(() => sessionStorage.getItem("q")?.length)).toBe(5_242_879);
		// one more character, a key with an empty value, is past it
		const error = await testStorage.sessionStorage.set("r", "").catch((e: Error) => e);
		expect((error as Error).message).toMatch(/^TestStorage\.SessionStorage\.set: webStorage\.setItem: .*quota/i);
		expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(["q"]);
		await testStorage.sessionStorage.clear();
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

	test("clear removes everything, one key, or a list; a computed empty list removes nothing", async ({
		testStorage,
	}) => {
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
		await expect(storage.clear()).rejects.toThrow(
			"Fresh.SessionStorage.clear: the page has no origin yet (about:blank)",
		);
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
		await expect(testStorage.sessionStorage.clear()).rejects.toThrow(
			/^TestStorage\.SessionStorage\.clear: the page is on/,
		);

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

	test("a __proto__ key is stored like any other, alone and in a parsed snapshot", async ({ page, testStorage }) => {
		await testStorage.navigation.goto();
		await testStorage.sessionStorage.set("__proto__", "saved");
		expect(await storedItem(page, "__proto__")).toBe("saved");

		await testStorage.sessionStorage.set(JSON.parse('{"__proto__":"snapshot","other":"z"}'));
		expect(await storedItem(page, "__proto__")).toBe("snapshot");
		expect(await storedItem(page, "other")).toBe("z");
		expect(await testStorage.sessionStorage.get("__proto__")).toBe("snapshot");
	});

	test("codec failures name the key: a stored value that is not valid JSON, and an object for an undeclared key", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await page.evaluate(() => sessionStorage.setItem("user", "{not json"));

		// JSON.parse's own wording differs between Node versions
		await expect(testStorage.sessionStorage.get("user")).rejects.toThrow(
			/^TestStorage\.SessionStorage\.get: value for "user" could not be decoded \(SyntaxError: .+\); stored value, 9 characters: "\{not json"$/,
		);
		await expect(testStorage.sessionStorage.set({ other: { x: 1 } as unknown as string })).rejects.toThrow(
			'TestStorage.SessionStorage.set: value for "other" is not a string and no codec is declared for it; declare one in the schema (a page object\'s sessionStorage.schema option)',
		);
	});
});

test.describe("seed", () => {
	// a chain of script redirects within the first origin, as an app that sends / to /login to /login/start on load
	const scriptChain = (hops: number, end: string) => {
		let url = end;
		for (let hop = 0; hop < hops; hop++) {
			url = `${A}/teststorage/bounce?to=${encodeURIComponent(url)}`;
		}
		return url;
	};

	for (const hops of [2, 3, 5]) {
		test(`a page's first seed while the page redirects itself ${hops} times by script registers, and the arrival has the entry`, async ({
			browser,
		}) => {
			// a fresh page each round, so the Navigation API check is the page's first and runs during the chain
			for (let round = 0; round < 3; round++) {
				const context = await browser.newContext();
				const page = await context.newPage();
				await page.goto(scriptChain(hops, `${A}/testpath`), { waitUntil: "commit" });
				await new SessionStorage(page, { label: "Second", origin: B }).seed({ token: `round ${round}` });
				await page.waitForURL(`${A}/testpath`);
				await page.goto(`${B}/teststorage`);
				expect(await startup(page)).toEqual({ token: `round ${round}` });
				await context.close();
			}
		});
	}

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

	test("a __proto__ key seeded before the navigation is written on arrival", async ({ page, testStorage }) => {
		await testStorage.sessionStorage.seed("__proto__", "seeded");
		await testStorage.navigation.goto();
		expect(await storedItem(page, "__proto__")).toBe("seeded");
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
		posted?: unknown;
	}[] = [
		{
			name: "link",
			trigger: (p) => p.getLocator("body.link@toSecondOrigin").click(),
			url: `${B}/teststorage?hop=link`,
			method: "GET",
		},
		{
			name: "script redirect",
			trigger: (p) => p.getLocator("body.button@scriptToSecondOrigin").click(),
			url: `${B}/teststorage?hop=script`,
			method: "GET",
		},
		{
			name: "meta refresh",
			trigger: (p) => p.getLocator("body.button@metaToSecondOrigin").click(),
			url: `${B}/teststorage?hop=meta`,
			method: "GET",
		},
		{
			name: "form POST",
			trigger: (p) => p.getLocator("body.button@submitToSecondOrigin").click(),
			url: `${B}/teststorage`,
			method: "POST",
			posted,
		},
		{
			name: "server 302",
			trigger: (p) => p.getLocator("body.link@redirect302").click(),
			url: `${B}/teststorage?hop=302`,
			method: "GET",
		},
		{
			name: "POST then 303",
			trigger: (p) => p.getLocator("body.button@submit303").click(),
			url: `${B}/teststorage?hop=303`,
			method: "GET",
		},
		{
			name: "POST then 307",
			trigger: (p) => p.getLocator("body.button@submit307").click(),
			url: `${B}/teststorage?hop=307`,
			method: "POST",
			posted: { u: "x y" },
		},
		{
			name: "two-hop redirect chain",
			trigger: (p) => p.getLocator("body.link@chain").click(),
			url: `${B}/teststorage?hop=chain`,
			method: "GET",
		},
		{
			name: "multipart form POST",
			trigger: (p) => p.getLocator("body.button@submitMultipart").click(),
			url: `${B}/teststorage`,
			method: "POST",
			posted: { note: "a b", unicode: "åæø 🚀" },
		},
		{
			name: "text/plain form POST",
			trigger: (p) => p.getLocator("body.button@submitText").click(),
			url: `${B}/teststorage`,
			method: "POST",
			posted: "note=a b\r\n",
		},
	];
	// what the app received and saw, which a seed leaves exactly as it is without one
	const observed = async (page: Page) => ({
		headers: await headers(page),
		navigation: await navigation(page),
		method: await page.locator("#method").textContent(),
		posted: await readJson(page, "posted"),
		hash: await page.evaluate(() => location.hash),
	});
	for (const hop of hops) {
		test(`a seed for the second origin is applied on a hop by ${hop.name}, which reaches the app as without a seed`, async ({
			page,
			testStorage,
			testStorageSecond,
		}) => {
			// the baseline: the same hop without a seed
			await testStorage.navigation.goto();
			await hop.trigger(testStorage);
			await page.waitForURL(onSecondOrigin);
			expect(await startup(page)).toEqual({});
			const baseline = await observed(page);

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
			expect(await observed(page)).toEqual(baseline);
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
		expect((await navigation(page)).type).toBe("navigate");

		await page.goBack();
		expect(page.url()).toBe(testStorage.fullUrl);
	});

	test("a pending seed intercepts nothing: a whole-page mock registered before it still answers", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		const secondPage = (url: URL) => url.href === `${A}/teststorage?second=1`;
		await page.route(secondPage, mock);

		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "x" });
		await testStorage.getLocator("body.link@sameOrigin").click();
		await page.waitForURL(secondPage);
		expect(await servedBy(page)).toBe("mock");

		await testStorage.navigation.goto();
		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "x" });
	});

	test("sub-resources and iframes are left alone while a seed is pending, even frames on the seeded origin, and the seed still applies", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto("/teststorage?frames=1");
		await testStorageSecond.sessionStorage.seed({ token: "from-A" });

		expect(await page.evaluate((url) => fetch(url).then((r) => r.json()), `${B}/teststorage/api`)).toEqual({
			ok: true,
		});
		const secondFrame = page.frames().find((frame) => frame.url().startsWith(`${B}/teststorage/frame`));
		expect(secondFrame).toBeDefined();
		// a frame on the seeded origin, with srcdoc, about:blank and data: frames inside it: none of them is written to
		await secondFrame?.goto(`${B}/teststorage/frame?nested=1`);
		await expect(secondFrame?.locator("#frame-startup") ?? page.locator("#never")).toHaveText("{}");
		expect(secondFrame?.childFrames()).toHaveLength(3);
		expect(await secondFrame?.evaluate(() => sessionStorage.getItem("token"))).toBeNull();

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

	test("on the origin, overlapping seeds and overlapping sets write in call order, the later value winning", async ({
		page,
		testStorage,
	}) => {
		await testStorage.navigation.goto();
		await Promise.all([
			testStorage.sessionStorage.seed({ first: "1", shared: "earlier" }),
			testStorage.sessionStorage.seed({ shared: "later" }),
		]);
		expect(await storedItem(page, "shared")).toBe("later");

		await Promise.all([
			testStorage.sessionStorage.set({ second: "2", shared: "set earlier" }),
			testStorage.sessionStorage.set({ shared: "set later" }),
			testStorage.sessionStorage.get("shared"),
		]);
		expect(await storedItem(page, "shared")).toBe("set later");
		expect([await storedItem(page, "first"), await storedItem(page, "second")]).toEqual(["1", "2"]);
	});

	test("seeds for one origin in a Promise.all merge as awaited ones, and nothing writes them again after a round trip", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await Promise.all([
			testStorageSecond.sessionStorage.seed({ token: "seeded" }),
			testStorageSecond.sessionStorage.seed({ other: "x" }),
		]);

		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "seeded", other: "x" });
		await testStorageSecond.sessionStorage.set("token", "changed-by-app");

		await testStorage.navigation.goto();
		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "changed-by-app", other: "x" });
	});

	test("a pending seed, then two overlapping ones: every call resolves and the first script sees every key", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ a: "1" });
		const later = new Promise((resolve) => setTimeout(resolve, 0)).then(() =>
			testStorageSecond.sessionStorage.seed({ b: "2" }),
		);
		await Promise.all([testStorageSecond.sessionStorage.seed({ c: "3" }), later]);

		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ a: "1", b: "2", c: "3" });
	});

	test("a seed not awaited before the hop either applies or fails at the call, and never resolves without its entries (5 fresh pages)", async ({
		context,
	}) => {
		for (let round = 0; round < 5; round++) {
			// a fresh page, so the Navigation API check runs while the navigation replaces about:blank
			const fresh = await context.newPage();
			const storage = new SessionStorage(fresh, { label: "Fresh", origin: B });
			const seeded = storage.seed({ token: `round-${round}` }).then(
				() => "resolved",
				(error: Error) => error.message,
			);
			await fresh.goto(`${B}/teststorage`);
			const outcome = await seeded;
			if (outcome === "resolved") {
				expect(await startup(fresh)).toEqual({ token: `round-${round}` });
			} else {
				expect(outcome).toBe(
					"Fresh.SessionStorage.seed: the page committed a document on http://127.0.0.1:9000 while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it",
				);
			}
			await fresh.close();
		}
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

	test("a hop that opens a new tab cannot be seeded: the popup has its own storage, and the seed waits for the page", async ({
		page,
		context,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "pending" });

		const popupPromise = context.waitForEvent("page");
		await testStorage.getLocator("body.link@popup").click();
		const popup = await popupPromise;
		expect(await startup(popup)).toEqual({});
		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "pending" });
	});

	test("whole-page mocks are served whether registered before or after seed, a mock of the seeded origin is seeded, and API mocks are unaffected", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		const secondPage = (url: URL) => url.href === `${A}/teststorage?second=1`;
		const seededPage = (url: URL) => url.href === `${B}/teststorage?mocked=1`;
		await testStorage.navigation.goto();
		await page.route(
			(url) => url.href === `${B}/teststorage/api`,
			(route) => route.fulfill({ contentType: "application/json", body: '{"mocked":true}' }),
		);
		await testStorageSecond.sessionStorage.seed({ token: "t" });
		await page.route(secondPage, mock);
		await page.route(seededPage, mock);

		await testStorage.getLocator("body.link@sameOrigin").click();
		await page.waitForURL(secondPage);
		expect(await servedBy(page)).toBe("mock");
		expect(await page.evaluate((url) => fetch(url).then((r) => r.json()), `${B}/teststorage/api`)).toEqual({
			mocked: true,
		});

		await page.goto(`${B}/teststorage?mocked=1`);
		expect(await servedBy(page)).toBe("mock");
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

test.describe("a seed that is never applied, at the page's own close", () => {
	test.describe.configure({ mode: "serial" });
	// the fixtures close the page after every hook, and the failing test's worker is replaced: an auto fixture, set up
	// before the page and so torn down after it, hands the failure to the next test through a file
	const messageFile = (testInfo: TestInfo) =>
		path.join(testInfo.project.outputDir, `own-close-${testInfo.project.name}-${testInfo.repeatEachIndex}.txt`);
	const withHandOver = test.extend<{ handOver: undefined }>({
		handOver: [
			// biome-ignore lint/correctness/noEmptyPattern: Playwright does not support the use of _
			async ({}, use, testInfo) => {
				await use(undefined);
				if (testInfo.expectedStatus === "failed") {
					writeFileSync(messageFile(testInfo), testInfo.errors[0]?.message ?? "");
				}
			},
			{ auto: true },
		],
	});

	withHandOver("fails the test", async ({ testStorage, testStorageSecond }) => {
		test.fail(true, "the never-applied seed must fail this test at close");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "never" });
	});

	withHandOver("and the message names the seed and its keys", () => {
		const message = readFileSync(messageFile(test.info()), "utf8");
		rmSync(messageFile(test.info()));
		expect(message.split("\n")[0]).toBe(
			`Error: TestStorageSecond.SessionStorage.seed: the seed for ${B} (keys: "token") was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends`,
		);
	});
});

test.describe("a navigation to a seeded origin that fails", () => {
	test.describe.configure({ mode: "serial" });
	// thrown from a page listener, so the test cannot catch it: a hook hands it to the next test through a file
	const outcomeFile = () =>
		path.join(
			test.info().project.outputDir,
			`failed-navigation-${test.info().project.name}-${test.info().repeatEachIndex}.json`,
		);
	test.afterEach(() => {
		if (test.info().title.startsWith("the retry") && test.info().expectedStatus !== "skipped") {
			const [error] = test.info().errors;
			writeFileSync(outcomeFile(), JSON.stringify({ message: error?.message ?? null, stack: error?.stack ?? "" }));
		}
	});

	for (const failure of ["offline", "a refused connection"] as const) {
		test(`the retry after ${failure} never loads the app without the entries`, async ({
			page,
			context,
			browserName,
			testStorage,
			testStorageSecond,
		}) => {
			test.skip(
				browserName === "firefox" && failure === "a refused connection",
				"Firefox shows an error page for an aborted connection only in some runs; offline it always does",
			);
			test.fail(browserName !== "webkit", "Chromium and Firefox cannot apply a seed after a failed navigation there");
			await testStorage.navigation.goto();
			await testStorageSecond.sessionStorage.seed({ token: "t" });
			if (failure === "offline") {
				await context.setOffline(true);
			} else {
				await page.route(`${B}/**`, (route) => route.abort("connectionrefused"), { times: 1 });
			}
			const before = page.url();
			await testStorageSecond.navigation.goto().catch(() => undefined);
			// Chromium and Firefox commit their error page after goto has rejected (Firefox's then fails this test);
			// WebKit shows none
			if (browserName !== "webkit") {
				await expect.poll(() => page.url()).not.toBe(before);
			}
			await context.setOffline(false);
			await testStorageSecond.navigation.goto();
			expect(await startup(page)).toEqual({ token: "t" });
		});

		test(`after ${failure}, the failure gives the reason at the seed's line`, async ({ browserName }) => {
			test.skip(browserName === "firefox" && failure === "a refused connection", "see the test above");
			const { message, stack } = JSON.parse(readFileSync(outcomeFile(), "utf8"));
			rmSync(outcomeFile());
			if (browserName === "webkit") {
				expect(message).toBeNull();
				return;
			}
			const reason =
				browserName === "chromium"
					? "the browser counted the page's arrival on http://127.0.0.1:9000 as a return there"
					: "the document that arrived on http://127.0.0.1:9000 has an opaque origin";
			expect(message).toContain(
				`TestStorageSecond.SessionStorage.seed: the seed for http://127.0.0.1:9000 (keys: "token") was not applied: ${reason}`,
			);
			expect(stack.split("\n").find((line: string) => line.trim().startsWith("at "))).toMatch(
				/sessionStorage\.spec\.ts:\d+:\d+/,
			);
		});
	}
});

test.describe("a seed whose arrival on the origin is a sandboxed document", () => {
	test.describe.configure({ mode: "serial" });
	// thrown from a page listener, so the test cannot catch it: a hook hands it to the next test through a file
	const messageFile = () =>
		path.join(
			test.info().project.outputDir,
			`sandboxed-arrival-${test.info().project.name}-${test.info().repeatEachIndex}.txt`,
		);
	test.afterEach(() => {
		if (test.info().expectedStatus === "failed") {
			writeFileSync(messageFile(), test.info().errors[0]?.message ?? "");
		}
	});

	test("fails the test", async ({ page, testStorage }) => {
		test.fail(true, "a sandboxed document has no session storage, so it cannot receive the seed");
		await page.goto(`${B}/testpath`);
		await testStorage.sessionStorage.seed({ token: "x" });
		await page.goto(`${A}/teststorage/sandboxed`);
	});

	test("and the message says the arriving document's origin is opaque", () => {
		const message = readFileSync(messageFile(), "utf8");
		rmSync(messageFile());
		expect(message.split("\n")[0]).toBe(
			`Error: TestStorage.SessionStorage.seed: the seed for ${A} (keys: "token") was not applied: the document that arrived on ${A} has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)`,
		);
	});
});

test.describe("a seed's failure and the page's other listeners", () => {
	test.describe.configure({ mode: "serial" });
	// the failing test's worker is replaced, so what it saw is handed to the next test through files
	const file = (name: string) =>
		path.join(test.info().project.outputDir, `${name}-${test.info().project.name}-${test.info().repeatEachIndex}.txt`);
	test.afterEach(() => {
		// a refused write fails the test during its body; a never-applied seed only when the page closes, after this hook
		if (test.info().title.startsWith("fails the test for a refused write")) {
			writeFileSync(file("listener-failure"), test.info().errors[0]?.message ?? "");
		}
	});
	const read = (name: string) => {
		const text = readFileSync(file(name), "utf8");
		rmSync(file(name));
		return text;
	};

	test("fails the test for a seed never applied, and a close listener added after the seed runs", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		test.fail(true, "the never-applied seed fails this test");
		const marker = file("later-close-listener");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "t" });
		page.on("close", () => writeFileSync(marker, "ran"));
	});

	test("the later close listener ran", () => {
		// the failure itself (the never-applied seed, the only one this test can have) is test.fail's expectation above;
		// its message is fixed by the unit tests
		expect(read("later-close-listener")).toBe("ran");
	});

	test("fails the test for a refused write, and a console listener added after the seed runs", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		test.fail(true, "the refused write fails this test");
		const marker = file("later-console-listener");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ big: "x".repeat(12 * 1024 * 1024) });
		page.on("console", (message) => {
			if (message.text().startsWith("pomwright-seed-failure:")) {
				writeFileSync(marker, "ran");
			}
		});
		await testStorageSecond.navigation.goto();
	});

	test("the later console listener ran, and the failure was the refused write", () => {
		expect(read("later-console-listener")).toBe("ran");
		expect(read("listener-failure")).toMatch(
			/^(Error: )?TestStorageSecond\.SessionStorage\.seed: could not write sessionStorage for http:\/\/127\.0\.0\.1:9000 \(keys: "big"\)/,
		);
	});
});

test.describe("a page that closes while seed registers", () => {
	test("seed fails with its label, the keys and its own line", async ({ page, testStorage, testStorageSecond }) => {
		await testStorage.navigation.goto();
		const here = Number(/sessionStorage\.spec\.ts:(\d+)/.exec(new Error().stack ?? "")?.[1]);
		const seeding = testStorageSecond.sessionStorage.seed({ token: "t" }); // the line the stack must start at
		await page.close();
		const error = await seeding.catch((e: Error) => e);
		expect((error as Error).message).toBe(
			`TestStorageSecond.SessionStorage.seed: the page closed while seed() was registering the seed for ${B} (keys: "token"); await seed() before the test ends`,
		);
		expect((error as Error).stack?.split("\n")[1]).toContain(`sessionStorage.spec.ts:${here + 1}:`);
	});
});

test.describe("overlapping seeds that are never applied", () => {
	test.describe.configure({ mode: "serial" });
	// thrown from the page's close listener; the failing test's worker is replaced, so a file hands the message over
	const messageFile = () =>
		path.join(
			test.info().project.outputDir,
			`never-applied-${test.info().project.name}-${test.info().repeatEachIndex}.txt`,
		);

	test.afterEach(() => {
		const [error] = test.info().errors;
		if (error?.message !== undefined) {
			writeFileSync(messageFile(), error.message);
		}
	});

	test("fail the test when the page closes", async ({ page, testStorage, testStorageSecond }) => {
		test.fail(true, "the never-applied seed must fail this test at close");
		await testStorage.navigation.goto();
		await Promise.all([
			testStorageSecond.sessionStorage.seed({ a: "1" }),
			testStorageSecond.sessionStorage.seed({ b: "2" }),
			testStorageSecond.sessionStorage.seed({ c: "3" }),
		]);
		await page.close();
	});

	test("and the message lists every key, in call order", () => {
		const message = readFileSync(messageFile(), "utf8");
		rmSync(messageFile());
		expect(message.split("\n")[0]).toBe(
			`Error: TestStorageSecond.SessionStorage.seed: the seed for ${B} (keys: "a", "b", "c") was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends`,
		);
	});

	test("seeds for two origins from two helpers fail the test when the page closes", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		test.fail(true, "the never-applied seeds must fail this test at close");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ a: "1" });
		await new SessionStorage(page, { label: "Pay", origin: "https://pay.example" }).seed({ orderId: "42" });
		await page.close();
	});

	test("and the message lists each seed with its helper and the line that called it", () => {
		const message = readFileSync(messageFile(), "utf8");
		rmSync(messageFile());
		const at = "at tests/testApp/sessionStorage\\.spec\\.ts:\\d+:\\d+";
		expect(message).toMatch(
			new RegExp(
				"^Error: TestStorageSecond\\.SessionStorage\\.seed: 2 seeds were never applied: the page closed without navigating to their origins; remove the seed calls, or navigate to the origins before the test ends:\\n" +
					`  TestStorageSecond\\.SessionStorage\\.seed ${at}, for http://127\\.0\\.0\\.1:9000 \\(keys: "a"\\)\\n` +
					`  Pay\\.SessionStorage\\.seed ${at}, for https://pay\\.example \\(keys: "orderId"\\)$`,
			),
		);
	});
});

test.describe("seed and the URL fragment", () => {
	// the fixture page's app is the startup snapshot; location.hash is what a hash-routed app would route by
	const hash = (page: Page) => page.evaluate(() => location.hash);
	const seedSecond = async (testStorage: TestStorage, second: { sessionStorage: TestStorage["sessionStorage"] }) => {
		await testStorage.navigation.goto();
		await second.sessionStorage.seed({ token: "from-A" });
	};

	test("a seeded goto keeps the fragment", async ({ page, testStorage, testStorageSecond }) => {
		await seedSecond(testStorage, testStorageSecond);
		await page.goto(`${B}/teststorage#/orders/7`);
		await expect(page).toHaveURL(`${B}/teststorage#/orders/7`);
		expect(await startup(page)).toEqual({ token: "from-A" });
		expect(await hash(page)).toBe("#/orders/7");
	});

	test("a server redirect from a URL with a fragment keeps it, as the browser does without a seed", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		const redirect = `${A}/teststorage/redirect?status=302&to=${encodeURIComponent(`${B}/teststorage?hop=302`)}`;
		await seedSecond(testStorage, testStorageSecond);
		await page.goto(`${redirect}#/orders/7`);
		await page.waitForURL(onSecondOrigin);
		expect(page.url()).toBe(`${B}/teststorage?hop=302#/orders/7`);
		expect(await startup(page)).toEqual({ token: "from-A" });
	});

	test("a Location with its own fragment keeps that one: a callback with a token", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		const callback = `${B}/teststorage?hop=callback#access_token=abc&state=xyz`;
		await seedSecond(testStorage, testStorageSecond);
		await page.goto(`${A}/teststorage/redirect?status=302&to=${encodeURIComponent(callback)}#/ignored`);
		await page.waitForURL(onSecondOrigin);
		expect(page.url()).toBe(callback);
		expect(await startup(page)).toEqual({ token: "from-A" });
		expect(await hash(page)).toBe("#access_token=abc&state=xyz");
	});

	test("a form POST to an action with a fragment keeps it", async ({ page, testStorage, testStorageSecond }) => {
		await seedSecond(testStorage, testStorageSecond);
		await page.evaluate((action) => {
			(document.getElementById("post-to-second-origin") as HTMLFormElement).action = action;
		}, `${B}/teststorage#/after`);
		await testStorage.getLocator("body.button@submitToSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(page.url()).toBe(`${B}/teststorage#/after`);
		await expect(page.locator("#method")).toHaveText("POST");
		expect(await startup(page)).toEqual({ token: "from-A" });
	});

	for (const status of [307, 308]) {
		test(`a form POST answered by a ${status} from a URL with a fragment keeps the method, the body and the fragment`, async ({
			page,
			testStorage,
			testStorageSecond,
		}) => {
			await seedSecond(testStorage, testStorageSecond);
			await page.evaluate((action) => {
				(document.getElementById("post-307") as HTMLFormElement).action = action;
			}, `/teststorage/login${status}#/after`);
			await testStorage.getLocator("body.button@submit307").click();
			await page.waitForURL(onSecondOrigin);
			expect(page.url()).toBe(`${B}/teststorage?hop=${status}#/after`);
			await expect(page.locator("#method")).toHaveText("POST");
			expect(await readJson(page, "posted")).toEqual({ u: "x y" });
			expect(await startup(page)).toEqual({ token: "from-A" });
		});
	}

	for (const target of [`${B}/teststorage`, `${B}/teststorage#section`]) {
		test(`goto returns the app's response, on the app's document, for ${target}`, async ({
			page,
			testStorage,
			testStorageSecond,
		}) => {
			for (let round = 0; round < 3; round++) {
				await seedSecond(testStorage, testStorageSecond);
				const response = await page.goto(target);
				// no auto-waiting here: these read whatever document goto returned on
				expect(await page.title()).toBe("Session storage playground");
				expect(page.url()).toBe(target);
				expect(response?.status()).toBe(200);
				expect(response?.headers()["x-served-by"]).toBe("server");
			}
		});
	}
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

	test("a page that a worker serves for a navigation is seeded", async ({ page, testStorage, testStorageSecond }) => {
		await testStorageSecond.navigation.goto("/teststorage?worker=1");
		await controlled(page);
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "from-worker-page" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await servedBy(page)).toBe("service-worker");
		expect(await startup(page)).toEqual({ token: "from-worker-page" });
	});

	test("a worker that lets navigations through changes nothing", async ({ page, testStorage, testStorageSecond }) => {
		await testStorageSecond.navigation.goto("/teststorage?worker=passthrough");
		await controlled(page);
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "kept" });

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await servedBy(page)).toBe("server");
		expect(await startup(page)).toEqual({ token: "kept" });
	});
});

test.describe("seed and the app's own navigations", () => {
	const clearSecondOrigin = async (page: Page) => {
		await page.goto(`${B}/teststorage`);
		await page.evaluate(() => sessionStorage.clear());
	};

	for (const [mode, what, expected] of [
		["reload", "reloads", { raced: "1", token: "app" }],
		["replace", "replaces itself on the same origin", { raced: "1", token: "app" }],
		["remove", "removes the seeded key and reloads", { raced: "1" }],
	] as const) {
		test(`the app's first script writes, then ${what}: the seed is not written again (10 rounds)`, async ({
			page,
			testStorage,
			testStorageSecond,
		}) => {
			for (let round = 0; round < 10; round++) {
				await clearSecondOrigin(page);
				await testStorage.navigation.goto();
				await testStorageSecond.sessionStorage.seed({ token: "seeded" });
				await page.goto(`${B}/teststorage/race?mode=${mode}`);
				await expect.poll(() => startup(page)).toEqual(expected);
			}
		});
	}

	test("the app writes, leaves for another origin and comes straight back: the seed is not written again", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await clearSecondOrigin(page);
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "seeded" });
		await page.goto(`${B}/teststorage/race?mode=bounce`);
		await page.waitForURL(`${B}/teststorage?after=bounce`);
		await expect.poll(() => startup(page)).toEqual({ raced: "1", token: "app" });
	});

	test('with waitUntil: "commit", the committed document is the app\'s and already has the entries', async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "at-commit" });
		await page.goto(`${B}/teststorage`, { waitUntil: "commit" });
		expect(page.url()).toBe(`${B}/teststorage`);
		expect(await storedItem(page, "token")).toBe("at-commit");
	});

	test("an arrival by goBack is seeded and keeps its navigation type", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorageSecond.navigation.goto();
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "back" });
		await page.goBack();
		expect(await startup(page)).toEqual({ token: "back" });
		expect((await navigation(page)).type).toBe("back_forward");
	});

	test("a navigation to the origin that commits no document (204) leaves the page where it was and the seed waiting", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "later" });
		const answered = page.waitForResponse(`${B}/teststorage/204`);
		await page.evaluate((url) => {
			location.href = url;
		}, `${B}/teststorage/204`);
		expect((await answered).status()).toBe(204);
		expect(page.url()).toBe(testStorage.fullUrl);

		// a goto, not a click: on Chromium, Playwright's actions keep waiting for the 204 "navigation", seed or not
		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "later" });
	});

	test("a download from the origin leaves the page where it was and the seed waiting", async ({
		page,
		browserName,
		testStorage,
		testStorageSecond,
	}) => {
		test.skip(browserName === "webkit", "WebKit opens the attachment as a document, with or without a seed");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ token: "later" });
		const download = page.waitForEvent("download");
		await page.evaluate((url) => {
			location.href = url;
		}, `${B}/teststorage/download`);
		await download;
		expect(page.url()).toBe(testStorage.fullUrl);

		await testStorage.getLocator("body.link@toSecondOrigin").click();
		await page.waitForURL(onSecondOrigin);
		expect(await startup(page)).toEqual({ token: "later" });
	});

	test("in a browser without the Navigation API, seed fails at the call", async ({ page, testStorage }) => {
		await page.addInitScript(() => {
			Reflect.deleteProperty(window, "navigation");
			Object.defineProperty(window, "navigation", { value: undefined });
			Reflect.deleteProperty(window, "NavigationActivation");
		});
		await testStorage.navigation.goto();
		await expect(testStorage.sessionStorage.seed({ token: "x" }, { origin: B })).rejects.toThrow(
			/^TestStorage\.SessionStorage\.seed: seed\(\) needs the Navigation API \(navigation\.activation\) to write only on the first arrival at http:\/\/127\.0\.0\.1:9000, and this browser has none \(.+\); use set\(\) on the origin and reload instead$/,
		);
	});

	test("a seed with no entries does nothing, so a test that never goes to its origin passes", async ({
		page,
		testStorage,
		testStorageSecond,
	}) => {
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({});
		await testStorage.sessionStorage.seed({});
		expect(await current(page)).toEqual({});
	});

	test("an app that declares its own global navigation does not hide the Navigation API from seed", async ({
		page,
		testStorageSecond,
	}) => {
		await page.goto(`${A}/teststorage/shadowed-navigation`);
		await expect(page.locator("#navigation-global")).toHaveText("the app's own");
		await testStorageSecond.sessionStorage.seed({ token: "seeded" });
		await testStorageSecond.navigation.goto();
		expect(await startup(page)).toEqual({ token: "seeded" });
	});
});

test.describe("a write the browser refuses", () => {
	test.describe.configure({ mode: "serial" });
	// the failing test's worker is replaced, so what the app's first script saw is handed to the next test through a file
	const startupFile = () =>
		path.join(
			test.info().project.outputDir,
			`refused-write-${test.info().project.name}-${test.info().repeatEachIndex}.json`,
		);

	test("fails the test", async ({ page, testStorage, testStorageSecond }) => {
		test.fail(true, "the refused write must fail this test; callSite.spec.ts checks the message and the stack");
		await testStorage.navigation.goto();
		await testStorageSecond.sessionStorage.seed({ big: "x".repeat(12 * 1024 * 1024) });
		await testStorageSecond.navigation.goto();
		writeFileSync(startupFile(), JSON.stringify(await startup(page)));
	});

	test("and the app started without the entries", () => {
		const seen = JSON.parse(readFileSync(startupFile(), "utf8"));
		rmSync(startupFile());
		expect(seen).toEqual({});
	});
});
