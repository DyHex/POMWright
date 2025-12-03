import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { bindLocatorAccessors, LocatorRegistry, PlaywrightReportLogger } from "pomwright";

const createRegistry = (page: Page, name: string) => {
	const logger = new PlaywrightReportLogger({ current: "debug", initial: "debug" }, [], "root");
	return new LocatorRegistry<string>(page, logger.getNewChildLogger(name));
};

test("bindLocatorAccessors creates isolated bound wrappers per registry", async ({ page }) => {
	const registryA = createRegistry(page, "A");
	registryA.add("root").locator("div.a");
	const { getNestedLocator: getNestedLocatorA } = bindLocatorAccessors(registryA);

	const registryB = createRegistry(page, "B");
	registryB.add("root").locator("div.b");
	const { getNestedLocator: getNestedLocatorB } = bindLocatorAccessors(registryB);

	const locatorA = await getNestedLocatorA("root");
	const locatorB = await getNestedLocatorB("root");

	expect(`${locatorA}`).toEqual("locator('div.a')");
	expect(`${locatorB}`).toEqual("locator('div.b')");
});

test("factory-based wrappers preserve fluent helpers without BasePage", async ({ page }) => {
	const registry = createRegistry(page, "fluent");
	registry.add("chain").locator("div.root");
	registry.add("chain.child").locator("div.child").filter({ hasText: "x" }).nth(1).filter({ hasText: "y" });

	const { getNestedLocator } = bindLocatorAccessors(registry);

	const locator = await getNestedLocator("chain.child").filter("chain.child", { hasText: "z" }).nth("chain", 0);

	expect(`${locator}`).toEqual(
		"locator('div.root').first().locator('div.child').filter({ hasText: 'x' }).nth(1).filter({ hasText: 'y' }).filter({ hasText: 'z' })",
	);
});

test("bindLocatorAccessors exposes getLocatorSchema builder", async ({ page }) => {
	const registry = createRegistry(page, "schema");
	registry.add("tree").locator("div.tree");
	registry.add("tree.leaf").locator("div.leaf");

	const { getLocatorSchema } = bindLocatorAccessors(registry);

	const schemaBuilder = getLocatorSchema("tree.leaf");
	schemaBuilder.nth("tree", 1).filter("tree.leaf", { hasText: "leaf" });

	const locator = await schemaBuilder.getNestedLocator();

	expect(`${locator}`).toEqual("locator('div.tree').nth(1).locator('div.leaf').filter({ hasText: 'leaf' })");
});
