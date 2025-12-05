import { expect, test } from "@fixtures-v2/withOptions";
import { bindLocatorAccessors, createRegistry } from "pomwright";

test("bindLocatorAccessors creates isolated bound wrappers per registry", async ({ page }) => {
	type LocatorSchemaPaths = "main";

	const registryA = createRegistry<LocatorSchemaPaths>(page, "A");
	registryA.add("main").locator("div.a");
	const { getNestedLocator: getNestedLocatorA } = bindLocatorAccessors(registryA);

	const registryB = createRegistry<LocatorSchemaPaths>(page, "B");
	registryB.add("main").locator("div.b");
	const { getNestedLocator: getNestedLocatorB } = bindLocatorAccessors(registryB);

	const locatorA = await getNestedLocatorA("main");
	const locatorB = await getNestedLocatorB("main");

	expect(`${locatorA}`).toEqual("locator('div.a')");
	expect(`${locatorB}`).toEqual("locator('div.b')");
});

test("factory-based wrappers preserve fluent helpers without BasePage", async ({ page }) => {
	type LocatorSchemaPaths = "chain" | "chain.child";

	const registry = createRegistry<LocatorSchemaPaths>(page, "fluent");
	registry.add("chain").locator("div.root");
	registry.add("chain.child").locator("div.child").filter({ hasText: "x" }).nth(1).filter({ hasText: "y" });

	const { getNestedLocator } = bindLocatorAccessors(registry);

	const locator = await getNestedLocator("chain.child").filter("chain.child", { hasText: "z" }).nth("chain", 0);

	expect(`${locator}`).toEqual(
		"locator('div.root').first().locator('div.child').filter({ hasText: 'x' }).nth(1).filter({ hasText: 'y' }).filter({ hasText: 'z' })",
	);
});

test("bindLocatorAccessors exposes getLocatorSchema builder", async ({ page }) => {
	type LocatorSchemaPaths = "tree" | "tree.leaf";

	const registry = createRegistry<LocatorSchemaPaths>(page, "schema");
	registry.add("tree").locator("div.tree");
	registry.add("tree.leaf").locator("div.leaf");

	const { getLocatorSchema } = bindLocatorAccessors(registry);

	const schemaBuilder = getLocatorSchema("tree.leaf");
	schemaBuilder.nth("tree", 1).filter("tree.leaf", { hasText: "leaf" });

	const locator = await schemaBuilder.getNestedLocator();

	expect(`${locator}`).toEqual("locator('div.tree').nth(1).locator('div.leaf').filter({ hasText: 'leaf' })");
});
