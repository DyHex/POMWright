import { expect, test } from "@fixtures-v2/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("add reuses with existing record by path does not have chainable methods", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit" }).filter({ hasText: "Submit" });

	const builder = registry.add("button.copy", { reuse: "button" });

	expect(builder).toBeUndefined();
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
