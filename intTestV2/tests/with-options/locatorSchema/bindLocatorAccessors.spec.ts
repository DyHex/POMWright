import type { Page } from "@playwright/test";
import { expect, test } from "@fixtures-v2/withOptions";
import { PlaywrightReportLogger, createRegistryWithAccessors } from "pomwright";

const createRegistry = <Paths extends string>(page: Page, name: string) => {
        const logger = new PlaywrightReportLogger({ current: "debug", initial: "debug" }, [], name);
        return createRegistryWithAccessors<Paths>(page, logger);
};

test("createRegistryWithAccessors creates isolated bound wrappers per registry", async ({ page }) => {
        type LocatorSchemaPaths = "main";

        const registryA = createRegistry<LocatorSchemaPaths>(page, "A");
        registryA.registry.add("main").locator("div.a");

        const registryB = createRegistry<LocatorSchemaPaths>(page, "B");
        registryB.registry.add("main").locator("div.b");

        const locatorA = await registryA.getNestedLocator("main");
        const locatorB = await registryB.getNestedLocator("main");

        expect(`${locatorA}`).toEqual("locator('div.a')");
        expect(`${locatorB}`).toEqual("locator('div.b')");
});

test("factory-based wrappers preserve fluent helpers without BasePage", async ({ page }) => {
        type LocatorSchemaPaths = "chain" | "chain.child";

        const { registry, getNestedLocator } = createRegistry<LocatorSchemaPaths>(page, "fluent");
        registry.add("chain").locator("div.root");
        registry
                .add("chain.child")
                .locator("div.child")
                .filter({ hasText: "x" })
                .nth(1)
                .filter({ hasText: "y" });

        const locator = await getNestedLocator("chain.child")
                .filter("chain.child", { hasText: "z" })
                .nth("chain", 0);

        expect(`${locator}`).toEqual(
                "locator('div.root').first().locator('div.child').filter({ hasText: 'x' }).nth(1).filter({ hasText: 'y' }).filter({ hasText: 'z' })",
        );
});

test("createRegistryWithAccessors exposes getLocatorSchema builder", async ({ page }) => {
        type LocatorSchemaPaths = "tree" | "tree.leaf";

        const { registry, getLocatorSchema } = createRegistry<LocatorSchemaPaths>(page, "schema");
        registry.add("tree").locator("div.tree");
        registry.add("tree.leaf").locator("div.leaf");

        const schemaBuilder = getLocatorSchema("tree.leaf");
        schemaBuilder.nth("tree", 1).filter("tree.leaf", { hasText: "leaf" });

        const locator = await schemaBuilder.getNestedLocator();

        expect(`${locator}`).toEqual("locator('div.tree').nth(1).locator('div.leaf').filter({ hasText: 'leaf' })");
});

test("createRegistryWithAccessors accepts an existing logger", async ({ page }) => {
        type LocatorSchemaPaths = "heading";

        const testLogger = new PlaywrightReportLogger({ current: "info", initial: "info" }, [], "test");
        const registryLogger = testLogger.getNewChildLogger("registry-child");

        const { registry, getLocator } = createRegistryWithAccessors<LocatorSchemaPaths>(page, registryLogger);

        registry.add("heading").locator("h1");

        testLogger.setLogLevel("warn");

        expect(registryLogger.isCurrentLogLevel("warn")).toBe(true);

        const locator = await getLocator("heading");
        const registryLocator = await registry.getLocator("heading");

        expect(`${locator}`).toEqual(`${registryLocator}`);
});
