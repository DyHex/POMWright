import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getByRole to registry", async ({ page }) => {
	type LocatorSchemaPaths = "buttonByRole";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("buttonByRole")).toThrowError(`${errMsg} "buttonByRole".`);

	registry.add("buttonByRole").getByRole("button", { name: "Submit" });

	expect(registry.get("buttonByRole")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "buttonByRole",
		steps: [],
	});
});
