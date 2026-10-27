import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors, type LocatorRegistry } from "pomwright";

// The packed twin of getLocator.spec.ts: its scenarios through pomwright's public API against the packed package.

const createTestRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page).registry;

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

	expect(`${locator.describe("")}`).toEqual("locator('.w3-bar-item')");
	expect(`${locator.describe("")}`).not.toEqual(`${chained}`);
});

test("getLocator uses terminal steps while ignoring ancestor filters", async ({ page }) => {
	type LocatorSchemaPaths = "panel" | "panel.row" | "panel.row.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("panel").locator("section.panel").filter({ hasText: "panel" }).nth(2);
	registry.add("panel.row").locator("div.row").filter({ hasText: "row" });
	registry.add("panel.row.button").getByRole("button", { name: "Save" }).filter({ hasText: "terminal" });

	const locator = registry.getLocator("panel.row.button");

	expect(`${locator.describe("")}`).toEqual("getByRole('button', { name: 'Save' }).filter({ hasText: 'terminal' })");
});

test("getLocator returns a fresh locator each time", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit" });

	const first = registry.getLocator("button");
	const second = registry.getLocator("button");

	expect(first).not.toBe(second);
	expect(`${first.describe("")}`).toEqual(`${second.describe("")}`);
});

test.describe("getLocator applies terminal filters for registered definitions", () => {
	const cases = [
		{
			label: "role",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByRole("button").filter({ hasText: "filtered" }),
			expected: "getByRole('button').filter({ hasText: 'filtered' })",
		},
		{
			label: "text",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByText("text").filter({ hasText: "filtered" }),
			expected: "getByText('text').filter({ hasText: 'filtered' })",
		},
		{
			label: "label",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByLabel("label").filter({ hasText: "filtered" }),
			expected: "getByLabel('label').filter({ hasText: 'filtered' })",
		},
		{
			label: "placeholder",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByPlaceholder("placeholder").filter({ hasText: "filtered" }),
			expected: "getByPlaceholder('placeholder').filter({ hasText: 'filtered' })",
		},
		{
			label: "altText",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByAltText("altText").filter({ hasText: "filtered" }),
			expected: "getByAltText('altText').filter({ hasText: 'filtered' })",
		},
		{
			label: "title",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByTitle("title").filter({ hasText: "filtered" }),
			expected: "getByTitle('title').filter({ hasText: 'filtered' })",
		},
		{
			label: "locator",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").locator("locator").filter({ hasText: "filtered" }),
			expected: "locator('locator').filter({ hasText: 'filtered' })",
		},
		{
			label: "testId",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getByTestId("testId").filter({ hasText: "filtered" }),
			expected: "getByTestId('testId').filter({ hasText: 'filtered' })",
		},
		{
			label: "id",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getById("unique-id").filter({ hasText: "filtered" }),
			expected: `locator('[id="unique-id"]').filter({ hasText: 'filtered' })`,
		},
		{
			label: "id with CSS-significant characters",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry.add("terminal").getById("settings.panel").filter({ hasText: "filtered" }),
			expected: `locator('[id="settings.panel"]').filter({ hasText: 'filtered' })`,
		},
		{
			label: "id as RegExp",
			build: (registry: LocatorRegistry<"terminal">) =>
				registry
					.add("terminal")
					.getById(/^settings\.panel$/i)
					.filter({ hasText: "filtered" }),
			expected: `locator('internal:attr=[id=/^settings\\\\.panel$/i]').filter({ hasText: 'filtered' })`,
		},
	];

	for (const { label, build, expected } of cases) {
		test(`definition ${label}: applies terminal filters`, async ({ page }) => {
			const registry = createTestRegistry<"terminal">(page);

			build(registry);

			const locator = registry.getLocator("terminal");
			expect(`${locator.describe("")}`).toEqual(expected);
		});
	}
});

test("getLocator returns frame locators without chaining ancestor filters", async ({ page }) => {
	type LocatorSchemaPaths = "frame";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("frame").frameLocator('iframe[title="name"]');

	const locator = registry.getLocator("frame");
	const manual = page.frameLocator('iframe[title="name"]').owner();

	expect(`${locator.describe("")}`).toEqual(`${manual.describe("")}`);
});

test("getLocator ignores filter options when all values are undefined", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@optionsUndefined";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("fictional.filter@optionsUndefined")
		.getByRole("button")
		.filter({ has: undefined, hasNot: undefined, hasText: undefined, hasNotText: undefined });

	const locator = registry.getLocator("fictional.filter@optionsUndefined");

	expect(`${locator.describe("")}`).toEqual("getByRole('button')");
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

	expect(`${locator.describe("")}`).toEqual("getByRole('button').filter({ hasText: 'hasText' }).nth(2)");
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

	expect(`${locator.describe("")}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1).filter({ hasNotText: 'tail' })",
	);
});

test("getLocator supports explicit last() selection for the terminal path", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" }).nth("last");

	const locator = registry.getLocator("fictional.filter@hasText");

	expect(`${locator.describe("")}`).toEqual("getByRole('button').filter({ hasText: 'hasText' }).last()");
});

test('getLocator accepts "first" and "last" selections for terminal indices', async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" }).nth("first");

	const first = registry.getLocator("fictional.filter@hasText");
	expect(`${first.describe("")}`).toContain("first()");

	const secondRegistry = createTestRegistry<LocatorSchemaPaths>(page);
	secondRegistry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" }).nth("last");

	const last = secondRegistry.getLocator("fictional.filter@hasText");
	expect(`${last.describe("")}`).toContain("last()");
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

test("getLocator rejects a malformed path from JavaScript with the path rules", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("list").locator("ul");
	registry.add("list.item").locator("li");
	const getLocator = registry.getLocator.bind(registry) as (path: string) => unknown;

	expect(() => getLocator("list..item")).toThrowError(
		"LocatorSchemaPath string cannot contain consecutive dots: list..item",
	);
	expect(() => getLocator("list.")).toThrowError("LocatorSchemaPath string cannot end with a dot: list.");
	expect(() => getLocator("")).toThrowError("LocatorSchemaPath string cannot be empty");
});

test("getLocator reports a cycle through has references as before", async ({ page }) => {
	type LocatorSchemaPaths = "a" | "b";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("a").locator("li").filter({ has: "b" });
	registry.add("b").locator("p").filter({ has: "a" });

	expect(() => registry.getLocator("a")).toThrowError('Detected cyclic filter reference while resolving "a": "b".');
});
