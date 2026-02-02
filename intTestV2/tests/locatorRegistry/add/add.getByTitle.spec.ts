import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByTitle to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByTitle";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByTitle")).toThrowError(`${errMsg} "elementByTitle".`);

	registry.add("elementByTitle").getByTitle("Home Page");

	expect(registry.get("elementByTitle")).toEqual({
		definition: { text: "Home Page", type: "title" },
		locatorSchemaPath: "elementByTitle",
		steps: [],
	});
});
