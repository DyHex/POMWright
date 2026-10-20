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
		top?: boolean;
		from?: unknown;
		setItem?: (key: string, value: string) => void;
	}) => {
		const stored: Record<string, string> = {};
		const logged: string[] = [];
		const window: { top?: unknown } = {};
		window.top = document.top === false ? {} : window;
		vi.stubGlobal("window", window);
		vi.stubGlobal("location", { origin: document.origin });
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
		seedScript({ origin: B, entries: { token: "abc", user: '{"name":"Ada"}' }, prefix: FAILURE_PREFIX });
		return { stored, logged };
	};

	it("writes every entry verbatim on the first arrival in the main frame on the origin", () => {
		expect(run({ origin: B })).toEqual({ stored: { token: "abc", user: '{"name":"Ada"}' }, logged: [] });
	});

	it("writes nothing in a sub-frame, on another origin, or after a document on the origin (a reload, a hop within it)", () => {
		expect(run({ origin: B, top: false }).stored).toEqual({});
		expect(run({ origin: A }).stored).toEqual({});
		expect(run({ origin: B, from: { url: `${B}/before` } }).stored).toEqual({});
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
	const scripts: { arg: SeedScriptArg; disposed: boolean }[] = [];
	const listeners: { event: string; listener: unknown }[] = [];
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
		addInitScript: async (_script: (arg: SeedScriptArg) => void, arg: SeedScriptArg) => {
			const record = { arg, disposed: false };
			scripts.push(record);
			page.duringAdd?.();
			return {
				dispose: async () => {
					record.disposed = true;
				},
			};
		},
		evaluate: async (_pageFunction: () => NavigationSupport): Promise<NavigationSupport> => {
			page.evaluations++;
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
		close: () => emit("close"),
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
	const registry = new SeedRegistry(page, options.outcome ?? (() => passed));
	return { page, registry };
};

const caught = (run: () => unknown): Error | undefined => {
	try {
		run();
	} catch (error) {
		return error as Error;
	}
	return undefined;
};

describe("SeedRegistry", () => {
	it("registers one script per origin and the four listeners once; a later seed registers the merged entries, then disposes of the previous script", async () => {
		const { page, registry } = setup();
		await registry.add(B, { token: "1", keep: "k" }, title, site);
		expect(page.scripts.map((s) => s.arg)).toEqual([
			{ origin: B, entries: { token: "1", keep: "k" }, prefix: FAILURE_PREFIX },
		]);
		expect(page.listeners.map((l) => l.event)).toEqual(["framenavigated", "domcontentloaded", "console", "close"]);

		await registry.add(B, { token: "2" }, "Other.SessionStorage.seed", site);
		await registry.add(C, { other: "x" }, title, site);
		expect(page.scripts.map((s) => [s.arg.origin, s.arg.entries, s.disposed])).toEqual([
			[B, { token: "1", keep: "k" }, true],
			[B, { token: "2", keep: "k" }, false],
			[C, { other: "x" }, false],
		]);
		expect(page.listeners).toHaveLength(4);
		expect(registry.pendingOrigins).toEqual([B, C]);
		expect(page.evaluations).toBe(1);
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

	describe("a write the browser refused", () => {
		it("fails the test from the console listener, naming the origin and the keys and pointing at the seed call", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1", user: "u" }, title, site);
			page.navigate(`${B}/app`);
			const error = caught(() => page.console(refused(B)));
			expect(error?.message).toBe(
				`${title}: could not write sessionStorage for ${B} (keys: token, user): QuotaExceededError: The quota has been exceeded.; the app loaded without the entries`,
			);
			expect(error?.stack).toBe(`Error: ${error?.message}\n${siteFrame}`);
			expect(page.listeners).toEqual([]);
		});

		it("is ignored after the applied document has loaded or another has committed, and for other messages", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			await registry.add(C, { other: "x" }, title, site);
			expect(caught(() => page.console(refused(B)))).toBeUndefined(); // not applied yet
			page.navigate(`${B}/app`);
			expect(caught(() => page.console("the app's own message"))).toBeUndefined();
			expect(caught(() => page.console(`${FAILURE_PREFIX}not json`))).toBeUndefined();
			expect(caught(() => page.console(refused(C)))).toBeUndefined();
			page.domContentLoaded();
			expect(caught(() => page.console(refused(B)))).toBeUndefined();
			page.navigate(`${C}/app`);
			page.navigate(`${C}/next`);
			expect(caught(() => page.console(refused(C)))).toBeUndefined();
		});
	});

	describe("page close", () => {
		it("fails a passing test when a seed was never applied, naming origins and keys and pointing at the seed call", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1", user: "u" }, title, site);
			await registry.add(C, { other: "x" }, "Other.SessionStorage.seed", site);
			const error = caught(() => page.close());
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
				const { page, registry } = setup({ outcome });
				await registry.add(B, { token: "1" }, title, site);
				expect(() => page.close()).not.toThrow();
			}
		});

		it("stays quiet when every seed was applied", async () => {
			const { page, registry } = setup();
			await registry.add(B, { token: "1" }, title, site);
			page.navigate(`${B}/app`);
			expect(() => page.close()).not.toThrow();
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
