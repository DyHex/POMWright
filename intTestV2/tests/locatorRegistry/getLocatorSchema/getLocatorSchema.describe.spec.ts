import { expect, test } from "@fixtures-v2/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

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
