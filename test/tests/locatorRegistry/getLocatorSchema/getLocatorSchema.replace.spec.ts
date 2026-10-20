import { expect, test } from "@fixtures/testApp.fixtures";
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

	expect(`${locator.describe("")}`).toEqual(
		"locator('div.root').getByRole('button', { name: 'New' }).filter({ hasText: 'old' }).filter({ hasText: 'patched' })",
	);
});

test("replace accepts ids verbatim and RegExp ids as patterns", async ({ page }) => {
	type Paths = "root" | "root.target";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.target").locator(".old").filter({ hasText: "old" });

	const byId = getLocatorSchema("root.target").replace("root.target").getById("settings.panel").getNestedLocator();
	expect(`${byId.describe("")}`).toEqual(
		`locator('div.root').locator('[id="settings.panel"]').filter({ hasText: 'old' })`,
	);

	const byPattern = getLocatorSchema("root.target")
		.replace("root.target")
		.getById(/^items\[\d\]$/)
		.getNestedLocator();
	expect(`${byPattern.describe("")}`).toEqual(
		`locator('div.root').locator('internal:attr=[id=/^items\\\\[\\\\d\\\\]$/]').filter({ hasText: 'old' })`,
	);

	expect(() => getLocatorSchema("root.target").replace("root.target").getById("")).toThrowError(
		'getById requires a non-empty id for "root.target".',
	);
	expect(() => getLocatorSchema("root.target").replace("root.target").getById(/x/y)).not.toThrow();
});
