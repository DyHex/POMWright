import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("getLocator resolves the terminal locator when ancestor paths are registered", async ({ page }) => {
	type LocatorSchemaPaths =
		| "topMenu"
		| "topMenu.notifications"
		| "topMenu.notifications.dropdown"
		| "topMenu.notifications.dropdown.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("topMenu").locator(".w3-top");
	registry.add("topMenu.notifications").locator(".w3-dropdown-hover");
	registry.add("topMenu.notifications.dropdown").locator(".w3-dropdown-content");
	registry.add("topMenu.notifications.dropdown.item").locator(".w3-bar-item");

	const locator = registry.getLocator("topMenu.notifications.dropdown.item");
	const chained = page
		.locator(".w3-top")
		.locator(".w3-dropdown-hover")
		.locator(".w3-dropdown-content")
		.locator(".w3-bar-item");

	expect(`${locator}`).toEqual("locator('.w3-bar-item')");
	expect(`${locator}`).not.toEqual(`${chained}`);
});

test("getLocator uses terminal steps while ignoring ancestor filters", async ({ page }) => {
	type LocatorSchemaPaths = "panel" | "panel.row" | "panel.row.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("panel").locator("section.panel").filter({ hasText: "panel" }).nth(2);
	registry.add("panel.row").locator("div.row").filter({ hasText: "row" });
	registry.add("panel.row.button").getByRole("button", { name: "Save" }).filter({ hasText: "terminal" });

	const locator = registry.getLocator("panel.row.button");

	expect(`${locator}`).toEqual("getByRole('button', { name: 'Save' }).filter({ hasText: 'terminal' })");
});

test("getLocator returns a fresh locator each time", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit" });

	const first = registry.getLocator("button");
	const second = registry.getLocator("button");

	expect(first).not.toBe(second);
	expect(`${first}`).toEqual(`${second}`);
});

test.describe("getLocator applies terminal filters for registered definitions", () => {
	const cases = [
		{
			label: "role",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByRole("button").filter({ hasText: "filtered" }),
			expected: "getByRole('button').filter({ hasText: 'filtered' })",
		},
		{
			label: "text",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByText("text").filter({ hasText: "filtered" }),
			expected: "getByText('text').filter({ hasText: 'filtered' })",
		},
		{
			label: "label",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByLabel("label").filter({ hasText: "filtered" }),
			expected: "getByLabel('label').filter({ hasText: 'filtered' })",
		},
		{
			label: "placeholder",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByPlaceholder("placeholder").filter({ hasText: "filtered" }),
			expected: "getByPlaceholder('placeholder').filter({ hasText: 'filtered' })",
		},
		{
			label: "altText",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByAltText("altText").filter({ hasText: "filtered" }),
			expected: "getByAltText('altText').filter({ hasText: 'filtered' })",
		},
		{
			label: "title",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByTitle("title").filter({ hasText: "filtered" }),
			expected: "getByTitle('title').filter({ hasText: 'filtered' })",
		},
		{
			label: "locator",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").locator("locator").filter({ hasText: "filtered" }),
			expected: "locator('locator').filter({ hasText: 'filtered' })",
		},
		{
			label: "testId",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getByTestId("testId").filter({ hasText: "filtered" }),
			expected: "getByTestId('testId').filter({ hasText: 'filtered' })",
		},
		{
			label: "id",
			build: (registry: LocatorRegistryInternal<"terminal">) =>
				registry.add("terminal").getById("unique-id").filter({ hasText: "filtered" }),
			expected: "locator('#unique-id').filter({ hasText: 'filtered' })",
		},
	];

	for (const { label, build, expected } of cases) {
		test(`definition ${label}: applies terminal filters`, async ({ page }) => {
			const registry = createTestRegistry<"terminal">(page);

			build(registry);

			const locator = registry.getLocator("terminal");
			expect(`${locator}`).toEqual(expected);
		});
	}
});

test("getLocator returns frame locators without chaining ancestor filters", async ({ page }) => {
	type LocatorSchemaPaths = "frame";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("frame").frameLocator('iframe[title="name"]');

	const locator = registry.getLocator("frame");
	const manual = page.frameLocator('iframe[title="name"]').owner();

	expect(`${locator}`).toEqual(`${manual}`);
});

test("getLocator ignores filter options when all values are undefined", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@optionsUndefined";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("fictional.filter@optionsUndefined")
		.getByRole("button")
		.filter({ has: undefined, hasNot: undefined, hasText: undefined, hasNotText: undefined });

	const locator = registry.getLocator("fictional.filter@optionsUndefined");

	expect(`${locator}`).toEqual("getByRole('button')");
});

test("getLocator applies terminal indices", async ({ page }) => {
	type LocatorSchemaPaths =
		| "fictional.filter@hasNotText"
		| "fictional.filter@hasNotText.filter@hasText"
		| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText"
		| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasNotText").getByRole("button").filter({ hasNotText: "hasNotText" }).nth(2);
	registry.add("fictional.filter@hasNotText.filter@hasText").getByRole("button").filter({ hasText: "hasText" });
	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByRole("button")
		.filter({ hasNotText: "hasNotText" });
	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" })
		.nth(2);

	const locator = registry.getLocator("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText");

	expect(`${locator}`).toEqual("getByRole('button').filter({ hasText: 'hasText' }).nth(2)");
});

test("getLocator honors terminal filter and index ordering", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("fictional.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" })
		.filter({ hasText: "extra" })
		.nth(1)
		.filter({ hasNotText: "tail" });

	const locator = registry.getLocator("fictional.filter@hasText");

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1).filter({ hasNotText: 'tail' })",
	);
});

test("getLocator supports explicit last() selection for the terminal path", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" }).nth("last");

	const locator = registry.getLocator("fictional.filter@hasText");

	expect(`${locator}`).toEqual("getByRole('button').filter({ hasText: 'hasText' }).last()");
});

test('getLocator accepts "first" and "last" selections for terminal indices', async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" }).nth("first");

	const first = registry.getLocator("fictional.filter@hasText");
	expect(`${first}`).toContain("first()");

	const secondRegistry = createTestRegistry<LocatorSchemaPaths>(page);
	secondRegistry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" }).nth("last");

	const last = secondRegistry.getLocator("fictional.filter@hasText");
	expect(`${last}`).toContain("last()");
});

test("getLocator rejects missing terminal paths", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("fictional.filter@hasText").getByRole("button");

	// @ts-expect-error Testing invalid argument
	expect(() => registry.getLocator("fictional")).toThrow('No locator schema registered for path "fictional".');
});

test("getLocator rejects partially matching paths", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText").getByRole("button");

	// @ts-expect-error Testing invalid argument
	expect(() => registry.getLocator("fictional.filter@has")).toThrow(
		'No locator schema registered for path "fictional.filter@has".',
	);
});
