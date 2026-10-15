import { expect, test } from "@fixtures/testApp.fixtures";
import { LocatorRegistryInternal } from "../../../../src/locators";

test("nth applies numeric index to targeted sub-path", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema("body.section.button").nth("body.section.button", 1).getNestedLocator();

	expect(`${locator.describe("")}`).toEqual("locator('body').locator('section').getByRole('button').nth(1)");
});

test('nth supports "first" and "last" selectors', async ({ testFilters }) => {
	const first = testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", "first")
		.getNestedLocator();

	expect(`${first.describe("")}`).toEqual("locator('body').locator('section').getByRole('button').first()");

	const last = testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", "last")
		.getNestedLocator();

	expect(`${last.describe("")}`).toEqual("locator('body').locator('section').getByRole('button').last()");
});

test("nth can target intermediate sub-paths", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section.heading")
		.nth("body", 0)
		.nth("body.section", 1)
		.nth("body.section.heading", -1)
		.getNestedLocator();

	expect(`${locator.describe("")}`).toEqual(
		"locator('body').first().locator('section').nth(1).getByRole('heading', { level: 2 }).last()",
	);
});

test("nth overrides are scoped to each builder instance", async ({ testFilters }) => {
	const builder = testFilters.getLocatorSchema("body.section.button");
	const first = builder.nth("body.section.button", "first").getNestedLocator();
	const second = testFilters.getLocatorSchema("body.section.button").getNestedLocator();

	expect(`${first.describe("")}`).toEqual("locator('body').locator('section').getByRole('button').first()");
	expect(`${second.describe("")}`).toEqual("locator('body').locator('section').getByRole('button')");
});

test("filter and nth ordering apply per sub-path when chained on getLocatorSchema", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("one.two")
		.clearSteps("one.two")
		.filter("one", { hasText: "outer" })
		.nth("one", "first")
		.filter("one.two", { hasText: "inner" })
		.nth("one.two", "last")
		.getNestedLocator();

	expect(`${locator.describe("")}`).toEqual(
		"locator('div.one').filter({ hasText: 'outer' }).first().locator('div.two').filter({ hasText: 'inner' }).last()",
	);
});

test("nth on a frame sub-path picks the iframe element before the frame is entered", async ({ page }) => {
	type LocalPath = "frame" | "frame.button";
	const registry = new LocatorRegistryInternal<LocalPath>(page);
	registry.add("frame").frameLocator("iframe");
	registry.add("frame.button").getByRole("button");

	const locator = registry.getLocatorSchema("frame.button").nth("frame", 1).getNestedLocator();
	expect(`${locator.describe("")}`).toEqual(
		`${page.locator("iframe").nth(1).contentFrame().getByRole("button").describe("")}`,
	);
});

test("nth hands every index but first and last to Playwright, as Playwright's own nth takes it", async ({
	testFilters,
}) => {
	await testFilters.page.goto(testFilters.fullUrl);
	const buttons = () => testFilters.getLocatorSchema("body.section@playground.button");
	const playwright = testFilters.page
		.locator("section")
		.filter({ hasText: /Playground/i })
		.getByRole("button");

	// @ts-expect-error a string index, as in Playwright, is a compile error
	const byString = buttons().nth("2").getNestedLocator();
	await expect(byString).toHaveText("Green");
	// @ts-expect-error the same call on Playwright's own locator
	await expect(playwright.nth("2")).toHaveText("Green");

	// @ts-expect-error undefined is not an index; it matches nothing, as in Playwright
	await expect(buttons().nth(undefined).getNestedLocator()).toHaveCount(0);
	// @ts-expect-error the same call on Playwright's own locator
	await expect(playwright.nth(undefined)).toHaveCount(0);
	// @ts-expect-error null is not an index; it matches nothing, as in Playwright
	await expect(buttons().nth(null).getNestedLocator()).toHaveCount(0);

	await expect(buttons().nth(-1).getNestedLocator()).toHaveText("Reset Color");
});
