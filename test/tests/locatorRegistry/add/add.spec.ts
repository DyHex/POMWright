import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

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

const STRATEGIES =
	"getByRole, getByText, getByLabel, getByPlaceholder, getByAltText, getByTitle, locator, frameLocator, getByTestId or getById";

test("filter, nth and describe need a locator strategy first", async ({ page }) => {
	type LocalPath = "a";
	const registry = new LocatorRegistryInternal<LocalPath>(page);

	// the builder returned by add(path) has the ten strategies only; the runtime check covers JavaScript callers
	const builder = registry.add("a") as unknown as {
		filter: (filter: object) => unknown;
		nth: (index: number) => unknown;
		describe: (description: string) => unknown;
	};
	expect(() => builder.filter({ hasText: "x" })).toThrowError(
		`filter() needs a locator strategy first for "a"; call ${STRATEGIES} before it.`,
	);
	expect(() => builder.nth(0)).toThrowError(
		`nth() needs a locator strategy first for "a"; call ${STRATEGIES} before it.`,
	);
	expect(() => builder.describe("d")).toThrowError(
		`describe() needs a locator strategy first for "a"; call ${STRATEGIES} before it.`,
	);
	expect(registry.getIfExists("a")).toBeUndefined();

	// @ts-expect-error filter is not available before a strategy
	const _filterBefore = registry.add("a").filter;
	// @ts-expect-error nth is not available before a strategy
	const _nthBefore = registry.add("a").nth;
	// @ts-expect-error describe is not available before a strategy
	const _describeBefore = registry.add("a").describe;

	registry.add("a").getByRole("button").filter({ hasText: "x" }).nth(0).describe("d");
	expect(registry.get("a")).toEqual({
		locatorSchemaPath: "a",
		definition: { type: "role", role: "button" },
		steps: [
			{ kind: "filter", filter: { hasText: "x" } },
			{ kind: "index", index: 0 },
		],
		description: "d",
	});
});

test("a seeded registration keeps filter, nth and describe before its override", async ({ page }) => {
	type LocalPath = "seeded";
	const registry = new LocatorRegistryInternal<LocalPath>(page);
	const seed = registry.createReusable.getByRole("button", { name: "Submit" });

	registry.add("seeded", { reuse: seed }).filter({ hasText: "x" }).nth(0).describe("d");
	expect(registry.get("seeded")).toEqual({
		locatorSchemaPath: "seeded",
		definition: { type: "role", role: "button", options: { name: "Submit" } },
		steps: [
			{ kind: "filter", filter: { hasText: "x" } },
			{ kind: "index", index: 0 },
		],
		description: "d",
	});
});

test("the duplicate-registration message shows a Locator in a step as Playwright prints it", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry
		.add("item")
		.locator("li")
		.filter({ has: page.locator("b") });

	let message = "";
	try {
		registry.add("item").locator("li");
	} catch (error) {
		message = (error as Error).message;
	}
	expect(message).toMatch(
		/^A locator schema with the path "item" already exists\.\nExisting and attempted schemas: \{/,
	);
	expect(message).toContain(`"has": "locator('b')"`);
	expect(message).not.toContain("_guid");
	expect(message).not.toContain("_frame");
});

test.describe("a registered locator cannot change after registration", () => {
	type LocatorSchemaPaths = "body" | "body.button" | "body.row" | "body.seeded";

	test.beforeEach(async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);
	});

	test("changing the options object after add has no effect", async ({ page }) => {
		const registry = createTestRegistry<LocatorSchemaPaths>(page);
		const options = { name: "Red" };
		registry.add("body").locator("body");
		registry.add("body.button").getByRole("button", options);
		options.name = "Blue";
		await expect(registry.getNestedLocator("body.button").first()).toHaveText("Red");
	});

	test("changing the filter object after add has no effect", async ({ page }) => {
		const registry = createTestRegistry<LocatorSchemaPaths>(page);
		const filter = { hasText: "Red" };
		registry.add("body").locator("body");
		registry.add("body.row").getByRole("button").filter(filter);
		filter.hasText = "Blue";
		await expect(registry.getNestedLocator("body.row").first()).toHaveText("Red");
	});

	test("changing a seed's options, filter or returned steps has no effect", async ({ page }) => {
		const registry = createTestRegistry<LocatorSchemaPaths>(page);
		const options = { level: 2 };
		const filter = { hasText: "Playground" };
		const seed = registry.createReusable.getByRole("heading", options).filter(filter);
		options.level = 3;
		filter.hasText = "Explorer";
		registry.add("body").locator("body");
		registry.add("body.seeded", { reuse: seed });
		const step = seed.steps[0];
		if (step?.kind === "filter") {
			(step.filter as { hasText?: string }).hasText = "Test";
		}
		const locator = registry.getNestedLocator("body.seeded");
		await expect(locator).toHaveCount(1);
		await expect(locator).toHaveText("Primary Colors Playground");
	});

	test("changing a query's filter object after the call has no effect on that query", async ({ testFilters }) => {
		const filter = { hasText: "Red" };
		const query = testFilters.getLocatorSchema("body.section@playground.button").filter(filter);
		filter.hasText = "Blue";
		await expect(query.getNestedLocator()).toHaveText("Red");
	});
});

test("nth hands null and undefined from JavaScript to Playwright, which matches nothing", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);
	type LocatorSchemaPaths = "body" | "body.nullIndex" | "body.undefinedIndex";
	const registry = createTestRegistry<LocatorSchemaPaths>(testFilters.page);
	registry.add("body").locator("body");
	// @ts-expect-error null is not an index, in Playwright either
	registry.add("body.nullIndex").getByRole("button").nth(null);
	// @ts-expect-error undefined is not an index, in Playwright either
	registry.add("body.undefinedIndex").getByRole("button").nth(undefined);
	await expect(registry.getNestedLocator("body.nullIndex")).toHaveCount(0);
	await expect(registry.getNestedLocator("body.undefinedIndex")).toHaveCount(0);
	// @ts-expect-error the same call on Playwright's own locator
	await expect(testFilters.page.locator("body").getByRole("button").nth(undefined)).toHaveCount(0);
});
