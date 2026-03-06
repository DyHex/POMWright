import { expect, test } from "@fixtures/testApp.fixtures";
import { LocatorRegistryInternal } from "../../../../src/locators";

test("update replaces intermediate definitions without mutating registry", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section.heading");
	expect(`${original}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const replaced = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section")
		.getByRole("heading", { level: 1 })
		.getNestedLocator();

	expect(`${replaced}`).toEqual(
		"locator('body').getByRole('heading', { level: 1 }).getByRole('heading', { level: 2 })",
	);

	const after = testFilters.getNestedLocator("body.section.heading");
	expect(`${after}`).toEqual(`${original}`);
});

test("update operations can be chained across sub-paths", async ({ testFilters }) => {
	const chained = testFilters
		.getLocatorSchema("body.section")
		.update("body")
		.locator("SOMEBODY")
		.update("body.section")
		.getByRole("button", { name: "Click me!" })
		.getNestedLocator();

	expect(`${chained}`).toEqual("locator('SOMEBODY').getByRole('button', { name: 'Click me!' })");
});

test("update merges options without requiring full definitions", async ({ testFilters }) => {
	const merged = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ name: "HEADING TEXT" })
		.getNestedLocator();

	expect(`${merged}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
	);
});

test("update handles full and partial definitions from fresh builders", async ({ testFilters }) => {
	const full = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getNestedLocator();

	const partial = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 3 })
		.getNestedLocator();

	expect(`${full}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(`${partial}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(full).not.toBe(partial);
});

test("update preserves registered filters on untouched segments", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText")
		.getByRole("button", { name: "roleOptions" })
		.update("fictional.filter@hasNotText.filter@hasText")
		.locator("locator")
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'hasText' })",
	);
});

test("update rejects unknown sub-paths", ({ testFilters }) => {
	expect(() =>
		testFilters
			.getLocatorSchema("body.section.heading")
			// @ts-expect-error Testing invalid path handling
			.update("body.section.missing")
			.locator("noop"),
	).toThrow('"body.section.missing" is not a valid sub-path of "body.section.heading"');
});

test("update can mix ancestor and descendant changes without mutating registry", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section.heading");

	const chained = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body")
		.locator("SOMEBODY")
		.update("body.section.heading")
		.getByRole({ name: "HEADING TEXT" })
		.getNestedLocator();

	expect(`${chained}`).toEqual(
		"locator('SOMEBODY').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
	);

	const after = testFilters.getNestedLocator("body.section.heading");
	expect(`${after}`).toEqual(`${original}`);
});

test("update preserves filters on the target sub-path", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.update("fictional.filter@hasText")
		.locator("updated")
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('updated').filter({ hasText: 'hasText' })");
});

test("update patches definitions without altering chained filters or indices", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.button")
		.filter("body.section.button", { hasText: /Click me!/ })
		.nth("body.section", "first")
		.update("body.section.button")
		.getByRole("button", { name: "Click me!" })
		.getNestedLocator();

	expect(`${updated}`).toEqual(
		"locator('body').locator('section').first().getByRole('button', { name: 'Click me!' }).filter({ hasText: /Click me!/ })",
	);

	const untouched = testFilters.getLocatorSchema("body.section.button").getNestedLocator();
	expect(`${untouched}`).toEqual("locator('body').locator('section').getByRole('button')");
});

test("update can remove locator options filters", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section@playground");
	expect(`${original}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const locator = testFilters
		.getLocatorSchema("body.section@playground")
		.update("body.section@playground")
		.locator({ hasText: undefined })
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section')");
});

test("update can switch locator strategies, caching all latest locator definitions and preserving state of filters and indices", async ({
	page,
	testFilters,
}) => {
	const path = "body.section" as const;
	const schema = testFilters.getLocatorSchema(path);

	const initialLocator = schema.getNestedLocator();
	expect(`${initialLocator}`).toEqual("locator('body').locator('section')");

	const manualLocator = page.locator("body").locator("newSelector").filter({ hasText: "Text" }).first();
	const locator = schema
		.update(path)
		.locator("newSelector")
		.filter(path, { hasText: "Text" })
		.nth(path, 0)
		.getNestedLocator();
	expect(`${locator}`).toEqual(`${manualLocator}`);

	const manualRole = page
		.locator("body")
		.getByRole("region", { name: "Now a region" })
		.filter({ hasText: "Text" })
		.first();
	const role = schema.update(path).getByRole("region", { name: "Now a region" }).getNestedLocator();
	expect(`${role}`).toEqual(`${manualRole}`);

	const manualText = page.locator("body").getByText("Text node").filter({ hasText: "Text" }).first();
	const text = schema.update(path).getByText("Text node").getNestedLocator();
	expect(`${text}`).toEqual(`${manualText}`);

	const manualLabel = page.locator("body").getByLabel("Label").filter({ hasText: "Text" }).first();
	const label = schema.update(path).getByLabel("Label").getNestedLocator();
	expect(`${label}`).toEqual(`${manualLabel}`);

	const manualPlaceholder = page.locator("body").getByPlaceholder("Placeholder").filter({ hasText: "Text" }).first();
	const placeholder = schema.update(path).getByPlaceholder("Placeholder").getNestedLocator();
	expect(`${placeholder}`).toEqual(`${manualPlaceholder}`);

	const manualAltText = page.locator("body").getByAltText("Alt").filter({ hasText: "Text" }).first();
	const altText = schema.update(path).getByAltText("Alt").getNestedLocator();
	expect(`${altText}`).toEqual(`${manualAltText}`);

	const manualTitle = page.locator("body").getByTitle("Title").filter({ hasText: "Text" }).first();
	const title = schema.update(path).getByTitle("Title").getNestedLocator();
	expect(`${title}`).toEqual(`${manualTitle}`);

	const manualFrameLocator = page.locator("body").locator("iframe[name=child]");
	const frameLocator = schema.update(path).frameLocator("iframe[name=child]").getNestedLocator();
	expect(`${frameLocator}`).toEqual(`${manualFrameLocator}`);

	const manualTestId = page.locator("body").getByTestId("new-test-id").filter({ hasText: "Text" }).first();
	const testId = schema.update(path).getByTestId("new-test-id").getNestedLocator();
	expect(`${testId}`).toEqual(`${manualTestId}`);

	const manualId = page.locator("body").locator("#new-id").filter({ hasText: "Text" }).first();
	const id = schema.update(path).getById("new-id").getNestedLocator();
	expect(`${id}`).toEqual(`${manualId}`);

	const manualDataCy = page.locator("body").locator('[data-cy="new-cy"]').filter({ hasText: "Text" }).first();
	const dataCy = schema.update(path).locator('[data-cy="new-cy"]').getNestedLocator();
	expect(`${dataCy}`).toEqual(`${manualDataCy}`);

	const resetLocator = schema.update(path).locator().getNestedLocator();
	expect(`${resetLocator}`).toEqual(`${dataCy}`);

	const resetRole = schema.update(path).getByRole().getNestedLocator();
	expect(`${resetRole}`).toEqual(`${role}`);

	const resetText = schema.update(path).getByText().getNestedLocator();
	expect(`${resetText}`).toEqual(`${text}`);

	const resetLabel = schema.update(path).getByLabel().getNestedLocator();
	expect(`${resetLabel}`).toEqual(`${label}`);

	const resetPlaceholder = schema.update(path).getByPlaceholder().getNestedLocator();
	expect(`${resetPlaceholder}`).toEqual(`${placeholder}`);

	const resetAltText = schema.update(path).getByAltText().getNestedLocator();
	expect(`${resetAltText}`).toEqual(`${altText}`);

	const resetTitle = schema.update(path).getByTitle().getNestedLocator();
	expect(`${resetTitle}`).toEqual(`${title}`);

	const resetFrameLocator = schema.update(path).frameLocator().getNestedLocator();
	expect(`${resetFrameLocator}`).toEqual(`${frameLocator}`);

	const resetTestId = schema.update(path).getByTestId().getNestedLocator();
	expect(`${resetTestId}`).toEqual(`${testId}`);

	const resetId = schema.update(path).getById().getNestedLocator();
	expect(`${resetId}`).toEqual(`${id}`);

	const resetLocatorAgain = schema.update(path).locator().getNestedLocator();
	expect(`${resetLocatorAgain}`).toEqual(`${dataCy}`);

	const lastRoleClearSteps = schema
		.update(path)
		.getByRole()
		.clearSteps("body")
		.clearSteps("body.section")
		.getNestedLocator();
	expect(`${lastRoleClearSteps}`).toEqual("locator('body').getByRole('region', { name: 'Now a region' })");

	const stillNoFiltersAndIndicesOnAdditionalSwitch = schema.update(path).locator().getNestedLocator();
	expect(`${stillNoFiltersAndIndicesOnAdditionalSwitch}`).toEqual("locator('body').locator('[data-cy=\"new-cy\"]')");
});

test("update getByRole overloads preserve patch semantics without undefined placeholders", async ({ page }) => {
	type LocalPath = "overload" | "overload.target";
	const registry = new LocatorRegistryInternal<LocalPath>(page);

	registry.add("overload").locator("body");
	registry.add("overload.target").getByRole("button", { name: "initial" }).filter({ hasText: "initial" }).nth(0);

	const withRoleAndOptions = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole("button", { name: "patched" })
		.filter("overload.target", { hasText: "patched" })
		.nth("overload.target", "last")
		.getNestedLocator();

	expect(`${withRoleAndOptions}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withRoleAndOptions}`).toContain("filter({ hasText: 'patched' })");
	expect(`${withRoleAndOptions}`).toContain("last()");

	const withOptionsOnly = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole({ name: "patched" })
		.getNestedLocator();

	expect(`${withOptionsOnly}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withOptionsOnly}`).toContain("filter({ hasText: 'initial' })");
	expect(`${withOptionsOnly}`).toContain("first()");
});

test("update overloads cover multiple strategies and retain filter/index steps", async ({ page }) => {
	type LocalPath = "update.text" | "update.locator" | "update.frame";
	const registry = new LocatorRegistryInternal<LocalPath>(page);

	registry.add("update.text").getByText("seed");
	registry.add("update.locator").locator(".seed");
	registry.add("update.frame").frameLocator("iframe[name=seed]");

	const textPatched = await registry
		.getLocatorSchema("update.text")
		.update("update.text")
		.getByText({ exact: true })
		.filter("update.text", { hasText: "patched" })
		.nth("update.text", 0)
		.getNestedLocator();

	expect(`${textPatched}`).toEqual("getByText('seed', { exact: true }).filter({ hasText: 'patched' }).first()");

	const locatorPatched = await registry
		.getLocatorSchema("update.locator")
		.update("update.locator")
		.locator({ hasText: "opt" })
		.filter("update.locator", { hasText: "patched" })
		.nth("update.locator", 0)
		.getNestedLocator();

	expect(`${locatorPatched}`).toEqual(
		"locator('.seed').filter({ hasText: 'opt' }).filter({ hasText: 'patched' }).first()",
	);

	const framePatched = await registry
		.getLocatorSchema("update.frame")
		.update("update.frame")
		.frameLocator()
		.getNestedLocator();

	expect(`${framePatched}`).toEqual("locator('iframe[name=seed]')");
});
