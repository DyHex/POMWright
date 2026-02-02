import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add locator to registry", async ({ page }) => {
	type LocatorSchemaPaths = "body";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("body")).toThrowError(`${errMsg} "body".`);

	registry.add("body").locator("body");

	expect(registry.get("body")).toEqual({
		definition: { selector: "body", type: "locator" },
		locatorSchemaPath: "body",
		steps: [],
	});
});
