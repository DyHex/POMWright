import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

const createRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page);

test("remove deletes definition and causes resolution to fail", async ({ page }) => {
	type Paths = "root" | "root.target";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.target").locator(".child");

	const builder = getLocatorSchema("root.target");
	builder.remove("root.target");

	expect(() => builder.getNestedLocator()).toThrowError('No locator schema registered for path "root.target".');
});

test("remove on non-terminal skips the segment while allowing resolution", async ({ page }) => {
	type Paths = "root" | "root.child";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.child").getByRole("button", { name: "Submit" });

	const locator = getLocatorSchema("root.child").remove("root").getNestedLocator();

	expect(`${await locator}`).toEqual("getByRole('button', { name: 'Submit' })");
});
