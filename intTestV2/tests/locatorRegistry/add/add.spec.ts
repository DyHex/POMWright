import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("add regex-driven getBy* registrations to registry", async ({ page }) => {
	type LocatorSchemaPaths =
		| "regex.text"
		| "regex.label"
		| "regex.placeholder"
		| "regex.altText"
		| "regex.title"
		| "regex.reuse.text"
		| "regex.reusePath.text";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("regex.text").getByText(/Welcome/i);
	registry.add("regex.label").getByLabel(/Username/i);
	registry.add("regex.placeholder").getByPlaceholder(/Enter your name/i);
	registry.add("regex.altText").getByAltText(/Sample Image/i);
	registry.add("regex.title").getByTitle(/Home Page/i);

	const reusableText = registry.createReusable.getByText(/Seeded/i);
	registry.add("regex.reuse.text", { reuse: reusableText }).getByText({ exact: true });
	registry.add("regex.reusePath.text", { reuse: "regex.text" });

	expect(registry.get("regex.text")).toEqual({
		definition: { text: /Welcome/i, type: "text" },
		locatorSchemaPath: "regex.text",
		steps: [],
	});
	expect(registry.get("regex.label")).toEqual({
		definition: { text: /Username/i, type: "label" },
		locatorSchemaPath: "regex.label",
		steps: [],
	});
	expect(registry.get("regex.placeholder")).toEqual({
		definition: { text: /Enter your name/i, type: "placeholder" },
		locatorSchemaPath: "regex.placeholder",
		steps: [],
	});
	expect(registry.get("regex.altText")).toEqual({
		definition: { text: /Sample Image/i, type: "altText" },
		locatorSchemaPath: "regex.altText",
		steps: [],
	});
	expect(registry.get("regex.title")).toEqual({
		definition: { text: /Home Page/i, type: "title" },
		locatorSchemaPath: "regex.title",
		steps: [],
	});
	expect(registry.get("regex.reuse.text")).toEqual({
		definition: { text: /Seeded/i, options: { exact: true }, type: "text" },
		locatorSchemaPath: "regex.reuse.text",
		steps: [],
	});
	expect(registry.get("regex.reusePath.text")).toEqual({
		definition: { text: /Welcome/i, type: "text" },
		locatorSchemaPath: "regex.reusePath.text",
		steps: [],
	});
});

test("add prevents multiple locator type definitions", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const builder = registry.add("heading").getByRole("heading", { level: 2 });

	expect((builder as { getByText?: unknown }).getByText).toBeUndefined();

	builder.filter({ hasText: "Heading" }).nth(0);
});

test("add typing narrows locator methods after a definition is chosen", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const postDefinition = registry.add("heading").getByRole("heading", { level: 2 });

	// @ts-expect-error additional locator methods are not exposed after a definition is set
	const _invalidLocatorMethod = postDefinition.getByText;

	postDefinition.filter({ hasText: "Heading" }).nth(0);
});

test("A LocatorSchemaPath can only be added once", async ({ page }) => {
	type LocatorSchemaPaths = "body";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("body").locator("body");

	const errMsg = /A locator schema with the path "body" already exists*/;

	expect(() => registry.add("body").locator("someone elses body")).toThrowError(errMsg);
});

test("add getByRole overloads accept optional options and support chained steps", async ({ page }) => {
	type LocalPath = "root" | "root.options" | "root.minimal";
	const registry = new LocatorRegistryInternal<LocalPath>(page);

	registry.add("root").locator("body");

	registry.add("root.options").getByRole("button", { name: "opts" }).filter({ hasText: "filtered" }).nth("last");
	registry.add("root.minimal").getByRole("button");

	expect(registry.get("root.options")).toEqual({
		locatorSchemaPath: "root.options",
		definition: { type: "role", role: "button", options: { name: "opts" } },
		steps: [
			{ kind: "filter", filter: { hasText: "filtered" } },
			{ kind: "index", index: "last" },
		],
	});

	expect(registry.get("root.minimal")).toEqual({
		locatorSchemaPath: "root.minimal",
		definition: { type: "role", role: "button" },
		steps: [],
	});
});

test("add overloads support other strategies with options and chained steps", async ({ page }) => {
	type LocalPath = "root.text" | "root.locator" | "root.frame";

	const registry = new LocatorRegistryInternal<LocalPath>(page);

	registry.add("root.text").getByText("needle", { exact: true }).filter({ hasText: "filtered" }).nth(0);
	registry.add("root.locator").locator(".selector", { hasText: "opt" }).filter({ hasText: "filtered" }).nth(0);
	registry.add("root.frame").frameLocator("iframe[name=child]");

	expect(registry.get("root.text")).toEqual({
		locatorSchemaPath: "root.text",
		definition: { type: "text", text: "needle", options: { exact: true } },
		steps: [
			{ kind: "filter", filter: { hasText: "filtered" } },
			{ kind: "index", index: 0 },
		],
	});

	expect(registry.get("root.locator")).toEqual({
		locatorSchemaPath: "root.locator",
		definition: { type: "locator", selector: ".selector", options: { hasText: "opt" } },
		steps: [
			{ kind: "filter", filter: { hasText: "filtered" } },
			{ kind: "index", index: 0 },
		],
	});

	expect(registry.get("root.frame")).toEqual({
		locatorSchemaPath: "root.frame",
		definition: { type: "frameLocator", selector: "iframe[name=child]" },
		steps: [],
	});
});
