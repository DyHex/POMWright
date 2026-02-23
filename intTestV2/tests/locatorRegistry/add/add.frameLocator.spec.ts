import { expect, test } from "@fixtures-v2/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add frameLocator to registry", async ({ page }) => {
	type LocatorSchemaPaths = "iframe";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("iframe")).toThrowError(`${errMsg} "iframe".`);

	registry.add("iframe").frameLocator("iframe#my-frame");

	expect(registry.get("iframe")).toEqual({
		definition: { selector: "iframe#my-frame", type: "frameLocator" },
		locatorSchemaPath: "iframe",
		steps: [],
	});
});
