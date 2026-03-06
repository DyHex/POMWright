import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

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

test("describe on reusable locators is carried into registrations", async ({ page }) => {
	type LocatorSchemaPaths = "seeded";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const seed = registry.createReusable.locator("div.seeded").describe("Seeded description");
	registry.add("seeded", { reuse: seed });

	const locator = registry.getLocator("seeded");

	expect(locator.description()).toEqual("Seeded description");
});
