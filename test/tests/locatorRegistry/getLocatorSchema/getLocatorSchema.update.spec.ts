import { expect, test } from "@fixtures/testApp.fixtures";
import { createRegistryWithAccessors } from "pomwright";

test("replace changes intermediate definitions without mutating registry", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section.heading");
	expect(`${original.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const replaced = testFilters
		.getLocatorSchema("body.section.heading")
		.replace("body.section")
		.getByRole("heading", { level: 1 })
		.getNestedLocator();

	expect(`${replaced.describe("")}`).toEqual(
		"locator('body').getByRole('heading', { level: 1 }).getByRole('heading', { level: 2 })",
	);

	const after = testFilters.getNestedLocator("body.section.heading");
	expect(`${after.describe("")}`).toEqual(`${original.describe("")}`);
});

test("update and replace operations can be chained across sub-paths", async ({ testFilters }) => {
	const chained = testFilters
		.getLocatorSchema("body.section")
		.update("body")
		.locator("SOMEBODY")
		.replace("body.section")
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

test("update and replace preserve registered filters on untouched segments", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText")
		.getByRole("button", { name: "roleOptions" })
		.replace("fictional.filter@hasNotText.filter@hasText")
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

test("replace preserves filters on the target sub-path", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.replace("fictional.filter@hasText")
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

test("update can remove locator options with null, and leaves them alone for undefined", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("body.section@playground");
	expect(`${original.describe("")}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const removed = testFilters
		.getLocatorSchema("body.section@playground")
		.update("body.section@playground")
		.locator({ hasText: null })
		.getNestedLocator();
	expect(`${removed.describe("")}`).toEqual("locator('body').locator('section')");

	const untouched = testFilters
		.getLocatorSchema("body.section@playground")
		.update("body.section@playground")
		.locator({ hasText: undefined })
		.getNestedLocator();
	expect(`${untouched.describe("")}`).toEqual(`${original.describe("")}`);
});

test("replace switches locator strategies and keeps the filter and index steps; update keeps the strategy", async ({
	page,
	testFilters,
}) => {
	const path = "body.section" as const;
	const schema = testFilters.getLocatorSchema(path);

	const initialLocator = schema.getNestedLocator();
	expect(`${initialLocator.describe("")}`).toEqual("locator('body').locator('section')");

	const manualLocator = page.locator("body").locator("newSelector").filter({ hasText: "Text" }).first();
	const locator = schema
		.replace(path)
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
	const role = schema.replace(path).getByRole("region", { name: "Now a region" }).getNestedLocator();
	expect(`${role.describe("")}`).toEqual(`${manualRole.describe("")}`);

	const manualText = page.locator("body").getByText("Text node").filter({ hasText: "Text" }).first();
	const text = schema.replace(path).getByText("Text node").getNestedLocator();
	expect(`${text.describe("")}`).toEqual(`${manualText.describe("")}`);

	const manualLabel = page.locator("body").getByLabel("Label").filter({ hasText: "Text" }).first();
	const label = schema.replace(path).getByLabel("Label").getNestedLocator();
	expect(`${label.describe("")}`).toEqual(`${manualLabel.describe("")}`);

	const manualPlaceholder = page.locator("body").getByPlaceholder("Placeholder").filter({ hasText: "Text" }).first();
	const placeholder = schema.replace(path).getByPlaceholder("Placeholder").getNestedLocator();
	expect(`${placeholder.describe("")}`).toEqual(`${manualPlaceholder.describe("")}`);

	const manualAltText = page.locator("body").getByAltText("Alt").filter({ hasText: "Text" }).first();
	const altText = schema.replace(path).getByAltText("Alt").getNestedLocator();
	expect(`${altText.describe("")}`).toEqual(`${manualAltText.describe("")}`);

	const manualTitle = page.locator("body").getByTitle("Title").filter({ hasText: "Text" }).first();
	const title = schema.replace(path).getByTitle("Title").getNestedLocator();
	expect(`${title.describe("")}`).toEqual(`${manualTitle.describe("")}`);

	// a terminal frame is the iframe element, and the steps apply to it
	const manualFrameLocator = page.locator("body").locator("iframe[name=child]").filter({ hasText: "Text" }).first();
	const frameLocator = schema.replace(path).frameLocator("iframe[name=child]").getNestedLocator();
	expect(`${frameLocator.describe("")}`).toEqual(`${manualFrameLocator.describe("")}`);

	const manualTestId = page.locator("body").getByTestId("new-test-id").filter({ hasText: "Text" }).first();
	const testId = schema.replace(path).getByTestId("new-test-id").getNestedLocator();
	expect(`${testId.describe("")}`).toEqual(`${manualTestId.describe("")}`);

	const manualId = page.locator("body").locator('[id="new-id"]').filter({ hasText: "Text" }).first();
	const id = schema.replace(path).getById("new-id").getNestedLocator();
	expect(`${id.describe("")}`).toEqual(`${manualId.describe("")}`);

	const manualDataCy = page.locator("body").locator('[data-cy="new-cy"]').filter({ hasText: "Text" }).first();
	const dataCy = schema.replace(path).locator('[data-cy="new-cy"]').getNestedLocator();
	expect(`${dataCy.describe("")}`).toEqual(`${manualDataCy.describe("")}`);

	// update patches the strategy now in place without restating the primary
	const manualPatched = page
		.locator("body")
		.locator('[data-cy="new-cy"]', { hasText: "more" })
		.filter({ hasText: "Text" })
		.first();
	const patched = schema.update(path).locator({ hasText: "more" }).getNestedLocator();
	expect(`${patched.describe("")}`).toEqual(`${manualPatched.describe("")}`);

	// update never changes the strategy; replace does, and nothing is remembered from earlier strategies
	expect(() => schema.update(path).getByRole("region")).toThrowError(
		'update("body.section") cannot change the strategy from "locator" to "role"; use replace("body.section").getByRole(…) instead.',
	);
	// replace takes page.getByRole's arguments: the role is required (a compile error; from JavaScript a throw)
	// @ts-expect-error an options-only call is update's form, not replace's
	expect(() => schema.replace(path).getByRole({ name: "Now a region" })).toThrowError(
		'getByRole requires a role value for "body.section".',
	);

	const lastRoleClearSteps = schema
		.replace(path)
		.getByRole("region", { name: "Now a region" })
		.clearSteps("body")
		.clearSteps("body.section")
		.getNestedLocator();
	expect(`${lastRoleClearSteps.describe("")}`).toEqual("locator('body').getByRole('region', { name: 'Now a region' })");

	const stillNoFiltersAndIndicesOnAdditionalSwitch = schema
		.replace(path)
		.locator('[data-cy="new-cy"]')
		.getNestedLocator();
	expect(`${stillNoFiltersAndIndicesOnAdditionalSwitch.describe("")}`).toEqual(
		"locator('body').locator('[data-cy=\"new-cy\"]')",
	);
});

test("update getByRole overloads preserve patch semantics without undefined placeholders", async ({ page }) => {
	type LocalPath = "overload" | "overload.target";
	const registry = createRegistryWithAccessors<LocalPath>(page).registry;

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
	const registry = createRegistryWithAccessors<LocalPath>(page).registry;

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

test("replace and update accept ids verbatim and RegExp ids as patterns", async ({ page, testFilters }) => {
	const path = "body.section" as const;
	const schema = testFilters.getLocatorSchema(path);

	// body.section is registered as locator, so the first id definition is a replace; update then patches it
	const manualTrickyId = page.locator("body").locator('[id="settings.panel"]');
	const trickyId = schema.replace(path).getById("settings.panel").getNestedLocator();
	expect(`${trickyId.describe("")}`).toEqual(`${manualTrickyId.describe("")}`);

	const manualRegExpId = page.locator("body").locator("internal:attr=[id=/^settings\\.panel$/i]");
	const regExpId = schema
		.update(path)
		.getById(/^settings\.panel$/i)
		.getNestedLocator();
	expect(`${regExpId.describe("")}`).toEqual(`${manualRegExpId.describe("")}`);

	expect(() => schema.update(path).getById("")).toThrowError(`getById requires a non-empty id for "${path}".`);
	expect(() => schema.replace(path).getById("")).toThrowError(`getById requires a non-empty id for "${path}".`);
	expect(() => schema.update(path).getById(/sticky/y)).not.toThrow();
});

test("update follows JSON Merge Patch for options", async ({ page }) => {
	type LocalPath = "root" | "root.btn" | "root.sel";
	const registry = createRegistryWithAccessors<LocalPath>(page).registry;
	registry.add("root").locator("body");
	registry.add("root.btn").getByRole("button", { name: "Login", exact: true });
	registry.add("root.sel").locator("section", { hasText: "x" });
	const render = (locator: { describe: (d: string) => unknown }) => `${locator.describe("")}`;
	const btn = () => registry.getLocatorSchema("root.btn").update();
	const unchanged = render(page.locator("body").getByRole("button", { name: "Login", exact: true }));

	// undefined and absent leave the options alone
	expect(render(btn().getByRole("button", undefined).getNestedLocator())).toEqual(unchanged);
	expect(render(btn().getByRole({ name: undefined }).getNestedLocator())).toEqual(unchanged);
	expect(render(btn().getByRole().getNestedLocator())).toEqual(unchanged);
	// a provided primary replaces it; a provided key replaces that key
	expect(render(btn().getByRole("link").getNestedLocator())).toEqual(
		render(page.locator("body").getByRole("link", { name: "Login", exact: true })),
	);
	expect(render(btn().getByRole({ name: "Save" }).getNestedLocator())).toEqual(
		render(page.locator("body").getByRole("button", { name: "Save", exact: true })),
	);
	// null deletes one key, or every option
	expect(render(btn().getByRole({ name: null }).getNestedLocator())).toEqual(
		render(page.locator("body").getByRole("button", { exact: true })),
	);
	expect(render(btn().getByRole("button", null).getNestedLocator())).toEqual("locator('body').getByRole('button')");
	expect(render(btn().getByRole(null).getNestedLocator())).toEqual("locator('body').getByRole('button')");
	expect(render(btn().getByRole({ name: null, exact: null }).getNestedLocator())).toEqual(
		"locator('body').getByRole('button')",
	);
	// the same for locator options
	const sel = () => registry.getLocatorSchema("root.sel").update();
	expect(render(sel().locator("section", undefined).getNestedLocator())).toEqual(
		"locator('body').locator('section').filter({ hasText: 'x' })",
	);
	expect(render(sel().locator({ hasText: null }).getNestedLocator())).toEqual("locator('body').locator('section')");
	expect(render(sel().locator("div").getNestedLocator())).toEqual(
		"locator('body').locator('div').filter({ hasText: 'x' })",
	);
	// the registry is untouched
	expect(render(registry.getNestedLocator("root.btn"))).toEqual(unchanged);
});

test("update keeps the registered strategy and names replace() for another", async ({ page }) => {
	type LocalPath = "root" | "root.btn" | "root.item";
	const registry = createRegistryWithAccessors<LocalPath>(page).registry;
	registry.add("root").locator("body");
	registry.add("root.btn").getByRole("button");
	registry.add("root.item").locator("li").filter({ hasText: "x" }).nth(0);

	expect(() => registry.getLocatorSchema("root.btn").update().locator("div")).toThrowError(
		'update("root.btn") cannot change the strategy from "role" to "locator"; use replace("root.btn").locator(…) instead.',
	);
	expect(() => registry.getLocatorSchema("root.btn").update().getByTestId("x")).toThrowError(
		'update("root.btn") cannot change the strategy from "role" to "testId"; use replace("root.btn").getByTestId(…) instead.',
	);
	expect(() => registry.getLocatorSchema("root.btn").update().frameLocator()).toThrowError(
		'update("root.btn") cannot change the strategy from "role" to "frameLocator"; use replace("root.btn").frameLocator(…) instead.',
	);

	// replace switches and keeps the steps
	const switched = registry.getLocatorSchema("root.item").replace().getByRole("listitem").getNestedLocator();
	expect(`${switched.describe("")}`).toEqual("locator('body').getByRole('listitem').filter({ hasText: 'x' }).first()");
});

test("update and replace reject an empty primary only where Playwright cannot use it", async ({ page }) => {
	type LocalPath = "root" | "root.sel" | "root.btn" | "root.frame" | "root.tid" | "root.txt";
	const registry = createRegistryWithAccessors<LocalPath>(page).registry;
	registry.add("root").locator("body");
	registry.add("root.sel").locator("section");
	registry.add("root.btn").getByRole("button");
	registry.add("root.frame").frameLocator("iframe");
	registry.add("root.tid").getByTestId("tid");
	registry.add("root.txt").getByText("t");

	expect(() => registry.getLocatorSchema("root.sel").update().locator("")).toThrowError(
		'locator requires a non-empty selector for "root.sel".',
	);
	expect(() => registry.getLocatorSchema("root.sel").replace().locator("")).toThrowError(
		'locator requires a non-empty selector for "root.sel".',
	);
	expect(() => registry.getLocatorSchema("root.frame").update().frameLocator("")).toThrowError(
		'frameLocator requires a non-empty selector for "root.frame".',
	);
	expect(() =>
		registry
			.getLocatorSchema("root.btn")
			.update()
			.getByRole("" as never),
	).toThrowError('getByRole requires a non-empty role for "root.btn".');
	expect(`${registry.getLocatorSchema("root.tid").update().getByTestId("").getNestedLocator().describe("")}`).toEqual(
		"locator('body').getByTestId('')",
	);
	expect(`${registry.getLocatorSchema("root.txt").replace().getByText("").getNestedLocator().describe("")}`).toEqual(
		"locator('body').getByText('')",
	);
});
