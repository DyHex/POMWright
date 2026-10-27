import { test } from "@playwright/test";
import { PageObject, SessionStorage, step } from "pomwright";

// Each probed call is marked with `// LOCATION <id>` on its line; locationReporter.ts checks that the report puts the
// step titled with that id, and an error carrying it, on that line.

class Widget {
	@step("LOCATION plain")
	async plain() {}

	@step("LOCATION boxed", { box: true })
	async boxed() {}

	@step("LOCATION boxed-via-helper", { box: true })
	async boxedViaHelper() {}

	async helper() {
		await this.boxedViaHelper(); // LOCATION boxed-via-helper
	}

	@step("LOCATION boxed-throws", { box: true })
	async boxedThrows() {
		throw new Error("LOCATION boxed-throws");
	}

	// a boxed step inside a boxed step: Playwright skips no frame under a boxed ancestor, so the location is passed
	@step("LOCATION nested-outer", { box: true })
	async nestedOuter() {
		await this.nestedInner(); // LOCATION nested-inner
	}

	@step("LOCATION nested-inner", { box: true })
	async nestedInner() {}

	// the helpers inside a boxed step
	@step("LOCATION nested-helpers", { box: true })
	async nestedHelpers() {
		await new ProbePage("LOCATION nested-goto").navigation.goto(); // LOCATION nested-goto
		const storage = new SessionStorage(fakePage(), { label: "LOCATION nested-set", origin: "https://shop.example" });
		await storage.set("token", "abc"); // LOCATION nested-set
	}

	// an error in a nested boxed step keeps Playwright's boxed-error rule: the outermost boxed call site
	@step("LOCATION nested-throws", { box: true })
	async nestedThrowsOuter() {
		await this.nestedThrowsInner(); // LOCATION nested-throws-inner
	}

	@step("LOCATION nested-throws-inner", { box: true })
	async nestedThrowsInner() {
		throw new Error("LOCATION nested-throws");
	}

	// the same under a test's own boxed step, with ids of their own: a step's title, and so its id, is the method's
	@step("LOCATION in-test-outer", { box: true })
	async inTestOuter() {
		await this.inTestInner(); // LOCATION in-test-inner
	}

	@step("LOCATION in-test-inner", { box: true })
	async inTestInner() {}

	@step("LOCATION in-test-helpers", { box: true })
	async inTestHelpers() {
		await new ProbePage("LOCATION in-test-goto").navigation.goto(); // LOCATION in-test-goto
		const storage = new SessionStorage(fakePage(), { label: "LOCATION in-test-set", origin: "https://shop.example" });
		await storage.set("token", "abc"); // LOCATION in-test-set
	}
}

/** A page that answers what the helpers ask of it, so the probes need no browser; it reports `url` as its URL. */
const fakePage = (url = "https://shop.example/probe") =>
	({
		goto: async () => null,
		url: () => url,
		waitForURL: async () => undefined,
		sessionStorage: { setItem: async () => undefined },
	}) as never;

class ProbePage extends PageObject<"body"> {
	constructor(label = "LOCATION goto", page = fakePage()) {
		super(page, "https://shop.example", "/probe", { label });
	}
	// no locators: the registry check would resolve them, and the fake page has none
	protected defineLocators() {}
}

test("an unboxed @step is reported where its method was called", async () => {
	await new Widget().plain(); // LOCATION plain
});

test("a boxed @step is reported where its method was called, from a test or from another method", async () => {
	await new Widget().boxed(); // LOCATION boxed
	await new Widget().helper();
});

test("a boxed @step that throws: the step and the error at the line that called the method", async () => {
	test.fail();
	await new Widget().boxedThrows(); // LOCATION boxed-throws
});

test("the navigation and session storage helpers' steps are reported where they were called", async () => {
	const probePage = new ProbePage();
	await probePage.navigation.goto(); // LOCATION goto
	await new ProbePage("LOCATION expect-this").navigation.expectThisPage(); // LOCATION expect-this
	const leftPage = new ProbePage("LOCATION expect-another", fakePage("https://shop.example/other"));
	await leftPage.navigation.expectAnotherPage(); // LOCATION expect-another
	const storage = new SessionStorage(fakePage(), { label: "LOCATION set", origin: "https://shop.example" });
	await storage.set("token", "abc"); // LOCATION set
});

test("a boxed @step inside a boxed @step is reported where it was called", async () => {
	await new Widget().nestedOuter(); // LOCATION nested-outer
});

test("the helpers inside a boxed @step are reported where they were called", async () => {
	await new Widget().nestedHelpers(); // LOCATION nested-helpers
});

test("inside a test's own boxed step, every boxed step is reported where it was called", async () => {
	// not marked: Playwright places a test's own step; the probes are POMWright's steps inside it
	await test.step(
		"a test's own boxed step",
		async () => {
			await new Widget().inTestOuter(); // LOCATION in-test-outer
			await new Widget().inTestHelpers(); // LOCATION in-test-helpers
		},
		{ box: true },
	);
});

test("an error in a nested boxed step is reported at the outermost boxed call", async () => {
	test.fail();
	await new Widget().nestedThrowsOuter(); // LOCATION nested-throws
});
