import type { ConsoleMessage, Frame } from "@playwright/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	FAILURE_PREFIX,
	inFlightError,
	type NavigationSupport,
	neverAppliedError,
	noNavigationApiError,
	originOf,
	type PendingSeed,
	registryFor,
	type SeedPage,
	SeedRegistry,
	type SeedScriptArg,
	seedScript,
	type TestOutcome,
	writeFailedError,
} from "./sessionStorageSeed";

const A = "http://localhost:9000";
const B = "http://127.0.0.1:9000";
const C = "http://127.0.0.2:9000";

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

describe("seedScript", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	/** Runs the script in a stubbed document and returns what it stored and logged. */
	const run = (document: {
		origin: string;
		selfOrigin?: string;
		top?: boolean;
		from?: unknown;
		setItem?: (key: string, value: string) => void;
	}) => {
		const stored: Record<string, string> = Object.create(null);
		const logged: string[] = [];
		const reported: string[] = [];
		const window: { top?: unknown } = {};
		window.top = document.top === false ? {} : window;
		vi.stubGlobal("window", window);
		vi.stubGlobal("location", { origin: document.origin });
		vi.stubGlobal("self", { origin: document.selfOrigin ?? document.origin });
		vi.stubGlobal("navigation", { activation: { from: document.from ?? null } });
		vi.stubGlobal("sessionStorage", {
			setItem:
				document.setItem ??
				((key: string, value: string) => {
					stored[key] = value;
				}),
		});
		vi.spyOn(console, "error").mockImplementation((message: string) => {
			logged.push(message);
		});
		vi.spyOn(console, "debug").mockImplementation((message: string) => {
			reported.push(message);
		});
		seedScript({
			origin: B,
			entries: [
				["token", "abc"],
				["user", '{"name":"Ada"}'],
				["__proto__", "kept"],
			],
			prefix: FAILURE_PREFIX,
		});
		return { stored, logged, reported };
	};

	it("writes every entry verbatim on the first arrival in the main frame on the origin, a __proto__ key included", () => {
		const { stored, logged } = run({ origin: B });
		expect(Object.entries(stored)).toEqual([
			["token", "abc"],
			["user", '{"name":"Ada"}'],
			["__proto__", "kept"],
		]);
		expect(logged).toEqual([]);
	});

	it("writes nothing in a sub-frame, on another origin, or after a document on the origin (a reload, a hop within it)", () => {
		expect(run({ origin: B, top: false }).stored).toEqual({});
		expect(run({ origin: A }).stored).toEqual({});
		expect(run({ origin: B, from: { url: `${B}/before` } }).stored).toEqual({});
	});

	it("reports a skip on its origin: an opaque document (an error page) and a return there; nothing elsewhere", () => {
		const opaque = run({ origin: B, selfOrigin: "null" });
		expect(opaque.stored).toEqual({});
		expect(opaque.reported).toEqual([`${FAILURE_PREFIX}${JSON.stringify({ origin: B, skipped: "opaque" })}`]);
		const back = run({ origin: B, from: { url: `${B}/before` } });
		expect(back.reported).toEqual([`${FAILURE_PREFIX}${JSON.stringify({ origin: B, skipped: "return" })}`]);
		expect(run({ origin: B, top: false }).reported).toEqual([]);
		expect(run({ origin: A }).reported).toEqual([]);
		expect(run({ origin: B }).reported).toEqual([]);
	});

	it("logs a refused write under the failure prefix, with the origin and the browser's error", () => {
		const { logged } = run({
			origin: B,
			setItem: () => {
				throw new Error("QuotaExceededError: The quota has been exceeded.");
			},
		});
		expect(logged).toEqual([
			`${FAILURE_PREFIX}${JSON.stringify({ origin: B, error: "Error: QuotaExceededError: The quota has been exceeded." })}`,
		]);
	});
});

const frame = (url: string): Frame & { current: string } => {
	const f = { current: url, url: () => f.current } as unknown as Frame & { current: string };
	return f;
};

const fakePage = (options: { navigationApi?: boolean } = {}) => {
	const main = frame("about:blank");
	const scripts: { arg: SeedScriptArg; disposed: boolean; disposals: number }[] = [];
	const listeners: { event: string; listener: unknown }[] = [];
	const held: (() => void)[] = [];
	const emit = (event: string, ...args: unknown[]) => {
		for (const l of listeners.filter((x) => x.event === event)) {
			(l.listener as (...a: unknown[]) => void)(...args);
		}
	};
	const page = {
		main,
		scripts,
		listeners,
		evaluations: 0,
		/** Runs while `addInitScript` is pending, before it resolves. */
		duringAdd: undefined as (() => void) | undefined,
		/** Runs while the Navigation API check is pending, before it resolves. */
		duringEvaluate: undefined as (() => void) | undefined,
		/** Keeps every `addInitScript` pending until `release()`. */
		hold: false,
		/** The next `addInitScript` rejects with this, registering nothing. */
		failNextAdd: undefined as Error | undefined,
		/** Resolves every held `addInitScript`, oldest first. */
		release: () => {
			for (const resolve of held.splice(0)) {
				resolve();
			}
		},
		addInitScript: async (_script: (arg: SeedScriptArg) => void, arg: SeedScriptArg) => {
			const failure = page.failNextAdd;
			if (failure !== undefined) {
				page.failNextAdd = undefined;
				throw failure;
			}
			const record = { arg, disposed: false, disposals: 0 };
			scripts.push(record);
			page.duringAdd?.();
			if (page.hold) {
				await new Promise<void>((resolve) => held.push(resolve));
			}
			return {
				// as Playwright's Disposable: a second dispose throws
				dispose: async () => {
					record.disposals++;
					if (record.disposals > 1) {
						throw new Error("disposableObject.dispose: disposable@fake is disposed more than once");
					}
					record.disposed = true;
				},
			};
		},
		evaluate: async (_pageFunction: () => NavigationSupport): Promise<NavigationSupport> => {
			page.evaluations++;
			page.duringEvaluate?.();
			return { supported: options.navigationApi ?? true, userAgent: "FakeBrowser/1.0" };
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
		/** Emits framenavigated for `f` (the main frame by default) after moving it to `url`. */
		navigate: (url: string, f: Frame & { current: string } = main) => {
			f.current = url;
			emit("framenavigated", f);
		},
		domContentLoaded: () => emit("domcontentloaded"),
		console: (text: string) => emit("console", { text: () => text } as unknown as ConsoleMessage),
		closed: false,
		isClosed: () => page.closed,
		close: () => {
			page.closed = true;
			emit("close");
		},
	};
	return page satisfies SeedPage;
};

const passed: TestOutcome = { status: "passed", errors: [] };
const siteFrame = "    at Object.<anonymous> (/suite/tests/login.spec.ts:12:34)";
const site = Object.assign(new Error(), { stack: `Error\n${siteFrame}` });
const title = "Login.SessionStorage.seed";
const refused = (origin: string) =>
	`${FAILURE_PREFIX}${JSON.stringify({ origin, error: "QuotaExceededError: The quota has been exceeded." })}`;

const setup = (options: { outcome?: () => TestOutcome | undefined; navigationApi?: boolean } = {}) => {
	const page = fakePage({ navigationApi: options.navigationApi });
	const failures: Error[] = [];
	const registry = new SeedRegistry(page, options.outcome ?? (() => passed), (error) => failures.push(error));
	/** Runs `run` and returns the failure it made the registry report, if any. */
	const failure = (run: () => unknown): Error | undefined => {
		run();
		return failures.shift();
	};
	return { page, registry, failure };
};

/** Lets every pending promise callback and timer of the current turn run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("SeedRegistry", () => {
	it("registers one script per origin and the four listeners once; a later seed registers the merged entries, then disposes of the previous script", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1", keep: "k" }, title, site);
		expect(page.scripts.map((s) => s.arg)).toEqual([
			{
				origin: B,
				entries: [
					["token", "1"],
					["keep", "k"],
				],
				prefix: FAILURE_PREFIX,
			},
		]);
		expect(page.listeners.map((l) => l.event)).toEqual(["framenavigated", "domcontentloaded", "console", "close"]);

		await registry.add(B, { token: "2" }, "Other.SessionStorage.seed", site);
		await registry.add(C, { other: "x" }, title, site);
		expect(page.scripts.map((s) => [s.arg.origin, Object.fromEntries(s.arg.entries), s.disposed])).toEqual([
			[B, { token: "1", keep: "k" }, true],
			[B, { token: "2", keep: "k" }, false],
			[C, { other: "x" }, false],
		]);
		expect(page.listeners).toHaveLength(4);
		expect(registry.pendingOrigins).toEqual([B, C]);
		expect(page.evaluations).toBe(1);
	});

	it("keeps a __proto__ key through the merge of pending seeds and into the script's pairs", async () => {
		const { page, registry } = setup();
		await registry.add(B, Object.fromEntries([["__proto__", "x"]]), title, site);
		await registry.add(B, { other: "y" }, title, site);
		expect(page.scripts.map((s) => s.arg.entries)).toEqual([
			[["__proto__", "x"]],
			[
				["__proto__", "x"],
				["other", "y"],
			],
		]);
	});

	it("disposes of an origin's script when the main frame commits there, and ignores sub-frames, other origins and documents without an origin", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1" }, title, site);
		page.navigate(`${B}/frame`, frame("about:blank"));
		page.navigate(`${A}/start`);
		page.navigate("about:blank");
		page.navigate("data:text/html,hi");
		expect(registry.pendingOrigins).toEqual([B]);
		expect(page.scripts[0]?.disposed).toBe(false);

		page.navigate(`${B}/app#/orders/7`);
		expect(registry.pendingOrigins).toEqual([]);
		expect(page.scripts[0]?.disposed).toBe(true);
	});

	it("removes every listener once nothing is pending and the applied document has loaded or another has committed", async () => {
		for (const finish of [
			(page: ReturnType<typeof fakePage>) => page.domContentLoaded(),
			(page: ReturnType<typeof fakePage>) => page.navigate(`${B}/next`),
		]) {
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			await registry.add(C, { other: "x" }, title, site);
			page.navigate(`${B}/app`);
			page.domContentLoaded();
			expect(page.listeners).toHaveLength(4); // C is still pending
			page.navigate(`${C}/app`);
			expect(page.listeners).toHaveLength(4); // C's document may still report a refused write
			finish(page);
			expect(page.listeners).toEqual([]);
		}
	});

	it("decides from the page at the call: a commit before the call's turn counts, and on the origin it writes at once", async () => {
		const { page, registry } = setup();
		// the step overlay's wait: the call is made on about:blank, and B commits before the step's body runs
		const atCall = registry.snapshot();
		page.navigate(`${B}/`);
		let wrote = false;
		const error = await registry
			.add(
				B,
				{ token: "t" },
				title,
				site,
				async () => {
					wrote = true;
				},
				atCall,
			)
			.catch((e: Error) => e);
		atCall.stop();
		expect(wrote).toBe(false);
		expect((error as Error).message).toBe(inFlightError(title, B, site).message);
		expect(page.scripts).toEqual([]);

		// made on the origin, a hop within it before the turn is not an arrival: it writes at once
		const onOrigin = registry.snapshot();
		page.navigate(`${B}/another`);
		await registry.add(
			B,
			{ token: "t" },
			title,
			site,
			async () => {
				wrote = true;
			},
			onOrigin,
		);
		onOrigin.stop();
		expect(wrote).toBe(true);
		expect(page.listeners.filter((l) => l.event === "framenavigated")).toEqual([]);
	});

	it("throws from add when the main frame commits on the origin while the script is being registered, and disposes of it", async () => {
		const { page, registry } = setup();
		page.duringAdd = () => page.navigate(`${B}/app`);
		const error = await registry.add(B, { token: "1" }, title, site).catch((e: unknown) => e as Error);
		expect(error?.message).toBe(
			`${title}: the page committed a document on ${B} while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it`,
		);
		expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
		expect(page.scripts[0]?.disposed).toBe(true);
		expect(registry.pendingOrigins).toEqual([]);
		expect(page.listeners).toEqual([]);
	});

	it("does not throw for a commit on another origin, or in a sub-frame, while the script is being registered", async () => {
		const { page, registry } = setup();
		page.duringAdd = () => {
			page.navigate(`${A}/start`);
			page.navigate(`${B}/frame`, frame("about:blank"));
		};
		await registry.add(B, { token: "1" }, title, site);
		expect(registry.pendingOrigins).toEqual([B]);
	});

	it("checks for the Navigation API once per page and throws, registering nothing, when the browser has none", async () => {
		const { page, registry } = setup({ navigationApi: false });
		const error = await registry.add(B, { token: "1" }, title, site).catch((e: unknown) => e as Error);
		expect(error?.message).toBe(
			`${title}: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at ${B}, and this browser has none (FakeBrowser/1.0); use set() on the origin and reload instead`,
		);
		expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
		expect(page.scripts).toEqual([]);
		expect(page.listeners).toEqual([]);
	});

	it("throws from add when the main frame commits on the origin during the Navigation API check, registering nothing", async () => {
		const { page, registry } = setup();
		page.duringEvaluate = () => page.navigate(`${B}/app`);
		const error = await registry.add(B, { token: "1" }, title, site).catch((e: unknown) => e as Error);
		expect(error?.message).toBe(
			`${title}: the page committed a document on ${B} while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it`,
		);
		expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
		expect(page.scripts).toEqual([]);
		expect(registry.pendingOrigins).toEqual([]);
		expect(page.listeners).toEqual([]);
	});

	describe("overlapping calls for one origin", () => {
		const scriptsOf = (page: ReturnType<typeof fakePage>) =>
			page.scripts.map((s) => [Object.fromEntries(s.arg.entries), s.disposals]);
		const otherFrame = "    at Object.<anonymous> (/suite/tests/login.spec.ts:13:5)";
		const otherSite = Object.assign(new Error(), { stack: `Error\n${otherFrame}` });

		it("merge as awaited calls do: one pending seed with both entries, and every script disposed exactly once", async () => {
			const { page, registry } = setup();
			await Promise.all([
				registry.add(B, { token: "seeded" }, title, site),
				registry.add(B, { other: "x" }, "Other.SessionStorage.seed", site),
			]);
			expect(scriptsOf(page)).toEqual([
				[{ token: "seeded" }, 1],
				[{ token: "seeded", other: "x" }, 0],
			]);
			expect(registry.pendingOrigins).toEqual([B]);

			page.navigate(`${B}/app`);
			expect(scriptsOf(page)).toEqual([
				[{ token: "seeded" }, 1],
				[{ token: "seeded", other: "x" }, 1],
			]);
		});

		it("after a pending seed, merge every key in call order, later calls winning, and the never-applied message lists them all", async () => {
			const { page, registry, failure } = setup();
			await registry.add(B, { a: "1", k: "first" }, title, site);
			await Promise.all([
				registry.add(B, { b: "2", k: "second" }, "Second.SessionStorage.seed", site),
				registry.add(B, { c: "3", k: "third" }, "Third.SessionStorage.seed", site),
			]);
			expect(scriptsOf(page)).toEqual([
				[{ a: "1", k: "first" }, 1],
				[{ a: "1", k: "second", b: "2" }, 1],
				[{ a: "1", k: "third", b: "2", c: "3" }, 0],
			]);
			expect(failure(() => page.close())?.message).toBe(
				`${title}: the seed for ${B} (keys: a, k, b, c) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends`,
			);
		});

		it("register one after the other: a call's script is registered only once the previous call has settled", async () => {
			const { page, registry } = setup();
			page.hold = true;
			const first = registry.add(B, { a: "1" }, title, site);
			const second = registry.add(B, { b: "2" }, title, site);
			await flush();
			expect(scriptsOf(page)).toEqual([[{ a: "1" }, 0]]);

			page.release();
			await first;
			await flush();
			expect(scriptsOf(page)).toEqual([
				[{ a: "1" }, 0],
				[{ a: "1", b: "2" }, 0],
			]);

			page.release();
			await second;
			expect(scriptsOf(page)).toEqual([
				[{ a: "1" }, 1],
				[{ a: "1", b: "2" }, 0],
			]);
		});

		it("all throw when the main frame commits on the origin while the first registers, each at its own call site; the later ones register nothing", async () => {
			const { page, registry } = setup();
			await registry.add(B, { a: "1" }, title, site);
			page.duringAdd = () => page.navigate(`${B}/app`);
			const results = await Promise.allSettled([
				registry.add(B, { b: "2" }, title, site),
				registry.add(B, { c: "3" }, title, otherSite),
			]);
			const errors = results.map((r) => (r.status === "rejected" ? (r.reason as Error) : undefined));
			const message = `${title}: the page committed a document on ${B} while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it`;
			expect(errors.map((e) => e?.message)).toEqual([message, message]);
			expect(errors.map((e) => e?.stack)).toEqual([
				`Error: ${message}\n${siteFrame}`,
				`Error: ${message}\n${otherFrame}`,
			]);
			// the committed document ran the pending seed's script, which is applied and disposed of; the first call's own
			// script is disposed of by that call
			expect(scriptsOf(page)).toEqual([
				[{ a: "1" }, 1],
				[{ a: "1", b: "2" }, 1],
			]);
			expect(registry.pendingOrigins).toEqual([]);
			page.domContentLoaded();
			expect(page.listeners).toEqual([]);
		});

		it("leave the pending seed as it was when one fails, and the next call merges with it", async () => {
			const { page, registry } = setup();
			await registry.add(B, { a: "1" }, title, site);
			page.failNextAdd = new Error("page.addInitScript: Target page, context or browser has been closed");
			const [failed, next] = await Promise.allSettled([
				registry.add(B, { b: "2" }, title, site),
				registry.add(B, { c: "3" }, title, site),
			]);
			expect(failed.status === "rejected" && (failed.reason as Error).message).toBe(
				`${title}: page.addInitScript: Target page, context or browser has been closed`,
			);
			expect(next.status).toBe("fulfilled");
			expect(scriptsOf(page)).toEqual([
				[{ a: "1" }, 1],
				[{ a: "1", c: "3" }, 0],
			]);
			expect(registry.pendingOrigins).toEqual([B]);

			await registry.add(B, { d: "4" }, title, site);
			expect(scriptsOf(page).at(-1)).toEqual([{ a: "1", c: "3", d: "4" }, 0]);
		});

		it("name the call and point at its line when the page closes while a seed registers", async () => {
			const { page, registry } = setup();
			page.closed = true;
			page.failNextAdd = new Error("page.addInitScript: Target page, context or browser has been closed");
			const error = await registry.add(B, { token: "t", locale: "nb" }, title, site).catch((e: Error) => e);
			expect((error as Error).message).toBe(
				`${title}: the page closed while seed() was registering the seed for ${B} (keys: token, locale); await seed() before the test ends`,
			);
			expect((error as Error).cause).toEqual(
				new Error("page.addInitScript: Target page, context or browser has been closed"),
			);
			expect((error as Error).stack?.split("\n")[1]).toBe(siteFrame);
		});

		it("do not hold back calls for another origin", async () => {
			const { page, registry } = setup();
			page.hold = true;
			const calls = [registry.add(B, { a: "1" }, title, site), registry.add(C, { other: "x" }, title, site)];
			await flush();
			expect(page.scripts.map((s) => s.arg.origin)).toEqual([B, C]);
			page.release();
			await Promise.all(calls);
			expect(registry.pendingOrigins).toEqual([B, C]);
		});
	});

	describe("a write the browser refused", () => {
		it("fails the test from the console listener, naming the origin and the keys and pointing at the seed call", async () => {
			const { page, registry, failure } = setup();
			await registry.add(B, { token: "1", user: "u" }, title, site);
			page.navigate(`${B}/app`);
			const error = failure(() => page.console(refused(B)));
			expect(error?.message).toBe(
				`${title}: could not write sessionStorage for ${B} (keys: token, user): QuotaExceededError: The quota has been exceeded.; the app loaded without the entries`,
			);
			expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
			expect(page.listeners).toEqual([]);
		});

		it("is ignored after the applied document has loaded or another has committed, and for other messages", async () => {
			const { page, registry, failure } = setup();
			await registry.add(B, { token: "1" }, title, site);
			await registry.add(C, { other: "x" }, title, site);
			expect(failure(() => page.console(refused(B)))).toBeUndefined(); // not applied yet
			page.navigate(`${B}/app`);
			expect(failure(() => page.console("the app's own message"))).toBeUndefined();
			expect(failure(() => page.console(`${FAILURE_PREFIX}not json`))).toBeUndefined();
			expect(failure(() => page.console(refused(C)))).toBeUndefined();
			page.domContentLoaded();
			expect(failure(() => page.console(refused(B)))).toBeUndefined();
			page.navigate(`${C}/app`);
			page.navigate(`${C}/next`);
			expect(failure(() => page.console(refused(C)))).toBeUndefined();
		});
	});

	describe("a document that took the seed and did not write it", () => {
		const skipped = (origin: string, reason: string) =>
			`${FAILURE_PREFIX}${JSON.stringify({ origin, skipped: reason })}`;

		it("fails the test from the console listener with the reason, pointing at the seed call", async () => {
			for (const [reason, why] of [
				[
					"opaque",
					`the document that arrived on ${B} has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)`,
				],
				[
					"return",
					`the browser counted the page's arrival on ${B} as a return there (navigation.activation.from is set), as after a failed navigation to it`,
				],
			] as const) {
				const { page, registry, failure } = setup();
				await registry.add(B, { token: "1" }, title, site);
				page.navigate(`${B}/app`);
				const error = failure(() => page.console(skipped(B, reason)));
				expect(error?.message).toBe(`${title}: the seed for ${B} (keys: token) was not applied: ${why}`);
				expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
				expect(page.listeners).toEqual([]);
			}
		});

		it("is ignored for a document that did not take a seed", async () => {
			const { page, registry, failure } = setup();
			await registry.add(B, { token: "1" }, title, site);
			expect(failure(() => page.console(skipped(B, "return")))).toBeUndefined(); // still pending
			page.navigate(`${B}/app`);
			page.domContentLoaded();
			expect(failure(() => page.console(skipped(B, "return")))).toBeUndefined(); // applied and loaded
		});
	});

	describe("page close", () => {
		it("fails a passing test when a seed was never applied, naming origins and keys and pointing at the seed call", async () => {
			const { page, registry, failure } = setup();
			await registry.add(B, { token: "1", user: "u" }, title, site);
			await registry.add(C, { other: "x" }, "Other.SessionStorage.seed", site);
			const error = failure(() => page.close());
			expect(error?.message).toBe(
				`${title}: the seed for ${B} (keys: token, user) and the seed for ${C} (keys: other) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends`,
			);
			expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
		});

		it("stays quiet when the test did not pass, already has errors, or is not running", async () => {
			for (const outcome of [
				(): TestOutcome | undefined => ({ status: "failed", errors: [new Error("own")] }),
				(): TestOutcome | undefined => ({ status: "timedOut", errors: [] }),
				(): TestOutcome | undefined => ({ status: "skipped", errors: [] }),
				(): TestOutcome | undefined => ({ status: "passed", errors: [new Error("soft")] }),
				(): TestOutcome | undefined => undefined,
			]) {
				const { page, registry, failure } = setup({ outcome });
				await registry.add(B, { token: "1" }, title, site);
				expect(failure(() => page.close())).toBeUndefined();
			}
		});

		it("stays quiet when every seed was applied", async () => {
			const { page, registry, failure } = setup();
			await registry.add(B, { token: "1" }, title, site);
			page.navigate(`${B}/app`);
			expect(failure(() => page.close())).toBeUndefined();
		});
	});

	it("is shared per page and created on first use", () => {
		const page = fakePage();
		const registry = registryFor(page, () => passed);
		expect(registryFor(page, () => passed)).toBe(registry);
		expect(registryFor(fakePage(), () => passed)).not.toBe(registry);
	});
});

describe("error builders", () => {
	const pending: PendingSeed = {
		entries: { token: "1" },
		title,
		site,
		disposable: { dispose: async () => undefined },
	};

	it("carry the seed call site as their stack", () => {
		for (const error of [
			inFlightError(title, B, site),
			noNavigationApiError(title, B, "FakeBrowser/1.0", site),
			writeFailedError({ keys: ["token"], title, site }, B, "QuotaExceededError"),
			neverAppliedError([[B, pending]]),
		]) {
			expect(error.stack).toBe(`Error: ${error.message}\n${siteFrame}`);
		}
	});

	it("leave the stack alone when no site was captured", () => {
		const error = inFlightError(title, B, Object.assign(new Error(), { stack: "Error" }));
		expect(error.stack).toContain("sessionStorageSeed");
	});
});
