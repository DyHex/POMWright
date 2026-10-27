import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("registry.get returns a cloned definition copy", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit", exact: true });

	const firstRecord = registry.get("button");

	expect(firstRecord).toEqual({
		locatorSchemaPath: "button",
		definition: {
			type: "role",
			role: "button",
			options: { name: "Submit", exact: true },
		},
		steps: [],
	});

	if (firstRecord.definition.type !== "role") {
		throw new Error("Expected role definition for mutation test");
	}

	firstRecord.definition.options = { name: "Mutated" };

	const secondRecord = registry.get("button");

	expect(secondRecord).toEqual({
		locatorSchemaPath: "button",
		definition: {
			type: "role",
			role: "button",
			options: { name: "Submit", exact: true },
		},
		steps: [],
	});
});

test("registry.getIfExists returns a cloned definition copy", async ({ page }) => {
	type LocatorSchemaPaths = "banner";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("banner").locator("section.banner", { hasText: "Welcome" });

	const firstRecord = registry.getIfExists("banner");
	expect(firstRecord).toBeDefined();

	if (firstRecord?.definition.type !== "locator") {
		throw new Error("Expected locator definition for mutation test");
	}

	firstRecord.definition.options = { hasText: "Mutated" };
	if (!firstRecord.steps) {
		throw new Error("Expected steps array on cloned record");
	}
	firstRecord.steps.push({ kind: "index", index: 0 });

	const secondRecord = registry.getIfExists("banner");

	expect(secondRecord).toEqual({
		locatorSchemaPath: "banner",
		definition: {
			type: "locator",
			selector: "section.banner",
			options: { hasText: "Welcome" },
		},
		steps: [],
	});
});

test("a registered locator stays as registered when the caller changes what it passed", async ({
	page,
	testFilters,
}) => {
	type Paths = "button@first" | "button@second" | "button@seeded" | "button@queried";
	const { registry, add, getNestedLocator, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);
	await page.goto(testFilters.fullUrl);
	const sectionOf = (path: Paths) => getNestedLocator(path).evaluate((element) => element.closest("section")?.id);

	// a RegExp rewritten in place with compile() after add
	const red = /^Red$/;
	add("button@first").getByRole("button", { name: red }).nth(0);
	red.compile("^Blue$");

	// an options object changed before a later step on the same registration
	const options = { name: "Red", exact: true };
	const view = add("button@second").getByRole("button", options);
	options.name = "Blue";
	view.nth(1);

	// a seed's RegExp, and the RegExp in the copy its definition returns
	const green = /^Green$/;
	const seed = registry.createReusable.getByText(green);
	green.compile("^Red$");
	(seed.definition as { text: RegExp }).text.compile("^Red$");
	add("button@seeded", { reuse: seed.nth("last") });

	// a RegExp given to a query, before the query resolves
	add("button@queried").getByRole("button", { name: "Reset Color" }).nth(2);
	const blue = /^Blue$/;
	const query = getLocatorSchema("button@queried").update().getByRole({ name: blue });
	blue.compile("^Red$");

	registry.verify();
	await expect(getNestedLocator("button@first")).toHaveText("Red");
	await expect(getNestedLocator("button@second")).toHaveText("Red");
	expect(await sectionOf("button@second")).toBe("section2");
	await expect(getNestedLocator("button@seeded")).toHaveText("Green");
	expect(await sectionOf("button@seeded")).toBe("section4");
	await expect(query.getNestedLocator()).toHaveText("Blue");
	expect(await query.getNestedLocator().evaluate((element) => element.closest("section")?.id)).toBe("section3");

	await getNestedLocator("button@first").click();
	await expect(page.locator("#section1")).toHaveCSS("background-color", "rgb(255, 0, 0)");
});

test("options read through a prototype, a class's getter or an inherited default, match what Playwright matches", async ({
	page,
}) => {
	await page.setContent("<button>Save</button><button>Save draft</button><button>Cancel</button>");
	type Paths = "button@byGetter" | "button@byDefault" | "button@byPatch";
	const { add, getLocator, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);

	class SaveButton {
		get name() {
			return "Save";
		}
	}
	add("button@byGetter").getByRole("button", new SaveButton());
	await expect(page.getByRole("button", new SaveButton())).toHaveCount(2);
	await expect(getLocator("button@byGetter")).toHaveCount(2);

	const exactSave = Object.assign(Object.create({ exact: true }), { name: "Save" });
	add("button@byDefault").getByRole("button", exactSave);
	await expect(page.getByRole("button", exactSave)).toHaveCount(1);
	await expect(getLocator("button@byDefault")).toHaveCount(1);

	class ExactPatch {
		get exact() {
			return true;
		}
	}
	add("button@byPatch").getByRole("button", { name: "Save" });
	await expect(getLocatorSchema("button@byPatch").update().getByRole(new ExactPatch()).getLocator()).toHaveCount(1);
});

test("own options that are not enumerable match what Playwright matches, through add and a query's update", async ({
	page,
}) => {
	await page.setContent("<button>Save</button><button>Save draft</button><button>Cancel</button>");
	type Paths = "button@byHiddenName" | "button@byHiddenPatch";
	const { add, getLocator, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);

	const hiddenName = {};
	Object.defineProperty(hiddenName, "name", { value: "Save", enumerable: false });
	add("button@byHiddenName").getByRole("button", hiddenName);
	await expect(page.getByRole("button", hiddenName)).toHaveCount(2);
	await expect(getLocator("button@byHiddenName")).toHaveCount(2);

	const hiddenExact = {};
	Object.defineProperty(hiddenExact, "exact", { value: true, enumerable: false });
	add("button@byHiddenPatch").getByRole("button", { name: "Save" });
	await expect(getLocatorSchema("button@byHiddenPatch").update().getByRole(hiddenExact).getLocator()).toHaveCount(1);
});
