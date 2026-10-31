import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

// defineLocators() and verify() run right after the page object is constructed (once the code that
// called `new` has finished), or at its first locator call if that comes earlier, never inside the
// constructor; so a definition sees the whole page object, and a registry mistake still fails the
// fixture before the test body.

const BASE = "http://localhost:9000";
type Paths = "body" | "body.heading" | "body.link@named" | "body.link@byId" | "body.link@branch";

class StatefulNav extends PageObject<Paths> {
	readonly idPrefix = "self";
	private readonly target: "item" | "other";

	constructor(
		page: Page,
		private readonly linkName: string,
		target: "item" | "other",
	) {
		super(page, BASE, "/testnav", { label: "StatefulNav" });
		this.target = target;
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.heading").getByRole("heading", { level: 1 });
		this.add("body.link@named").getByRole("link", { name: this.linkName });
		this.add("body.link@byId").getById(`${this.idPrefix}-query`);
		this.add("body.link@branch").getByRole("link", { name: this.target === "item" ? "Item 42" : "Another page" });
	}

	branchLinkThroughRegistry() {
		return this.locatorRegistry.getNestedLocator("body.link@branch");
	}
}

class ModeNav extends PageObject<Paths> {
	mode: "query" | "item" = "query";

	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "ModeNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.link@byId").getById(this.mode === "item" ? "item" : "self-query");
	}
}

class CountingNav extends PageObject<Paths> {
	constructor(
		page: Page,
		private readonly counts: { define: number },
	) {
		super(page, BASE, "/testnav", { label: "CountingNav" });
	}

	protected defineLocators() {
		this.counts.define += 1;
		this.add("body").locator("body");
		this.add("body.heading").getByRole("heading", { level: 1 });
	}
}

class TypoNav extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "TypoNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.heading")
			.getByRole("heading")
			.filter({ has: "body.headng" as "body" });
	}
}

class DuplicateNav extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "DuplicateNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body").locator("main");
	}
}

class FieldResolvesNav extends PageObject<Paths> {
	// resolves during field initialization, which runs the definition there; a getter is the recommended form
	readonly heading = this.getNestedLocator("body.heading");

	constructor(
		page: Page,
		private readonly headingName: string,
	) {
		super(page, BASE, "/testnav", { label: "FieldResolvesNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.heading").getByRole("heading", { name: this.headingName });
	}
}

class ValidatesAfterSuper extends PageObject<Paths> {
	constructor(
		page: Page,
		private readonly headingName: string,
	) {
		super(page, BASE, "/testnav", { label: "ValidatesAfterSuper" });
		if (headingName === "") throw new Error("headingName must not be empty");
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.heading").getByRole("heading", { name: this.headingName });
	}
}

class ValidatesBeforeSuper extends PageObject<Paths> {
	constructor(
		page: Page,
		private readonly headingName: string,
	) {
		if (headingName === "") throw new Error("headingName must not be empty");
		super(page, BASE, "/testnav", { label: "ValidatesBeforeSuper" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.heading").getByRole("heading", { name: this.headingName });
	}
}

const VERIFICATION =
	'TypoNav: Locator registry verification failed for 1 of 2 paths:\n  "body.heading": No locator schema registered for path "body.headng".';

class AsyncNav extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "AsyncNav" });
	}

	// async by mistake: TypeScript accepts a Promise where the base method returns void
	protected async defineLocators() {
		this.add("body").locator("body");
		await Promise.resolve();
		this.add("body.heading").getByRole("heading", { level: 1 });
	}
}

const ASYNC =
	"AsyncNav: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.";

const caught = (fn: () => unknown) => {
	try {
		fn();
	} catch (error) {
		return error as Error & { cause?: unknown };
	}
	throw new Error("expected a throw");
};

/** Lets the check scheduled after construction run, so a failure in it would fail this test. */
const afterTheCheck = () => new Promise((resolve) => setTimeout(resolve, 0));

const lifecycleTest = test.extend<{
	statefulNav: StatefulNav;
	typoNav: TypoNav;
	duplicateNav: DuplicateNav;
	asyncNav: AsyncNav;
}>({
	statefulNav: async ({ page }, use) => {
		await use(new StatefulNav(page, "Same page with a hash", "item"));
	},
	typoNav: async ({ page }, use) => {
		await use(new TypoNav(page));
	},
	duplicateNav: async ({ page }, use) => {
		await use(new DuplicateNav(page));
	},
	asyncNav: async ({ page }, use) => {
		await use(new AsyncNav(page));
	},
});

test.describe("what the definition sees", () => {
	lifecycleTest(
		"a parameter property, a field initializer and a constructor-body assignment, in a fixture",
		async ({ page, statefulNav }) => {
			await page.goto(`${BASE}/testnav`);
			await expect(statefulNav.getNestedLocator("body.link@named")).toHaveId("self-hash");
			await expect(statefulNav.getNestedLocator("body.link@byId")).toHaveId("self-query");
			await expect(statefulNav.getNestedLocator("body.link@branch")).toHaveText("Item 42");
		},
	);

	test("the same, for a second instance with other arguments built in the test body", async ({ page }) => {
		const nav = new StatefulNav(page, "Same page with a trailing slash", "other");
		await page.goto(`${BASE}/testnav`);
		await expect(nav.getNestedLocator("body.link@named")).toHaveId("trailing");
		await expect(nav.getNestedLocator("body.link@branch")).toHaveId("other");
	});

	test("a value assigned right after new is seen; one assigned after an await is not (documented)", async ({
		page,
	}) => {
		const sync = new ModeNav(page);
		sync.mode = "item";
		const late = new ModeNav(page);
		await afterTheCheck();
		late.mode = "item";
		await page.goto(`${BASE}/testnav`);
		await expect(sync.getNestedLocator("body.link@byId")).toHaveId("item");
		await expect(late.getNestedLocator("body.link@byId")).toHaveId("self-query");
	});

	test("a field initializer that resolves a locator sees a parameter property under the runner's transform", async ({
		page,
	}) => {
		const nav = new FieldResolvesNav(page, "Navigation playground");
		await page.goto(`${BASE}/testnav`);
		await expect(nav.heading).toHaveText("Navigation playground");
	});
});

test.describe("when the definition runs", () => {
	test("direct use of the protected registry and a destructured accessor resolve against DOM", async ({ page }) => {
		const nav = new StatefulNav(page, "Same page with a hash", "item");
		const { getNestedLocator } = nav;
		await page.goto(`${BASE}/testnav`);
		await expect(nav.branchLinkThroughRegistry()).toHaveId("item");
		await expect(getNestedLocator("body.link@named")).toHaveId("self-hash");
	});

	test("once per instance, across the check and many uses", async ({ page }) => {
		const counts = { define: 0 };
		const nav = new CountingNav(page, counts);
		expect(counts.define).toBe(0);
		await afterTheCheck();
		expect(counts.define).toBe(1);
		await page.goto(`${BASE}/testnav`);
		for (let i = 0; i < 5; i += 1) {
			await expect(nav.getNestedLocator("body.heading")).toHaveText("Navigation playground");
		}
		expect(counts.define).toBe(1);
	});
});

test.describe("registry mistakes at a first use", () => {
	test("a verification failure is thrown at the use, labeled, with the cause, and the check does not fail the test afterwards", async ({
		page,
	}) => {
		const nav = new TypoNav(page);
		const first = caught(() => nav.getNestedLocator("body.heading"));
		expect(first.message).toBe(VERIFICATION);
		expect((first.cause as Error).message).toBe(VERIFICATION.slice("TypoNav: ".length));
		expect(caught(() => nav.getLocator("body"))).toBe(first);
		await afterTheCheck();
	});

	test("the same through expect(…).toThrow", async ({ page }) => {
		expect(() => new TypoNav(page).getNestedLocator("body.heading")).toThrowError(VERIFICATION);
		await afterTheCheck();
	});

	test("a registration error is labeled with defineLocators()", async ({ page }) => {
		expect(() => new DuplicateNav(page).getLocator("body")).toThrowError(
			/^DuplicateNav: defineLocators\(\) failed: A locator schema with the path "body" already exists\./,
		);
		await afterTheCheck();
	});

	test("an async definition fails at the use, and stays failed once the rest of it has run", async ({ page }) => {
		const nav = new AsyncNav(page);
		const first = caught(() => nav.getLocator("body"));
		expect(first.message).toBe(ASYNC);
		await afterTheCheck();
		expect(caught(() => nav.getNestedLocator("body.heading"))).toBe(first);
	});
});

test.describe("registry mistakes in the check right after construction", () => {
	// the check fails the test before its body; the message and the stack are asserted in src/pageObject.test.ts
	lifecycleTest.fail("a fixture that builds a page object with a has typo fails the test", async ({ typoNav }) => {
		void typoNav;
	});

	lifecycleTest.fail(
		"a fixture that builds a page object with a duplicate path fails the test",
		async ({ duplicateNav }) => {
			void duplicateNav;
		},
	);

	test.describe("an async definition in a fixture", () => {
		test.describe.configure({ mode: "serial" });
		// the failing test's worker is replaced, so its error is handed to the next test through a file
		const errorFile = () =>
			path.join(
				test.info().project.outputDir,
				`async-define-${test.info().project.name}-${test.info().repeatEachIndex}.txt`,
			);
		test.afterEach(() => {
			const [error] = test.info().errors;
			if (error?.message !== undefined) {
				writeFileSync(errorFile(), error.message);
			}
		});

		lifecycleTest.fail("fails the test", async ({ asyncNav }) => {
			void asyncNav;
		});

		test("with the labeled message", () => {
			const message = readFileSync(errorFile(), "utf8");
			rmSync(errorFile());
			expect(message).toContain(ASYNC);
		});
	});

	test.describe("a broken page object built in beforeEach", () => {
		let nav: TypoNav;
		test.beforeEach(async ({ page }) => {
			nav = new TypoNav(page);
		});
		test.fail("fails the test", async () => {
			void nav;
		});
	});
});

test.describe("constructors that throw", () => {
	test("validation after super(): the error, and nothing more when the definition reads only parameter properties", async ({
		page,
	}) => {
		expect(() => new ValidatesAfterSuper(page, "")).toThrow("headingName must not be empty");
		await afterTheCheck();
	});

	test("validation before super(), the documented form: the error, and nothing scheduled", async ({ page }) => {
		expect(() => new ValidatesBeforeSuper(page, "")).toThrow("headingName must not be empty");
		await afterTheCheck();
		const nav = new ValidatesBeforeSuper(page, "Navigation playground");
		await page.goto(`${BASE}/testnav`);
		await expect(nav.getNestedLocator("body.heading")).toBeVisible();
	});
});
