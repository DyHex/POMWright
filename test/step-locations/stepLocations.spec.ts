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
}

/** A page that answers what the helpers ask of it, so the probes need no browser. */
const fakePage = () =>
	({
		goto: async () => null,
		url: () => "https://shop.example/probe",
		sessionStorage: { setItem: async () => undefined },
	}) as never;

class ProbePage extends PageObject<"body"> {
	constructor() {
		super(fakePage(), "https://shop.example", "/probe", { label: "LOCATION goto" });
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
	const storage = new SessionStorage(fakePage(), { label: "LOCATION set", origin: "https://shop.example" });
	await storage.set("token", "abc"); // LOCATION set
});
