import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of getLocatorSchema.describe.spec.ts: its scenarios through pomwright's public API against the packed package.

const createTestRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page).registry;

test("locator schema builders resolve the terminal path as the default description", async ({ page }) => {
	type LocatorSchemaPaths = "panel" | "panel.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("panel").locator("section.panel").describe("Panel container");
	registry.add("panel.button").getByRole("button");

	const direct = registry.getLocatorSchema("panel.button").getLocator();
	const nested = registry.getLocatorSchema("panel.button").getNestedLocator();

	expect(direct.description()).toEqual("panel.button");
	expect(nested.description()).toEqual("panel.button");
});

test("describe on locator schema builder overrides the resolved description only", async ({ page }) => {
	type LocatorSchemaPaths = "panel";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("panel").locator("section.panel").describe("Original panel");

	const locator = registry.getLocatorSchema("panel").describe("Override panel").getLocator();

	expect(locator.description()).toEqual("Override panel");
	// the query changed only itself: the registry keeps its description and definition
	expect(registry.getLocator("panel").description()).toEqual("Original panel");
	expect(`${registry.getLocator("panel").describe("")}`).toEqual(`${page.locator("section.panel")}`);
});

test("describe on locator schema builder overrides the path default without mutating it", async ({ page }) => {
	type LocatorSchemaPaths = "panel";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("panel").locator("section.panel");

	const locator = registry.getLocatorSchema("panel").describe("Temporary panel").getLocator();

	expect(locator.description()).toEqual("Temporary panel");
	expect(registry.getLocator("panel").description()).toEqual("panel");
});

test("describe defaults terminal frame locators to their path and supports query overrides", async ({ page }) => {
	type LocatorSchemaPaths = "frame";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("frame").frameLocator("iframe");

	expect(registry.getLocator("frame").description()).toEqual("frame");
	expect(registry.getNestedLocator("frame").description()).toEqual("frame");
	expect(registry.getLocatorSchema("frame").describe("Login frame").getLocator().description()).toEqual("Login frame");
});

test("describe uses the terminal child path inside frames and supports nested query overrides", async ({ page }) => {
	type LocatorSchemaPaths = "frame" | "frame.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("frame").frameLocator("iframe").describe("Outer frame");
	registry.add("frame.button").getByRole("button", { name: "Submit" });

	const nested = registry.getNestedLocator("frame.button");
	const manualNested = page.frameLocator("iframe").getByRole("button", { name: "Submit" });
	const overridden = registry
		.getLocatorSchema("frame.button")
		.describe("Submit button inside frame")
		.getNestedLocator();

	expect(nested.description()).toEqual("frame.button");
	expect(`${nested.describe("")}`).toEqual(`${manualNested.describe("")}`);
	expect(overridden.description()).toEqual("Submit button inside frame");
	expect(registry.getNestedLocator("frame.button").description()).toEqual("frame.button");
});

test('a query\'s describe("") removes the description; anything but a string throws', async ({ page }) => {
	type LocatorSchemaPaths = "panel" | "panel.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("panel").locator("section.panel");
	registry.add("panel.button").getByRole("button").describe("Panel button");

	const plain = registry.getLocatorSchema("panel.button").describe("").getNestedLocator();
	expect(plain.description()).toBeNull();
	expect(`${plain}`).toEqual("locator('section.panel').getByRole('button')");
	// @ts-expect-error describe takes a string
	expect(() => registry.getLocatorSchema("panel.button").describe(null)).toThrowError(
		'describe requires a string for "panel.button"; pass "" to remove the description.',
	);
	expect(registry.getNestedLocator("panel.button").description()).toEqual("Panel button");
});
