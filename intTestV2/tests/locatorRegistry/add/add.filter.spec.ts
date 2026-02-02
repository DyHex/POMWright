import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../srcV2/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("add records chained filters and indices in order for nested paths", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("list").locator("ul.list").filter({ hasText: "List" }).nth(1).filter({ hasText: "Hello" });
	registry
		.add("list.item")
		.getByRole("listitem", { name: /Row/ })
		.filter({ hasText: "Row" })
		.nth("last")
		.filter({ hasText: "Goodbye" });

	const nested = registry.getNestedLocator("list.item");

	expect(`${nested}`).toEqual(
		"locator('ul.list').filter({ hasText: 'List' }).nth(1).filter({ hasText: 'Hello' }).getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last().filter({ hasText: 'Goodbye' })",
	);
});
