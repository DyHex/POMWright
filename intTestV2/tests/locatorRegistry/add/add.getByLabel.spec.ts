import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByLabel to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByLabel";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByLabel")).toThrowError(`${errMsg} "elementByLabel".`);

	registry.add("elementByLabel").getByLabel("Username");

	expect(registry.get("elementByLabel")).toEqual({
		definition: { text: "Username", type: "label" },
		locatorSchemaPath: "elementByLabel",
		steps: [],
	});
});
