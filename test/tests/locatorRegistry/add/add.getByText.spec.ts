import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByText to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByText")).toThrowError(`${errMsg} "elementByText".`);

	registry.add("elementByText").getByText("Welcome");

	expect(registry.get("elementByText")).toEqual({
		definition: { text: "Welcome", type: "text" },
		locatorSchemaPath: "elementByText",
		steps: [],
	});
});
