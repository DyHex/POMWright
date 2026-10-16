import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("add reuse by path returns filter, nth and describe", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit" }).filter({ hasText: "Submit" });

	const builder = registry.add("button.copy", { reuse: "button" });

	expect(Object.keys(builder).sort()).toEqual(["describe", "filter", "nth"]);
	expect(registry.get("button.copy")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button.copy",
		steps: [{ filter: { hasText: "Submit" }, kind: "filter" }],
	});
});

test("add reuse by path with empty string does not silently skip reuse", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	// @ts-expect-error - testing runtime error when reuse is an empty string
	expect(() => registry.add("button", { reuse: "" })).toThrowError('No locator schema registered for path "".');
});

test("add reuse by path throws when source path matches target path", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	// @ts-expect-error - testing runtime error when reuse path is the same as registration path
	expect(() => registry.add("button", { reuse: "button" })).toThrowError(
		'Locator reuse path cannot be the same as registration path: "button".',
	);
});

test("add reuse by path reports compile-time fallback reason when forced at runtime", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const addUnsafe = registry.add as unknown as (
		path: string,
		options: {
			reuse: [string];
		},
	) => void;

	expect(() =>
		addUnsafe("button.copy", {
			reuse: ["Invalid reuse path, reuse path cannot be the same as registration path: button.copy"],
		}),
	).toThrowError(
		'Invalid reuse path configuration for "button.copy": Invalid reuse path, reuse path cannot be the same as registration path: button.copy',
	);
});

test("add reuse by path clones records so mutations do not leak", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit" }).filter({ hasText: "Submit" });

	registry.add("button.copy", { reuse: "button" });

	expect(registry.get("button.copy")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button.copy",
		steps: [{ filter: { hasText: "Submit" }, kind: "filter" }],
	});

	registry.replace("button.copy", {
		definition: { role: "link", options: { name: "Copy" }, type: "role" },
		locatorSchemaPath: "button.copy",
		steps: [{ filter: { hasText: "Copy" }, kind: "filter" }],
	});

	expect(registry.get("button.copy")).toEqual({
		definition: { role: "link", options: { name: "Copy" }, type: "role" },
		locatorSchemaPath: "button.copy",
		steps: [{ filter: { hasText: "Copy" }, kind: "filter" }],
	});

	expect(registry.get("button")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button",
		steps: [{ filter: { hasText: "Submit" }, kind: "filter" }],
	});
});

test("add reuse by path throws when the source path is missing", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.add("button.copy", { reuse: "button" })).toThrowError(
		'No locator schema registered for path "button".',
	);
});

test.describe("reuse by path against the DOM", () => {
	type DomPaths =
		| "section"
		| "section.button"
		| "section.reset"
		| "other"
		| "other.reset"
		| "other.first"
		| "other.described"
		| "other.plain";

	test.beforeEach(async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);
	});

	test("filter, nth and describe after a path reuse narrow the copy and leave the source alone", async ({ page }) => {
		const registry = createTestRegistry<DomPaths>(page);
		registry.add("section").locator("#section1");
		registry.add("section.button").getByRole("button").filter({ hasText: "Re" });
		registry.add("other").locator("#section2");
		registry
			.add("other.reset", { reuse: "section.button" })
			.filter({ hasText: "Reset" })
			.describe("Reset in section 2");
		registry.add("other.first", { reuse: "section.button" }).nth(0);

		await expect(registry.getNestedLocator("other.reset")).toHaveText(["Reset Color"]);
		expect(registry.getNestedLocator("other.reset").description()).toBe("Reset in section 2");
		await expect(registry.getNestedLocator("other.first")).toHaveText("Red");
		await expect(registry.getNestedLocator("other.first")).toHaveCSS("background-color", "rgb(255, 0, 0)");
		await expect(registry.getNestedLocator("section.button")).toHaveText(["Red", "Green", "Reset Color"]);
		expect(registry.getNestedLocator("section.button").description()).toBe("section.button");
	});

	test("a copy keeps the source's explicit description unless describe replaces or removes it", async ({ page }) => {
		const registry = createTestRegistry<DomPaths>(page);
		registry.add("section").locator("#section1");
		registry.add("section.reset").getByRole("button", { name: "Reset Color" }).describe("Reset button");
		registry.add("other").locator("#section2");
		registry.add("other.reset", { reuse: "section.reset" });
		registry.add("other.described", { reuse: "section.reset" }).describe("Second reset");
		registry.add("other.plain", { reuse: "section.reset" }).describe("");

		expect(registry.getNestedLocator("other.reset").description()).toBe("Reset button");
		expect(registry.getNestedLocator("other.described").description()).toBe("Second reset");
		expect(registry.getNestedLocator("other.plain").description()).toBeNull();
		await expect(registry.getNestedLocator("other.plain")).toHaveCount(1);
		expect(registry.getNestedLocator("section.reset").description()).toBe("Reset button");
	});
});

test("a reuse value that is neither a path nor a seed throws one message and registers nothing", async ({ page }) => {
	type LocatorSchemaPaths = "button";
	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const addUnsafe = registry.add as unknown as (path: string, options: { reuse: unknown }) => void;

	for (const reuse of [{}, 42, null]) {
		expect(() => addUnsafe.call(registry, "button", { reuse })).toThrowError(
			'reuse requires a registered path or a seed from createReusable for "button".',
		);
		expect(() => registry.get("button")).toThrowError('No locator schema registered for path "button".');
	}
});

test.describe("reuse by path of an any-frame path", () => {
	type FramePaths = "anyFrame" | "frames" | "frames.toggleC" | "shell" | "shell.frames";

	test.beforeEach(async ({ iframePage }) => {
		await iframePage.page.goto(iframePage.fullUrl);
	});

	test("the copy resolves a path inside it and refuses filter, nth and describe", async ({ page }) => {
		const registry = createTestRegistry<FramePaths>(page);
		registry.add("anyFrame").frameLocator();
		const copy = registry.add("frames", { reuse: "anyFrame" });
		registry.add("frames.toggleC").getByTestId("toggle-c");

		await expect(registry.getNestedLocator("frames.toggleC")).toHaveText("Toggle C: Off");
		const refused = (method: string) =>
			`${method} cannot apply to "frames": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`;
		expect(() => copy.filter({ hasText: "x" })).toThrowError(refused("filter()"));
		expect(() => copy.nth(0)).toThrowError(refused("nth()"));
		expect(() => copy.describe("d")).toThrowError(refused("describe()"));
		expect(() => registry.verify()).not.toThrow();
	});

	test("a copy below a registered ancestor fails verify with the first-segment message", async ({ page }) => {
		const registry = createTestRegistry<FramePaths>(page);
		registry.add("anyFrame").frameLocator();
		registry.add("shell").locator("body");
		registry.add("shell.frames", { reuse: "anyFrame" });
		expect(() => registry.verify()).toThrowError(
			'"shell.frames": frameLocator() without a selector must be the first segment of the chain; "shell.frames" has the ancestor "shell".',
		);
	});
});
