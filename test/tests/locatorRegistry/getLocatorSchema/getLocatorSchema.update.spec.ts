import { expect, test } from "@fixtures/testApp.fixtures";
import { LocatorRegistryInternal } from "../../../../src/locators";

test("update replaces intermediate definitions without mutating registry", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section.heading");
	expect(`${original.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const replaced = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section")
		.getByRole("heading", { level: 1 })
		.getNestedLocator();

	expect(`${replaced.describe("")}`).toEqual(
		"locator('body').getByRole('heading', { level: 1 }).getByRole('heading', { level: 2 })",
	);

	const after = testFilters.getNestedLocator("body.section.heading");
	expect(`${after.describe("")}`).toEqual(`${original.describe("")}`);
});

test("update operations can be chained across sub-paths", async ({ testFilters }) => {
	const chained = testFilters
		.getLocatorSchema("body.section")
		.update("body")
		.locator("SOMEBODY")
		.update("body.section")
		.getByRole("button", { name: "Click me!" })
		.getNestedLocator();

	expect(`${chained.describe("")}`).toEqual("locator('SOMEBODY').getByRole('button', { name: 'Click me!' })");
});

test("update merges options without requiring full definitions", async ({ testFilters }) => {
	const merged = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ name: "HEADING TEXT" })
		.getNestedLocator();

	expect(`${merged.describe("")}`).toEqual(
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

	expect(`${full.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(`${partial.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
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

	expect(`${locator.describe("")}`).toEqual(
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

	expect(`${chained.describe("")}`).toEqual(
		"locator('SOMEBODY').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
	);

	const after = testFilters.getNestedLocator("body.section.heading");
	expect(`${after.describe("")}`).toEqual(`${original.describe("")}`);
});

test("update preserves filters on the target sub-path", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.update("fictional.filter@hasText")
		.locator("updated")
		.getNestedLocator();

	expect(`${locator.describe("")}`).toEqual("locator('updated').filter({ hasText: 'hasText' })");
});

test("update patches definitions without altering chained filters or indices", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.button")
		.filter("body.section.button", { hasText: /Click me!/ })
		.nth("body.section", "first")
		.update("body.section.button")
		.getByRole("button", { name: "Click me!" })
		.getNestedLocator();

	expect(`${updated.describe("")}`).toEqual(
		"locator('body').locator('section').first().getByRole('button', { name: 'Click me!' }).filter({ hasText: /Click me!/ })",
	);

	const untouched = testFilters.getLocatorSchema("body.section.button").getNestedLocator();
	expect(`${untouched.describe("")}`).toEqual("locator('body').locator('section').getByRole('button')");
});

test("update can remove locator options filters", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section@playground");
	expect(`${original.describe("")}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const locator = testFilters
		.getLocatorSchema("body.section@playground")
		.update("body.section@playground")
		.locator({ hasText: undefined })
		.getNestedLocator();

	expect(`${locator.describe("")}`).toEqual("locator('body').locator('section')");
});

test("update can switch locator strategies, caching all latest locator definitions and preserving state of filters and indices", async ({
	page,
	testFilters,
}) => {
	const path = "body.section" as const;
	const schema = testFilters.getLocatorSchema(path);

	const initialLocator = schema.getNestedLocator();
	expect(`${initialLocator.describe("")}`).toEqual("locator('body').locator('section')");

	const manualLocator = page.locator("body").locator("newSelector").filter({ hasText: "Text" }).first();
	const locator = schema
		.update(path)
		.locator("newSelector")
		.filter(path, { hasText: "Text" })
		.nth(path, 0)
		.getNestedLocator();
	expect(`${locator.describe("")}`).toEqual(`${manualLocator.describe("")}`);

	const manualRole = page
		.locator("body")
		.getByRole("region", { name: "Now a region" })
		.filter({ hasText: "Text" })
		.first();
	const role = schema.update(path).getByRole("region", { name: "Now a region" }).getNestedLocator();
	expect(`${role.describe("")}`).toEqual(`${manualRole.describe("")}`);

	const manualText = page.locator("body").getByText("Text node").filter({ hasText: "Text" }).first();
	const text = schema.update(path).getByText("Text node").getNestedLocator();
	expect(`${text.describe("")}`).toEqual(`${manualText.describe("")}`);

	const manualLabel = page.locator("body").getByLabel("Label").filter({ hasText: "Text" }).first();
	const label = schema.update(path).getByLabel("Label").getNestedLocator();
	expect(`${label.describe("")}`).toEqual(`${manualLabel.describe("")}`);

	const manualPlaceholder = page.locator("body").getByPlaceholder("Placeholder").filter({ hasText: "Text" }).first();
	const placeholder = schema.update(path).getByPlaceholder("Placeholder").getNestedLocator();
	expect(`${placeholder.describe("")}`).toEqual(`${manualPlaceholder.describe("")}`);

	const manualAltText = page.locator("body").getByAltText("Alt").filter({ hasText: "Text" }).first();
	const altText = schema.update(path).getByAltText("Alt").getNestedLocator();
	expect(`${altText.describe("")}`).toEqual(`${manualAltText.describe("")}`);

	const manualTitle = page.locator("body").getByTitle("Title").filter({ hasText: "Text" }).first();
	const title = schema.update(path).getByTitle("Title").getNestedLocator();
	expect(`${title.describe("")}`).toEqual(`${manualTitle.describe("")}`);

	const manualFrameLocator = page.locator("body").locator("iframe[name=child]");
	const frameLocator = schema.update(path).frameLocator("iframe[name=child]").getNestedLocator();
	expect(`${frameLocator.describe("")}`).toEqual(`${manualFrameLocator.describe("")}`);

	const manualTestId = page.locator("body").getByTestId("new-test-id").filter({ hasText: "Text" }).first();
	const testId = schema.update(path).getByTestId("new-test-id").getNestedLocator();
	expect(`${testId.describe("")}`).toEqual(`${manualTestId.describe("")}`);

	const manualId = page.locator("body").locator('[id="new-id"]').filter({ hasText: "Text" }).first();
	const id = schema.update(path).getById("new-id").getNestedLocator();
	expect(`${id.describe("")}`).toEqual(`${manualId.describe("")}`);

	const manualDataCy = page.locator("body").locator('[data-cy="new-cy"]').filter({ hasText: "Text" }).first();
	const dataCy = schema.update(path).locator('[data-cy="new-cy"]').getNestedLocator();
	expect(`${dataCy.describe("")}`).toEqual(`${manualDataCy.describe("")}`);

	const resetLocator = schema.update(path).locator().getNestedLocator();
	expect(`${resetLocator.describe("")}`).toEqual(`${dataCy.describe("")}`);

	const resetRole = schema.update(path).getByRole().getNestedLocator();
	expect(`${resetRole.describe("")}`).toEqual(`${role.describe("")}`);

	const resetText = schema.update(path).getByText().getNestedLocator();
	expect(`${resetText.describe("")}`).toEqual(`${text.describe("")}`);

	const resetLabel = schema.update(path).getByLabel().getNestedLocator();
	expect(`${resetLabel.describe("")}`).toEqual(`${label.describe("")}`);

	const resetPlaceholder = schema.update(path).getByPlaceholder().getNestedLocator();
	expect(`${resetPlaceholder.describe("")}`).toEqual(`${placeholder.describe("")}`);

	const resetAltText = schema.update(path).getByAltText().getNestedLocator();
	expect(`${resetAltText.describe("")}`).toEqual(`${altText.describe("")}`);

	const resetTitle = schema.update(path).getByTitle().getNestedLocator();
	expect(`${resetTitle.describe("")}`).toEqual(`${title.describe("")}`);

	const resetFrameLocator = schema.update(path).frameLocator().getNestedLocator();
	expect(`${resetFrameLocator.describe("")}`).toEqual(`${frameLocator.describe("")}`);

	const resetTestId = schema.update(path).getByTestId().getNestedLocator();
	expect(`${resetTestId.describe("")}`).toEqual(`${testId.describe("")}`);

	const resetId = schema.update(path).getById().getNestedLocator();
	expect(`${resetId.describe("")}`).toEqual(`${id.describe("")}`);

	const resetLocatorAgain = schema.update(path).locator().getNestedLocator();
	expect(`${resetLocatorAgain.describe("")}`).toEqual(`${dataCy.describe("")}`);

	const lastRoleClearSteps = schema
		.update(path)
		.getByRole()
		.clearSteps("body")
		.clearSteps("body.section")
		.getNestedLocator();
	expect(`${lastRoleClearSteps.describe("")}`).toEqual("locator('body').getByRole('region', { name: 'Now a region' })");

	const stillNoFiltersAndIndicesOnAdditionalSwitch = schema.update(path).locator().getNestedLocator();
	expect(`${stillNoFiltersAndIndicesOnAdditionalSwitch.describe("")}`).toEqual(
		"locator('body').locator('[data-cy=\"new-cy\"]')",
	);
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

	expect(`${withRoleAndOptions.describe("")}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withRoleAndOptions.describe("")}`).toContain("filter({ hasText: 'patched' })");
	expect(`${withRoleAndOptions.describe("")}`).toContain("last()");

	const withOptionsOnly = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole({ name: "patched" })
		.getNestedLocator();

	expect(`${withOptionsOnly.describe("")}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withOptionsOnly.describe("")}`).toContain("filter({ hasText: 'initial' })");
	expect(`${withOptionsOnly.describe("")}`).toContain("first()");
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

	expect(`${textPatched.describe("")}`).toEqual(
		"getByText('seed', { exact: true }).filter({ hasText: 'patched' }).first()",
	);

	const locatorPatched = await registry
		.getLocatorSchema("update.locator")
		.update("update.locator")
		.locator({ hasText: "opt" })
		.filter("update.locator", { hasText: "patched" })
		.nth("update.locator", 0)
		.getNestedLocator();

	expect(`${locatorPatched.describe("")}`).toEqual(
		"locator('.seed').filter({ hasText: 'opt' }).filter({ hasText: 'patched' }).first()",
	);

	const framePatched = await registry
		.getLocatorSchema("update.frame")
		.update("update.frame")
		.frameLocator()
		.getNestedLocator();

	expect(`${framePatched.describe("")}`).toEqual("locator('iframe[name=seed]')");
});

test("update accepts ids verbatim and RegExp ids as patterns", async ({ page, testFilters }) => {
	const path = "body.section" as const;
	const schema = testFilters.getLocatorSchema(path);

	const manualTrickyId = page.locator("body").locator('[id="settings.panel"]');
	const trickyId = schema.update(path).getById("settings.panel").getNestedLocator();
	expect(`${trickyId.describe("")}`).toEqual(`${manualTrickyId.describe("")}`);

	const manualRegExpId = page.locator("body").locator("internal:attr=[id=/^settings\\.panel$/i]");
	const regExpId = schema
		.update(path)
		.getById(/^settings\.panel$/i)
		.getNestedLocator();
	expect(`${regExpId.describe("")}`).toEqual(`${manualRegExpId.describe("")}`);

	expect(() => schema.update(path).getById("")).toThrowError(`getById requires a non-empty id for "${path}".`);
	expect(() => schema.update(path).getById(/sticky/y)).not.toThrow();
});
