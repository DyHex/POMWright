import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { type FilterDefinition, LocatorRegistryInternal } from "../../../../src/locators";

// verify() resolves every selector-bearing path once, terminal-only, so every has/hasNot path
// reference goes through the normal resolution, and checks every any-frame path against its
// first-segment rule. The table in the plan's section 1.9 is the contract.

type Paths =
	| "list"
	| "list.item"
	| "list.badge"
	| "heading"
	| "a"
	| "b"
	| "frame"
	| "frame.inner"
	| "anyFrame"
	| "anyFrame.button"
	| "shell"
	| "shell.anyFrame"
	| "sparse.chain.leaf";

const createRegistry = (page: Page) => new LocatorRegistryInternal<Paths>(page);

test("a clean registry and an empty one pass", async ({ page }) => {
	const registry = createRegistry(page);
	expect(() => registry.verify()).not.toThrow();
	registry.add("list").locator("ul");
	registry.add("list.item").getByRole("listitem").filter({ has: "heading" }).nth(0);
	registry.add("heading").getByRole("heading");
	expect(() => registry.verify()).not.toThrow();
});

test("a has reference to an unregistered path fails naming the holding path and the reference", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("list").locator("ul");
	registry
		.add("list.item")
		.getByRole("listitem")
		.filter({ has: "list.titel" as "list.badge" });
	expect(() => registry.verify()).toThrowError(
		'Locator registry verification failed for 1 of 2 paths:\n  "list.item": No locator schema registered for path "list.titel".',
	);
});

test("a hasNot reference to an unregistered path fails the same way", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("list.item").getByRole("listitem").filter({ hasNot: "list.badge" });
	expect(() => registry.verify()).toThrowError(
		'Locator registry verification failed for 1 of 1 paths:\n  "list.item": No locator schema registered for path "list.badge".',
	);
});

test("a typo in an ancestor's steps is reported once, under the ancestor", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("list").locator("ul").filter({ has: "list.badge" });
	registry.add("list.item").getByRole("listitem");
	expect(() => registry.verify()).toThrowError(
		'Locator registry verification failed for 1 of 2 paths:\n  "list": No locator schema registered for path "list.badge".',
	);
});

test("several failures are listed in one error", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("list").locator("ul");
	registry.add("list.item").getByRole("listitem").filter({ has: "list.badge" });
	registry.add("heading").getByRole("heading").filter({ hasNot: "a" });
	let message = "";
	try {
		registry.verify();
	} catch (error) {
		message = error instanceof Error ? error.message : String(error);
	}
	expect(message).toContain("Locator registry verification failed for 2 of 3 paths:");
	expect(message).toContain('"list.item": No locator schema registered for path "list.badge".');
	expect(message).toContain('"heading": No locator schema registered for path "a".');
});

test("a forward reference passes once the target is registered", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("list.item").getByRole("listitem").filter({ has: "heading" });
	expect(() => registry.verify()).toThrowError('"list.item": No locator schema registered for path "heading".');
	registry.add("heading").getByRole("heading");
	expect(() => registry.verify()).not.toThrow();
});

test("a reference whose target has its own bad reference is reported under both", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("a").locator("a").filter({ has: "b" });
	registry.add("b").locator("b").filter({ has: "list.badge" });
	let message = "";
	try {
		registry.verify();
	} catch (error) {
		message = error instanceof Error ? error.message : String(error);
	}
	expect(message).toContain("2 of 2 paths");
	expect(message).toContain('"a": No locator schema registered for path "list.badge".');
	expect(message).toContain('"b": No locator schema registered for path "list.badge".');
});

test("a mutual cycle is reported under both paths and a self-reference under its path", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("a").locator("a").filter({ has: "b" });
	registry.add("b").locator("b").filter({ has: "a" });
	let message = "";
	try {
		registry.verify();
	} catch (error) {
		message = error instanceof Error ? error.message : String(error);
	}
	expect(message).toContain("2 of 2 paths");
	expect(message).toContain('"a": Detected cyclic filter reference while resolving "a": "b".');
	expect(message).toContain('"b": Detected cyclic filter reference while resolving "b": "a".');

	const self = createRegistry(page);
	self.add("a").locator("li").filter({ has: "a" });
	expect(() => self.verify()).toThrowError('"a": Detected cyclic filter reference while resolving "a": "a".');
});

test("an unsupported reference value is reported", async ({ page }) => {
	const registry = createRegistry(page);
	const unsafeFilter = { has: { selector: "li" } } as unknown as FilterDefinition<Paths, Paths>;
	registry.add("a").getByRole("button").filter(unsafeFilter);
	expect(() => registry.verify()).toThrowError(
		'"a": Unsupported filter reference while resolving "a". Filter has/hasNot supports Playwright Locator instances or registry path strings.',
	);
});

test("a reference to a frame path passes, a reference to an any-frame path fails", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("frame").frameLocator("iframe").nth(1);
	registry.add("a").locator("section").filter({ has: "frame" });
	expect(() => registry.verify()).not.toThrow();

	registry.add("anyFrame").frameLocator();
	registry.add("b").locator("section").filter({ has: "anyFrame" });
	expect(() => registry.verify()).toThrowError(
		'Locator registry verification failed for 1 of 4 paths:\n  "b": frameLocator() without a selector does not point to a particular iframe; "anyFrame" cannot be resolved on its own, filtered or indexed; resolve a path inside it.',
	);
});

test("an any-frame path below an ancestor fails, one at the root passes", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("anyFrame").frameLocator();
	registry.add("anyFrame.button").getByRole("button");
	expect(() => registry.verify()).not.toThrow();

	registry.add("shell").locator("main");
	registry.add("shell.anyFrame").frameLocator();
	expect(() => registry.verify()).toThrowError(
		'Locator registry verification failed for 1 of 4 paths:\n  "shell.anyFrame": frameLocator() without a selector must be the first segment of the chain; "shell.anyFrame" has the ancestor "shell".',
	);
});

test("an unparsable selector, a missing element and a sparse chain pass: nothing touches the DOM", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("a").locator("div >>");
	registry.add("b").getByTestId("missing");
	registry.add("sparse.chain.leaf").getByRole("button");
	expect(() => registry.verify()).not.toThrow();
});

test("verify() has no state: it reports the same result twice and changes nothing", async ({ page }) => {
	const registry = createRegistry(page);
	registry.add("list").locator("ul").filter({ hasText: "x" }).describe("The list");
	registry.add("list.item").getByRole("listitem").filter({ has: "list.badge" });
	const before = registry.get("list");
	expect(() => registry.verify()).toThrowError("1 of 2 paths");
	expect(() => registry.verify()).toThrowError("1 of 2 paths");
	expect(registry.get("list")).toEqual(before);
});
