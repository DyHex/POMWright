import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("describe applies only to terminal locator paths", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("list").locator("ul.list").describe("List container");
	registry.add("list.item").getByRole("listitem").describe("List item");

	const listLocator = registry.getNestedLocator("list");
	const itemLocator = registry.getNestedLocator("list.item");

	expect(listLocator.description()).toEqual("List container");
	expect(itemLocator.description()).toEqual("List item");

	const listLocator2 = registry.getLocator("list");
	const itemLocator2 = registry.getLocator("list.item");

	expect(listLocator2.description()).toEqual("List container");
	expect(itemLocator2.description()).toEqual("List item");
});

test("describe overrides previous descriptions when chained", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button").describe("Primary").describe("Final");

	expect(registry.get("button")).toEqual({
		description: "Final",
		definition: { role: "button", type: "role" },
		locatorSchemaPath: "button",
		steps: [],
	});
});

test("describe on locator schema builder overrides the resolved description only", async ({ page }) => {
	type LocatorSchemaPaths = "panel";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("panel").locator("section.panel").describe("Original panel");

	const locator = registry.getLocatorSchema("panel").describe("Override panel").getLocator();

	expect(locator.description()).toEqual("Override panel");
	expect(registry.get("panel")).toEqual({
		description: "Original panel",
		definition: { selector: "section.panel", type: "locator" },
		locatorSchemaPath: "panel",
		steps: [],
	});
});

test("describe on reusable locators is carried into registrations", async ({ page }) => {
	type LocatorSchemaPaths = "seeded";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const seed = registry.createReusable.locator("div.seeded").describe("Seeded description");
	registry.add("seeded", { reuse: seed });

	const locator = registry.getLocator("seeded");

	expect(locator.description()).toEqual("Seeded description");
});
