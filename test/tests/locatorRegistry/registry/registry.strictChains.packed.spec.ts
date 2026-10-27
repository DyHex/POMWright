import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of registry.strictChains.spec.ts: its scenarios through pomwright's public API against the packed package.

// strictChains is an opt-in of a registry (and of a page object, through locators: { strictChains }): verify()
// then requires every proper ancestor of every path to be registered. Without it an unregistered segment is a
// name that groups paths and is left out of the chain.

type Paths = "main" | "main.section" | "main.section.reset" | "app" | "app.frames" | "app.frames.any" | "anyFrame";

const createRegistry = (page: Page, options?: { strictChains?: boolean }) =>
	createRegistryWithAccessors<Paths>(page, options).registry;
const strict = (missing: string) => `strictChains requires every ancestor to be registered; ${missing}`;

test.beforeEach(async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);
});

test("without the option, or with false, a sparse chain passes verify and leaves its unregistered segment out", async ({
	page,
}) => {
	for (const registry of [createRegistry(page), createRegistry(page, { strictChains: false })]) {
		registry.add("main").locator("body");
		registry.add("main.section.reset").getByRole("button", { name: "Reset Color" });
		expect(() => registry.verify()).not.toThrow();
		await expect(registry.getNestedLocator("main.section.reset")).toHaveCount(4);
	}
});

test("with the option, verify names every unregistered ancestor, one line per path", async ({ page }) => {
	const registry = createRegistry(page, { strictChains: true });
	registry.add("main").locator("body");
	registry.add("main.section.reset").getByRole("button", { name: "Reset Color" });
	expect(() => registry.verify()).toThrowError(
		`Locator registry verification failed for 1 of 2 paths:\n  "main.section.reset": ${strict('"main.section" is not.')}`,
	);
});

test("with the option, a chain whose every ancestor is registered passes, and skip still leaves one out", async ({
	page,
}) => {
	const registry = createRegistry(page, { strictChains: true });
	registry.add("main").locator("body");
	registry.add("main.section").locator("#section2");
	registry.add("main.section.reset").getByRole("button", { name: "Reset Color" });
	expect(() => registry.verify()).not.toThrow();
	await expect(registry.getNestedLocator("main.section.reset")).toHaveCount(1);
	await expect(registry.getLocatorSchema("main.section.reset").skip("main.section").getNestedLocator()).toHaveCount(4);
});

test("with the option, every failing check of a path goes on its line; an any-frame path is a root path", async ({
	page,
}) => {
	const registry = createRegistry(page, { strictChains: true });
	registry.add("app").locator("body");
	registry.add("app.frames.any").frameLocator();
	registry.add("anyFrame").frameLocator();
	expect(() => registry.verify()).toThrowError(
		`Locator registry verification failed for 1 of 3 paths:\n  "app.frames.any": ${strict('"app.frames" is not.')} frameLocator() without a selector must be the first segment of the chain; "app.frames.any" has the ancestor "app".`,
	);
});

test("the published createRegistryWithAccessors takes the option", async ({ page }) => {
	const { registry } = createRegistryWithAccessors<Paths>(page, { strictChains: true });
	registry.add("main.section").locator("#section2");
	expect(() => registry.verify()).toThrowError(strict('"main" is not.'));
	const { registry: lenient } = createRegistryWithAccessors<Paths>(page);
	lenient.add("main.section").locator("#section2");
	expect(() => lenient.verify()).not.toThrow();
});
