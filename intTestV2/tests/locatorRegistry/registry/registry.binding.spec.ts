import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

const createRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page);

test("createRegistryWithAccessors creates isolated bound wrappers per registry", async ({ page }) => {
	type LocatorSchemaPaths = "main";

	const registryA = createRegistry<LocatorSchemaPaths>(page);
	registryA.registry.add("main").locator("div.a");

	const registryB = createRegistry<LocatorSchemaPaths>(page);
	registryB.registry.add("main").locator("div.b");

	const locatorA = registryA.getNestedLocator("main");
	const locatorB = registryB.getNestedLocator("main");

	expect(`${locatorA}`).toEqual("locator('div.a')");
	expect(`${locatorB}`).toEqual("locator('div.b')");
});

test("factory-based wrappers preserve fluent helpers without BasePage", async ({ page }) => {
	type LocatorSchemaPaths = "chain" | "chain.child";

	const { registry, getNestedLocator } = createRegistry<LocatorSchemaPaths>(page);
	registry.add("chain").locator("div.root");
	registry.add("chain.child").locator("div.child").filter({ hasText: "x" }).nth(1).filter({ hasText: "y" });

	const locator = getNestedLocator("chain.child");

	expect(`${locator}`).toEqual(
		"locator('div.root').locator('div.child').filter({ hasText: 'x' }).nth(1).filter({ hasText: 'y' })",
	);
});

test("createRegistryWithAccessors exposes getLocatorSchema builder", async ({ page }) => {
	type LocatorSchemaPaths = "tree" | "tree.leaf";

	const { registry, getLocatorSchema } = createRegistry<LocatorSchemaPaths>(page);
	registry.add("tree").locator("div.tree");
	registry.add("tree.leaf").locator("div.leaf");

	const schemaBuilder = getLocatorSchema("tree.leaf");
	schemaBuilder.nth("tree", 1).filter("tree.leaf", { hasText: "leaf" });

	const locator = schemaBuilder.getNestedLocator();

	expect(`${locator}`).toEqual("locator('div.tree').nth(1).locator('div.leaf').filter({ hasText: 'leaf' })");
});
