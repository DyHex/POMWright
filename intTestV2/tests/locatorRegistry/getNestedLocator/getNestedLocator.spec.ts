import { expect, test } from "@fixtures-v2/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("getNestedLocator should resolve chained locators automatically", async ({ page }) => {
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

	const manuallyChained = page
		.locator(".w3-top")
		.locator(".w3-dropdown-hover")
		.locator(".w3-dropdown-content")
		.locator(".w3-bar-item");

	const automaticallyChained = registry.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${automaticallyChained}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);

	expect(`${automaticallyChained}`).toEqual(`${manuallyChained}`);
});

test("getLocator returns the terminal locator while getNestedLocator builds the chain", async ({ page }) => {
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

	const direct = registry.getLocator("topMenu.notifications.dropdown.item");
	const nested = registry.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${direct}`).toEqual("locator('.w3-bar-item')");
	expect(`${nested}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);
});

test("getNestedLocator returns a fresh locator each time", async ({ page }) => {
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

	const first = registry.getNestedLocator("topMenu.notifications.dropdown.item");
	const second = registry.getNestedLocator("topMenu.notifications.dropdown.item");
	expect(first).not.toBe(second);
	expect(`${first}`).toEqual(`${second}`);
});

test.describe("getNestedLocator for locatorSchema with filter property", () => {
	const cases = [
		{
			label: "role",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByRole("button"),
			expected: "getByRole('button')",
		},
		{
			label: "text",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByText("text"),
			expected: "getByText('text')",
		},
		{
			label: "label",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByLabel("label"),
			expected: "getByLabel('label')",
		},
		{
			label: "placeholder",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByPlaceholder("placeholder"),
			expected: "getByPlaceholder('placeholder')",
		},
		{
			label: "altText",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByAltText("altText"),
			expected: "getByAltText('altText')",
		},
		{
			label: "title",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByTitle("title"),
			expected: "getByTitle('title')",
		},
		{
			label: "locator",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").locator("locator"),
			expected: "locator('locator')",
		},
		{
			label: "testId",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getByTestId("testId"),
			expected: "getByTestId('testId')",
		},
		{
			label: "id",
			register: (registry: LocatorRegistryInternal<"fictional.filter@undefined">) =>
				registry.add("fictional.filter@undefined").getById("id"),
			expected: "locator('#id')",
		},
	];

	for (const { label, register, expected } of cases) {
		test(`definition ${label}: should apply filter`, async ({ page }) => {
			const registry = createTestRegistry<"fictional.filter@undefined">(page);
			register(registry);

			const nested = registry.getNestedLocator("fictional.filter@undefined");
			expect(`${nested}`).toEqual(expected);
		});
	}

	test("frameLocator keeps the chain inside the frame and skips frame-level filters", async ({ page }) => {
		type LocatorSchemaPaths =
			| "fictional.filter@hasNotText"
			| "fictional.filter@hasNotText.filter@hasText"
			| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry.add("fictional.filter@hasNotText").getByRole("button").filter({ hasNotText: "hasNotText" });
		registry.add("fictional.filter@hasNotText.filter@hasText").frameLocator('iframe[title="name"]');
		registry
			.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
			.getByRole("button", { name: "inside frame" })
			.filter({ hasNotText: "hasNotText" });

		const nested = registry.getNestedLocator("fictional.filter@hasNotText.filter@hasText.filter@hasNotText");
		const manualNested = page
			.getByRole("button")
			.filter({ hasNotText: "hasNotText" })
			.frameLocator('iframe[title="name"]')
			.getByRole("button", { name: "inside frame" })
			.filter({ hasNotText: "hasNotText" });

		expect(`${nested}`).toEqual(`${manualNested}`);
	});

	test("multiple nesting/chaining retains filters across the chain", async ({ page }) => {
		type LocatorSchemaPaths =
			| "fictional.filter@hasNotText"
			| "fictional.filter@hasNotText.filter@hasText"
			| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText"
			| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry
			.add("fictional.filter@hasNotText")
			.getByRole("button", { name: "roleOptions" })
			.filter({ hasNotText: "hasNotText" });
		registry
			.add("fictional.filter@hasNotText.filter@hasText")
			.locator("locator", {
				hasText: "locatorOptionsHasText",
				hasNotText: "locatorOptionshasNotText",
			})
			.filter({ hasText: "hasText" });
		registry
			.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
			.getByTestId("testId")
			.filter({ hasNotText: "hasNotText" });
		registry
			.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.getByLabel("label", { exact: true })
			.filter({ hasText: "hasText" });

		const multiChain = registry.getNestedLocator(
			"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
		);

		expect(`${multiChain}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'locatorOptionsHasText' }).filter({ hasNotText: 'locatorOptionshasNotText' }).filter({ hasText: 'hasText' }).getByTestId('testId').filter({ hasNotText: 'hasNotText' }).getByLabel('label', { exact: true }).filter({ hasText: 'hasText' })",
		);
	});

	test("filter definitions that omit options stay stable", async ({ page }) => {
		type LocatorSchemaPaths = "fictional.filter@optionsUndefined";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry
			.add("fictional.filter@optionsUndefined")
			.getByRole("button")
			.filter({ has: undefined, hasNot: undefined, hasText: undefined, hasNotText: undefined });

		const nested = registry.getNestedLocator("fictional.filter@optionsUndefined");
		expect(`${nested}`).toEqual("getByRole('button')");
	});

	test("schema filters resolve locatorPath references", async ({ page }) => {
		type LocatorSchemaPaths =
			| "body.section.heading"
			| "body.section.button"
			| "fictional.locatorAndOptionsWithfilter@allOptions";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry.add("body.section.heading").getByRole("heading", { level: 2 });
		registry.add("body.section.button").getByRole("button");
		registry
			.add("fictional.locatorAndOptionsWithfilter@allOptions")
			.getByRole("button", { name: "roleOptions" })
			.filter({
				has: { locatorPath: "body.section.heading" },
				hasNot: { locatorPath: "body.section.button" },
				hasText: "hasText",
				hasNotText: "hasNotText",
			});

		const nested = registry.getNestedLocator("fictional.locatorAndOptionsWithfilter@allOptions");

		const manual = page.getByRole("button", { name: "roleOptions" }).filter({
			has: page.getByRole("heading", { level: 2 }),
			hasNot: page.getByRole("button"),
			hasText: "hasText",
			hasNotText: "hasNotText",
		});

		expect(`${nested}`).toEqual(`${manual}`);
		expect(`${nested}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasText: 'hasText' }).filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button') })",
		);
	});

	test("schema filters can inline locator definitions", async ({ page }) => {
		type LocatorSchemaPaths = "fictional.locatorWithfilter@allOptions";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry
			.add("fictional.locatorWithfilter@allOptions")
			.getByRole("button")
			.filter({
				has: { locator: { type: "locator", selector: "section" } },
				hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
				hasText: "hasText",
				hasNotText: "hasNotText",
			});

		const nested = registry.getNestedLocator("fictional.locatorWithfilter@allOptions");

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
		);
	});

	test("frame locator definitions are rejected inside filters", async ({ page }) => {
		type LocatorSchemaPaths = "fictional.filter@hasNotText";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry
			.add("fictional.filter@hasNotText")
			.getByRole("button")
			.filter({
				has: { locator: { type: "frameLocator", selector: "iframe" } },
			});

		expect(() => registry.getNestedLocator("fictional.filter@hasNotText")).toThrow(
			/Frame locators cannot be used as filter locators/,
		);
	});

	test("getNestedLocator resolves has/hasNot locatorPath references", async ({ page }) => {
		type LocatorSchemaPaths =
			| "body.section.heading"
			| "body.section@playground.button@red"
			| "fictional.filter@hasNotText";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry.add("body.section.heading").getByRole("heading", { level: 2 });
		registry.add("body.section@playground.button@red").getByRole("button", { name: "Red" });
		registry
			.add("fictional.filter@hasNotText")
			.getByRole("button")
			.filter({ hasNotText: "hasNotText" })
			.filter({ has: { locatorPath: "body.section.heading" } })
			.filter({ hasNot: { locatorPath: "body.section@playground.button@red" } });

		const nested = registry.getNestedLocator("fictional.filter@hasNotText");

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
		);
	});

	test("getNestedLocator resolves inline locator definitions for has/hasNot", async ({ page }) => {
		type LocatorSchemaPaths = "fictional.filter@hasNotText";

		const registry = createTestRegistry<LocatorSchemaPaths>(page);

		registry
			.add("fictional.filter@hasNotText")
			.getByRole("button")
			.filter({ hasNotText: "hasNotText" })
			.filter({ has: { locator: { type: "locator", selector: "section" } } })
			.filter({ hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } } });

		const nested = registry.getNestedLocator("fictional.filter@hasNotText");

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
		);
	});
});

const fullPath = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText" as const;
const expectedChain =
	"getByRole('button').filter({ hasNotText: 'hasNotText' }).nth(2).getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })";

test("getNestedLocator applies chained indices", async ({ page }) => {
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
		.filter({ hasText: "hasText" });

	const locator = registry.getNestedLocator(fullPath);

	expect(`${locator}`).toContain(".nth(2)");
	expect(`${locator}`).toEqual(expectedChain);
});

test("getNestedLocator honors chained filters and indices", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("fictional.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" })
		.filter({ hasText: "extra" })
		.nth(1)
		.filter({ hasNotText: "tail" });

	const locator = registry.getNestedLocator("fictional.filter@hasText");

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1).filter({ hasNotText: 'tail' })",
	);
});

test("getNestedLocator supports explicit last() selection", async ({ page }) => {
	type LocatorSchemaPaths =
		| "fictional.filter@hasNotText"
		| "fictional.filter@hasNotText.filter@hasText"
		| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText"
		| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasNotText").getByRole("button").filter({ hasNotText: "hasNotText" }).nth("last");
	registry.add("fictional.filter@hasNotText.filter@hasText").getByRole("button").filter({ hasText: "hasText" });
	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByRole("button")
		.filter({ hasNotText: "hasNotText" });
	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" });

	const locator = registry.getNestedLocator(fullPath);

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).last().getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })",
	);
});

test('getNestedLocator accepts "first" and "last" selections', async ({ page }) => {
	type LocatorSchemaPaths =
		| "fictional.filter@hasNotText"
		| "fictional.filter@hasNotText.filter@hasText"
		| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText"
		| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasNotText").getByRole("button").filter({ hasNotText: "hasNotText" }).nth("first");
	registry.add("fictional.filter@hasNotText.filter@hasText").getByRole("button").filter({ hasText: "hasText" });
	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByRole("button")
		.filter({ hasNotText: "hasNotText" })
		.nth("last");
	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" });

	const locator = registry.getNestedLocator(fullPath);

	expect(`${locator}`).toContain("first()");
	expect(`${locator}`).toContain("last()");
});

test("getNestedLocator rejects unknown paths", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText").getByRole("button");

	// @ts-expect-error Testing invalid argument
	expect(() => registry.getNestedLocator("fictional")).toThrow('No locator schema registered for path "fictional".');
});

test("getNestedLocator rejects partially matching paths", async ({ page }) => {
	type LocatorSchemaPaths = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText").getByRole("button");

	// @ts-expect-error Testing invalid argument
	expect(() => registry.getNestedLocator("fictional.filter@has")).toThrow(
		'No locator schema registered for path "fictional.filter@has".',
	);
});
