import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByAltText to registry", async ({ page }) => {
	type LocatorSchemaPaths = "image";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("image")).toThrowError(`${errMsg} "image".`);

	registry.add("image").getByAltText("Sample Image");

	expect(registry.get("image")).toEqual({
		definition: { text: "Sample Image", type: "altText" },
		locatorSchemaPath: "image",
		steps: [],
	});
});
