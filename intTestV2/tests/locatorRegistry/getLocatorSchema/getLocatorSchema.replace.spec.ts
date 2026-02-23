import { expect, test } from "@fixtures-v2/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

const createRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page);

test("replace updates definition while retaining recorded steps", async ({ page }) => {
	type Paths = "root" | "root.target";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.target").locator(".old").filter({ hasText: "old" });

	const locator = getLocatorSchema("root.target")
		.replace("root.target")
		.getByRole("button", { name: "New" })
		.filter("root.target", { hasText: "patched" })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('div.root').getByRole('button', { name: 'New' }).filter({ hasText: 'old' }).filter({ hasText: 'patched' })",
	);
});
