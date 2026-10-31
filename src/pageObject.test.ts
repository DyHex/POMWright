import type { Page } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, type MockInstance, vi } from "vitest";
import { type GetNestedLocatorAccessor, type LocatorRegistry, LocatorRegistryInternal } from "./locators";
import { PageObject, type PageObjectOptions } from "./pageObject";

// Construction touches no Page method, so a chainable stub that records the strategy calls stands in for the page;
// it could hide a call Playwright would reject or what the locators match, which test/tests/pageObject/ checks on real
// pages, through the packed package.
const createStubPage = () => {
	const calls: { method: string; args: unknown[] }[] = [];
	const chain: object = new Proxy(
		{},
		{
			get: (_target, key) =>
				typeof key === "symbol" || key === "then"
					? undefined
					: (...args: unknown[]) => {
							calls.push({ method: key, args });
							return chain;
						},
		},
	);
	return { page: chain as Page, calls };
};

/**
 * Constructs with the check that `PageObject` schedules recorded instead of queued, so a test can run it
 * where it can assert on it. The spy is installed only around the `new` expression: in that synchronous
 * window nothing but `PageObject` schedules, whereas a spy left in place would also swallow microtasks
 * that vitest and Node schedule. A stand-in for the microtask: it could hide what running later changes (an error
 * thrown outside the code under test, a test going on past the `new` line), which `lifecycle.spec.ts` and
 * `lifecycle.outcomes.spec.ts` in test/tests/pageObject/ check in Playwright's runner.
 */
const construct = <T>(make: () => T) => {
	const scheduled: (() => void)[] = [];
	const spy = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
		scheduled.push(callback);
	});
	let instance: T | undefined;
	let error: unknown;
	try {
		instance = make();
	} catch (thrown) {
		error = thrown;
	} finally {
		spy.mockRestore();
	}
	const runCheck = () => {
		for (const callback of scheduled) {
			callback();
		}
	};
	return { instance: instance as T, error, scheduled, runCheck };
};

const caught = (fn: () => unknown) => {
	try {
		fn();
	} catch (error) {
		return error as Error & { cause?: unknown };
	}
	throw new Error("expected a throw");
};

/** The first stack frame of an error whose message may span several lines. */
const firstFrame = (error: Error) => (error.stack ?? "").split("\n").find((line) => line.trim().startsWith("at "));

const BASE = "https://app.example";
type Paths = "main" | "main.button" | "main.link" | "extra";
type Locale = "en" | "nb";
const loginLabel = { en: "Log in", nb: "Logg inn" } as const;

// the locator module pattern of the docs (Locator modules), with page-object state as an argument
type ModulePaths = "main" | "main.button";
function defineModule<ExternalPaths extends string = never>(
	registry: LocatorRegistry<ModulePaths | ExternalPaths>,
	locale: Locale,
): void;
function defineModule(registry: LocatorRegistry<ModulePaths>, locale: Locale) {
	registry.add("main").locator("main");
	registry.add("main.button").getByRole("button", { name: loginLabel[locale] });
}

class Counting extends PageObject<Paths> {
	constructor(
		page: Page,
		private readonly counts: { define: number },
	) {
		super(page, BASE, "/login", { label: "Counting" });
	}
	protected defineLocators() {
		this.counts.define += 1;
		defineModule(this.locatorRegistry, "en");
		this.add("main.link").getByRole("link");
	}
	registryCall(method: "add" | "getLocator" | "getNestedLocator" | "getLocatorSchema" | "verify") {
		switch (method) {
			case "add":
				return this.locatorRegistry.add("extra").locator("aside");
			case "getLocator":
				return this.locatorRegistry.getLocator("main");
			case "getNestedLocator":
				return this.locatorRegistry.getNestedLocator("main.button");
			case "getLocatorSchema":
				return this.locatorRegistry.getLocatorSchema("main.button");
			case "verify":
				return this.locatorRegistry.verify();
		}
	}
	reusable() {
		return this.locatorRegistry.createReusable.locator("aside");
	}
	readRegistry() {
		return this.locatorRegistry;
	}
	types() {
		expectTypeOf(this.locatorRegistry).toEqualTypeOf<LocatorRegistry<Paths>>();
	}
}

let verifySpy: MockInstance;
beforeEach(() => {
	verifySpy = vi.spyOn(LocatorRegistryInternal.prototype, "verify");
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe("when the definition runs", () => {
	it("construction defines nothing and schedules one check, which defines and verifies once", () => {
		const counts = { define: 0 };
		const { page } = createStubPage();
		const { scheduled, runCheck } = construct(() => new Counting(page, counts));
		expect(counts.define).toBe(0);
		expect(verifySpy).toHaveBeenCalledTimes(0);
		expect(scheduled).toHaveLength(1);

		runCheck();
		expect(counts.define).toBe(1);
		expect(verifySpy).toHaveBeenCalledTimes(1);

		runCheck();
		expect(counts.define).toBe(1);
		expect(verifySpy).toHaveBeenCalledTimes(1);
	});

	it("the check is a real microtask: it has run once the constructing code awaits", async () => {
		const counts = { define: 0 };
		const po = new Counting(createStubPage().page, counts);
		expect(counts.define).toBe(0);
		await Promise.resolve();
		expect(counts.define).toBe(1);
		po.getNestedLocator("main.button");
		po.getLocator("main");
		expect(counts.define).toBe(1);
		expect(verifySpy).toHaveBeenCalledTimes(1);
	});

	it("each locator call before the check defines and verifies once, and the check then does nothing", () => {
		const triggers: [string, (po: Counting) => unknown][] = [
			["add", (po) => po.add("extra").locator("aside")],
			["getLocator", (po) => po.getLocator("main")],
			["getNestedLocator", (po) => po.getNestedLocator("main.button")],
			["getLocatorSchema", (po) => po.getLocatorSchema("main.button")],
			[
				"a destructured accessor",
				(po) => {
					const { getNestedLocator } = po;
					return getNestedLocator("main.button");
				},
			],
			["this.locatorRegistry.add", (po) => po.registryCall("add")],
			["this.locatorRegistry.getLocator", (po) => po.registryCall("getLocator")],
			["this.locatorRegistry.getNestedLocator", (po) => po.registryCall("getNestedLocator")],
			["this.locatorRegistry.getLocatorSchema", (po) => po.registryCall("getLocatorSchema")],
			["this.locatorRegistry.verify", (po) => po.registryCall("verify")],
		];
		for (const [name, trigger] of triggers) {
			verifySpy.mockClear();
			const counts = { define: 0 };
			const { instance, runCheck } = construct(() => new Counting(createStubPage().page, counts));
			trigger(instance);
			expect(counts.define, name).toBe(1);
			expect(verifySpy, name).toHaveBeenCalledTimes(1);
			runCheck();
			instance.getNestedLocator("main.button");
			expect(counts.define, name).toBe(1);
		}
	});

	it("add from outside registers after the definition", () => {
		const { page, calls } = createStubPage();
		const { instance } = construct(() => new Counting(page, { define: 0 }));
		instance.add("extra").locator("aside");
		instance.getLocator("extra");
		expect(calls.filter((call) => call.method === "locator").map((call) => call.args[0])).toContain("aside");
	});

	it("a later verify() through the registry verifies again", () => {
		const { instance, runCheck } = construct(() => new Counting(createStubPage().page, { define: 0 }));
		runCheck();
		instance.registryCall("verify");
		expect(verifySpy).toHaveBeenCalledTimes(2);
	});

	it("createReusable and reading the member do not run the definition", () => {
		const counts = { define: 0 };
		const { instance, runCheck } = construct(() => new Counting(createStubPage().page, counts));
		instance.reusable();
		instance.readRegistry();
		expect(counts.define).toBe(0);
		runCheck();
		expect(counts.define).toBe(1);
	});
});

describe("what the definition sees", () => {
	class Localized extends PageObject<Paths> {
		readonly prefix = "login";
		private readonly mode: "query" | "item";
		suffix = "a";
		constructor(
			page: Page,
			private readonly locale: Locale,
			mode: "query" | "item",
		) {
			super(page, BASE, "/login", { label: "Localized" });
			this.mode = mode;
		}
		protected defineLocators() {
			defineModule(this.locatorRegistry, this.locale);
			this.add("main.link").getByTestId(`${this.prefix}-${this.mode}-${this.suffix}`);
		}
	}

	it("sees a parameter property, a field initializer, a constructor-body assignment and a value set right after new", () => {
		const { page, calls } = createStubPage();
		const { instance, runCheck } = construct(() => new Localized(page, "nb", "item"));
		instance.suffix = "z";
		runCheck();
		expect(calls).toContainEqual({ method: "getByRole", args: ["button", { name: "Logg inn" }] });
		expect(calls).toContainEqual({ method: "getByTestId", args: ["login-item-z"] });
	});

	it("two instances with different arguments define their own locators", () => {
		const nb = createStubPage();
		const en = createStubPage();
		construct(() => new Localized(nb.page, "nb", "query")).runCheck();
		construct(() => new Localized(en.page, "en", "query")).runCheck();
		expect(nb.calls).toContainEqual({ method: "getByRole", args: ["button", { name: "Logg inn" }] });
		expect(en.calls).toContainEqual({ method: "getByRole", args: ["button", { name: "Log in" }] });
	});

	it("a resolution and a verify() inside defineLocators() work on the paths registered so far and do not recurse", () => {
		const counts = { define: 0 };
		class Reentrant extends PageObject<Paths> {
			constructor(page: Page) {
				super(page, BASE, "/login", { label: "Reentrant" });
			}
			protected defineLocators() {
				counts.define += 1;
				this.add("main").locator("main");
				this.getLocator("main");
				this.locatorRegistry.verify();
				this.add("main.button").getByRole("button");
			}
		}
		const { runCheck } = construct(() => new Reentrant(createStubPage().page));
		runCheck();
		expect(counts.define).toBe(1);
		// the inner verify() of the partial registry, then the automatic one
		expect(verifySpy).toHaveBeenCalledTimes(2);
	});
});

describe("failures", () => {
	class Duplicate extends PageObject<Paths> {
		constructor(page: Page, label?: string) {
			super(page, BASE, "/login", label === undefined ? undefined : { label });
		}
		protected defineLocators() {
			this.add("main").locator("main");
			this.add("main").locator("body");
		}
	}
	class Broken extends PageObject<Paths> {
		private readonly texts?: { login: string };
		constructor(page: Page) {
			super(page, BASE, "/login", { label: "Broken" });
		}
		protected defineLocators() {
			this.add("main.button").getByRole("button", { name: (this.texts as { login: string }).login });
		}
	}
	class Typo extends PageObject<Paths> {
		constructor(page: Page) {
			super(page, BASE, "/login", { label: "Typo" });
		}
		protected defineLocators() {
			this.add("main").locator("main");
			this.add("main.button")
				.getByRole("button")
				.filter({ has: "main.titel" as "main" });
		}
	}
	const VERIFICATION =
		'Typo: Locator registry verification failed for 1 of 2 paths:\n  "main.button": No locator schema registered for path "main.titel".';

	it("a registration error from the check is labeled, keeps the original as cause, and points at the construction site", () => {
		const { runCheck } = construct(() => new Duplicate(createStubPage().page));
		const error = caught(runCheck);
		expect(error.message).toMatch(
			/^Duplicate: defineLocators\(\) failed: A locator schema with the path "main" already exists\./,
		);
		expect(error.cause).toBeInstanceOf(Error);
		expect((error.cause as Error).message).toMatch(/^A locator schema with the path "main" already exists\./);
		expect(firstFrame(error)).toContain("pageObject.test.ts");
		expect(error.stack).not.toMatch(/[\\/]pageObject\.ts/);
	});

	it("an error in the subclass's own code is wrapped the same way", () => {
		const error = caught(construct(() => new Broken(createStubPage().page)).runCheck);
		expect(error.message).toBe(
			"Broken: defineLocators() failed: Cannot read properties of undefined (reading 'login')",
		);
		expect(error.cause).toBeInstanceOf(TypeError);
	});

	it("a verification failure is labeled with the verification message", () => {
		const error = caught(construct(() => new Typo(createStubPage().page)).runCheck);
		expect(error.message).toBe(VERIFICATION);
		expect((error.cause as Error).message).toBe(VERIFICATION.slice("Typo: ".length));
	});

	it("the failure is sticky: later calls throw the same error and the definition does not run again", () => {
		let defined = 0;
		class Once extends Duplicate {
			protected override defineLocators() {
				defined += 1;
				super.defineLocators();
			}
		}
		const { instance, runCheck } = construct(() => new Once(createStubPage().page));
		const first = caught(runCheck);
		expect(caught(() => instance.getLocator("main"))).toBe(first);
		expect(caught(() => instance.getNestedLocator("main.button"))).toBe(first);
		expect(defined).toBe(1);
	});

	it("the label option names the page object", () => {
		const error = caught(construct(() => new Duplicate(createStubPage().page, "Custom")).runCheck);
		expect(error.message).toMatch(/^Custom: defineLocators\(\) failed:/);
	});

	describe("an async definition", () => {
		const ASYNC =
			"Async: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.";
		class Async extends PageObject<Paths> {
			constructor(
				page: Page,
				private readonly fail = false,
			) {
				super(page, BASE, "/login", { label: "Async" });
			}
			// TypeScript accepts a Promise where the base method returns void
			protected async defineLocators() {
				this.add("main").locator("main");
				await Promise.resolve();
				if (this.fail) {
					throw new Error("after the first await");
				}
				this.add("main.button").getByRole("button");
			}
		}

		it("fails the check with the labeled message, before verify()", () => {
			const error = caught(construct(() => new Async(createStubPage().page)).runCheck);
			expect(error.message).toBe(ASYNC);
			expect(error.cause).toBeUndefined();
			expect(verifySpy).not.toHaveBeenCalled();
		});

		it("is kept: later calls throw the same error, also after the rest of the definition has run", async () => {
			const { instance, runCheck } = construct(() => new Async(createStubPage().page));
			const first = caught(runCheck);
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(caught(() => instance.getLocator("main"))).toBe(first);
			expect(caught(() => instance.getNestedLocator("main.button"))).toBe(first);
		});

		it("leaves no unhandled rejection when the rest of the definition throws", async () => {
			const unhandled: unknown[] = [];
			const record = (reason: unknown) => unhandled.push(reason);
			process.on("unhandledRejection", record);
			try {
				const error = caught(construct(() => new Async(createStubPage().page, true)).runCheck);
				expect(error.message).toBe(ASYNC);
				await new Promise((resolve) => setTimeout(resolve, 10));
			} finally {
				process.off("unhandledRejection", record);
			}
			expect(unhandled).toEqual([]);
		});
	});

	it("a failure at a first use is thrown there, and the check then does nothing", () => {
		const { instance, runCheck } = construct(() => new Typo(createStubPage().page));
		expect(() => instance.getNestedLocator("main")).toThrowError(VERIFICATION);
		expect(runCheck).not.toThrow();
		expect(() => instance.getLocator("main")).toThrowError(VERIFICATION);
	});

	it("a subclass constructor that throws after super(): nothing more when the definition reads only state that is set", () => {
		class Strict extends PageObject<Paths> {
			constructor(
				page: Page,
				private readonly headingName: string,
			) {
				super(page, BASE, "/login", { label: "Strict" });
				if (headingName === "") throw new Error("headingName must not be empty");
			}
			protected defineLocators() {
				this.add("main").getByRole("heading", { name: this.headingName });
			}
		}
		const { error, scheduled, runCheck } = construct(() => new Strict(createStubPage().page, ""));
		expect((error as Error).message).toBe("headingName must not be empty");
		expect(scheduled).toHaveLength(1);
		expect(runCheck).not.toThrow();
	});

	it("a subclass constructor that throws after super(): a second, labeled error when the definition reads a field it never set (documented)", () => {
		class Strict extends PageObject<Paths> {
			private readonly title: string;
			constructor(page: Page, heading: string) {
				super(page, BASE, "/login", { label: "Strict" });
				if (heading === "") throw new Error("heading must not be empty");
				this.title = heading;
			}
			protected defineLocators() {
				this.add("main").getByRole("heading", { name: this.title.toUpperCase() });
			}
		}
		const { error, runCheck } = construct(() => new Strict(createStubPage().page, ""));
		expect((error as Error).message).toBe("heading must not be empty");
		expect(runCheck).toThrowError(/^Strict: defineLocators\(\) failed: Cannot read properties of undefined/);
	});

	it("a constructor that throws in PageObject itself (an invalid URL) schedules nothing", () => {
		class BadUrl extends PageObject<Paths> {
			constructor(page: Page) {
				super(page, "app.example", "/login", { label: "BadUrl" });
			}
			protected defineLocators() {}
		}
		const { error, scheduled } = construct(() => new BadUrl(createStubPage().page));
		expect((error as Error).message).toMatch(/^BadUrl: baseUrl must be an origin/);
		expect(scheduled).toHaveLength(0);
	});
});

describe("a registration kept by a page object", () => {
	class Keeping extends PageObject<Paths> {
		private kept: { filter: (filter: { hasText: string }) => unknown } | undefined;
		constructor(page: Page) {
			super(page, BASE, "/login", { label: "Keeping" });
		}
		protected defineLocators() {
			this.add("main").locator("main");
			this.kept = this.add("main.button").getByRole("button");
		}
		narrow() {
			return this.kept?.filter({ hasText: "Pay" });
		}
	}

	it("ends with defineLocators() and its check: a step from a method afterwards throws and registers nothing", () => {
		const { page, calls } = createStubPage();
		const { instance, runCheck } = construct(() => new Keeping(page));
		runCheck();
		expect(() => instance.narrow()).toThrowError(
			'filter() cannot apply to "main.button": its registration was ended by verify(); give a registration all its steps in its add(…) chain, or query the path for one use.',
		);
		calls.length = 0;
		instance.getNestedLocator("main.button");
		expect(calls.map((call) => call.method)).toEqual(["locator", "getByRole", "describe"]);
	});
});

describe("the locators option", () => {
	class Sparse extends PageObject<Paths> {
		constructor(page: Page, strictChains?: boolean) {
			super(page, BASE, "/login", { label: "Sparse", locators: { strictChains } });
		}
		protected defineLocators() {
			this.add("main.button").getByRole("button");
		}
	}

	it("strictChains reaches the registry: a sparse definition fails the scheduled check with the labeled message", () => {
		const { page } = createStubPage();
		const { runCheck } = construct(() => new Sparse(page, true));
		expect(runCheck).toThrowError(
			'Sparse: Locator registry verification failed for 1 of 1 paths:\n  "main.button": strictChains requires every ancestor to be registered; "main" is not.',
		);
	});

	it("without it, or with false, a sparse definition passes", () => {
		const { page } = createStubPage();
		for (const strictChains of [undefined, false]) {
			const { runCheck } = construct(() => new Sparse(page, strictChains));
			expect(runCheck).not.toThrow();
		}
	});
});

describe("the post-navigation actions hook", () => {
	class NoHook extends PageObject<Paths> {
		constructor(page: Page) {
			super(page, BASE, "/login");
		}
		protected defineLocators() {}
		actions() {
			return this.pageActionsToPerformAfterNavigation();
		}
	}

	it("is optional and returns no actions by default", () => {
		const { instance, runCheck } = construct(() => new NoHook(createStubPage().page));
		runCheck();
		expect(instance.actions()).toEqual([]);
	});
});

// Type-level contract, checked by vitest's typecheck mode; the classes are never constructed.
class EmptyHook extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/");
	}
	protected defineLocators() {}
	protected pageActionsToPerformAfterNavigation() {
		return [];
	}
}
class NullHook extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/");
	}
	protected defineLocators() {}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}
class AnnotatedHook extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/");
	}
	protected defineLocators() {}
	// the 2.x annotation keeps compiling
	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [async () => {}];
	}
}
// @ts-expect-error defineLocators() stays abstract
class NoDefine extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/");
	}
}
const typeContract = (po: Counting) => {
	expectTypeOf(po.getNestedLocator).toEqualTypeOf<GetNestedLocatorAccessor<Paths>>();
	expectTypeOf(po.add).toEqualTypeOf<LocatorRegistry<Paths>["add"]>();
	po.types();
};
void [EmptyHook, NullHook, AnnotatedHook, NoDefine, typeContract];

describe("the URL parts at construction", () => {
	class FromVariables extends PageObject<Paths> {
		constructor(page: Page, baseUrl: unknown, urlPath: unknown) {
			super(page, baseUrl as string, urlPath as string, { label: "FromVariables" });
		}
		protected defineLocators() {}
	}

	it("a part that is neither a string nor a RegExp throws with the label and schedules nothing", () => {
		const { page } = createStubPage();
		for (const [baseUrl, urlPath, message] of [
			[undefined, "/login", "FromVariables: baseUrl must be a string or a RegExp; received undefined."],
			[null, "/login", "FromVariables: baseUrl must be a string or a RegExp; received null."],
			[BASE, undefined, "FromVariables: urlPath must be a string or a RegExp; received undefined."],
		] as const) {
			const { error, scheduled } = construct(() => new FromVariables(page, baseUrl, urlPath));
			expect((error as Error).message).toBe(message);
			expect(scheduled).toHaveLength(0);
		}
	});
});

describe("PageObjectOptions", () => {
	it("is the constructor's options, so a domain base class forwards them by name", () => {
		abstract class Domain<P extends string> extends PageObject<P> {
			protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
				super(page, BASE, urlPath, { ...options, locators: { strictChains: true, ...options?.locators } });
			}
		}
		class Login extends Domain<Paths> {
			constructor(page: Page) {
				super(page, "/login", { label: "Login", navOptions: { timeout: 1 } });
			}
			protected defineLocators() {
				this.add("main").locator("main");
			}
		}
		const { instance, runCheck } = construct(() => new Login(createStubPage().page));
		expect(runCheck).not.toThrow();
		expect(instance.label).toBe("Login");
		expectTypeOf<PageObjectOptions["locators"]>().toEqualTypeOf<{ strictChains?: boolean } | undefined>();
	});
});
