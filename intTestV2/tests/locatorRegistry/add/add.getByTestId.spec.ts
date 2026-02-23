import { expect, test } from "@fixtures-v2/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByTestId to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByTestId";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByTestId")).toThrowError(`${errMsg} "elementByTestId".`);

	registry.add("elementByTestId").getByTestId("login-button");

	expect(registry.get("elementByTestId")).toEqual({
		definition: { testId: "login-button", type: "testId" },
		locatorSchemaPath: "elementByTestId",
		steps: [],
	});
});
