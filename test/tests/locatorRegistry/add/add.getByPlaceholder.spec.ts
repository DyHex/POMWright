import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByPlaceholder to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByPlaceholder";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByPlaceholder")).toThrowError(`${errMsg} "elementByPlaceholder".`);

	registry.add("elementByPlaceholder").getByPlaceholder("Enter your name");

	expect(registry.get("elementByPlaceholder")).toEqual({
		definition: { text: "Enter your name", type: "placeholder" },
		locatorSchemaPath: "elementByPlaceholder",
		steps: [],
	});
});
