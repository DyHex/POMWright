import { expect, test } from "@fixtures/testApp.fixtures";
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

	expect(`${locatorA.describe("")}`).toEqual("locator('div.a')");
	expect(`${locatorB.describe("")}`).toEqual("locator('div.b')");
});

test("factory-based wrappers preserve fluent helpers without BasePage", async ({ page }) => {
	type LocatorSchemaPaths = "chain" | "chain.child";

	const { registry, getNestedLocator } = createRegistry<LocatorSchemaPaths>(page);
	registry.add("chain").locator("div.root");
	registry.add("chain.child").locator("div.child").filter({ hasText: "x" }).nth(1).filter({ hasText: "y" });

	const locator = getNestedLocator("chain.child");

	expect(`${locator.describe("")}`).toEqual(
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

	expect(`${locator.describe("")}`).toEqual(
		"locator('div.tree').nth(1).locator('div.leaf').filter({ hasText: 'leaf' })",
	);
});

test("createRegistryWithAccessors exposes verify() on the registry", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item" | "list.badge";

	const { registry } = createRegistry<LocatorSchemaPaths>(page);
	registry.add("list").locator("ul");
	registry.add("list.item").getByRole("listitem").filter({ has: "list.badge" });

	expect(() => registry.verify()).toThrowError(
		'Locator registry verification failed for 1 of 2 paths:\n  "list.item": No locator schema registered for path "list.badge".',
	);
	registry.add("list.badge").locator(".badge");
	expect(() => registry.verify()).not.toThrow();
});
