import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

const createTestRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page).registry;

const errMsg = "No locator schema registered for path";

test("add frameLocator to registry", async ({ page }) => {
	type LocatorSchemaPaths = "iframe";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("iframe")).toThrowError(`${errMsg} "iframe".`);

	registry.add("iframe").frameLocator("iframe#my-frame");

	expect(registry.get("iframe")).toEqual({
		definition: { selector: "iframe#my-frame", type: "frameLocator" },
		locatorSchemaPath: "iframe",
		steps: [],
	});
});

test("add getByAltText to registry", async ({ page }) => {
	type LocatorSchemaPaths = "image";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("image")).toThrowError(`${errMsg} "image".`);

	registry.add("image").getByAltText("Sample Image");

	expect(registry.get("image")).toEqual({
		definition: { text: "Sample Image", type: "altText" },
		locatorSchemaPath: "image",
		steps: [],
	});
});

test("add getByDataCy to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByDataCy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByDataCy")).toThrowError(`${errMsg} "elementByDataCy".`);

	registry.add("elementByDataCy").getByDataCy("data-cy-value");
	expect(registry.get("elementByDataCy")).toEqual({
		definition: { value: "data-cy-value", type: "dataCy" },
		locatorSchemaPath: "elementByDataCy",
		steps: [],
	});
});

test("add getById to registry", async ({ page }) => {
	type LocatorSchemaPaths = "stringId" | "stringId.#stringId" | "regExpId";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const errMsg = "No locator schema registered for path";

	expect(() => registry.get("stringId")).toThrowError(`${errMsg} "stringId".`);
	expect(() => registry.get("stringId.#stringId")).toThrowError(`${errMsg} "stringId.#stringId".`);
	expect(() => registry.get("regExpId")).toThrowError(`${errMsg} "regExpId".`);

	registry.add("stringId").getById("unique-element");
	registry.add("stringId.#stringId").getById("#unique-element");

	const expectedStringIdDefinition = {
		definition: { id: "unique-element", type: "id" },
		locatorSchemaPath: "stringId",
		steps: [],
	};

	const expectedHashIdDefinition = {
		...expectedStringIdDefinition,
		locatorSchemaPath: "stringId.#stringId",
	};

	expect(registry.get("stringId")).toEqual(expectedStringIdDefinition);
	expect(registry.get("stringId.#stringId")).toEqual(expectedHashIdDefinition);

	const locator = registry.getLocator("stringId.#stringId");
	expect(`${await locator}`).toEqual("locator('#unique-element')");

	registry.add("regExpId").getById(/unique-\w+/);
	const regExpDefinition = {
		definition: { id: /unique-\w+/, type: "id" },
		locatorSchemaPath: "regExpId",
		steps: [],
	};
	expect(registry.get("regExpId")).toEqual(regExpDefinition);
});

test("add getByLabel to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByLabel";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByLabel")).toThrowError(`${errMsg} "elementByLabel".`);

	registry.add("elementByLabel").getByLabel("Username");

	expect(registry.get("elementByLabel")).toEqual({
		definition: { text: "Username", type: "label" },
		locatorSchemaPath: "elementByLabel",
		steps: [],
	});
});

test("add getByPlaceholder to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByPlaceholder";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByPlaceholder")).toThrowError(`${errMsg} "elementByPlaceholder".`);

	registry.add("elementByPlaceholder").getByPlaceholder("Enter your name");

	expect(registry.get("elementByPlaceholder")).toEqual({
		definition: { text: "Enter your name", type: "placeholder" },
		locatorSchemaPath: "elementByPlaceholder",
		steps: [],
	});
});

test("add getByRole to registry", async ({ page }) => {
	type LocatorSchemaPaths = "buttonByRole";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("buttonByRole")).toThrowError(`${errMsg} "buttonByRole".`);

	registry.add("buttonByRole").getByRole("button", { name: "Submit" });

	expect(registry.get("buttonByRole")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "buttonByRole",
		steps: [],
	});
});

test("add getByTestId to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByTestId";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByTestId")).toThrowError(`${errMsg} "elementByTestId".`);

	registry.add("elementByTestId").getByTestId("login-button");

	expect(registry.get("elementByTestId")).toEqual({
		definition: { testId: "login-button", type: "testId" },
		locatorSchemaPath: "elementByTestId",
		steps: [],
	});
});

test("add getByText to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByText";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByText")).toThrowError(`${errMsg} "elementByText".`);

	registry.add("elementByText").getByText("Welcome");

	expect(registry.get("elementByText")).toEqual({
		definition: { text: "Welcome", type: "text" },
		locatorSchemaPath: "elementByText",
		steps: [],
	});
});

test("add getByTitle to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByTitle";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("elementByTitle")).toThrowError(`${errMsg} "elementByTitle".`);

	registry.add("elementByTitle").getByTitle("Home Page");

	expect(registry.get("elementByTitle")).toEqual({
		definition: { text: "Home Page", type: "title" },
		locatorSchemaPath: "elementByTitle",
		steps: [],
	});
});

test("add locator to registry", async ({ page }) => {
	type LocatorSchemaPaths = "body";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("body")).toThrowError(`${errMsg} "body".`);

	registry.add("body").locator("body");

	expect(registry.get("body")).toEqual({
		definition: { selector: "body", type: "locator" },
		locatorSchemaPath: "body",
		steps: [],
	});
});

test("add records chained filters and indices in order for nested paths", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("list").locator("ul.list").filter({ hasText: "List" }).nth(1);
	registry.add("list.item").getByRole("listitem", { name: /Row/ }).filter({ hasText: "Row" }).nth("last");

	const nested = registry.getNestedLocator("list.item");

	expect(`${nested}`).toEqual(
		"locator('ul.list').filter({ hasText: 'List' }).nth(1).getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last()",
	);
});

test("add can reuse a reusable locator definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.first";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const h2 = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });

	registry.add("heading", { reuse: h2 });
	registry.add("heading.first", { reuse: h2 }).nth(0);

	expect(registry.get("heading")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading",
		steps: [{ filter: { hasText: /Summary/ }, kind: "filter" }],
	});

	expect(registry.get("heading.first")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading.first",
		steps: [
			{ filter: { hasText: /Summary/ }, kind: "filter" },
			{ index: 0, kind: "index" },
		],
	});
});

test("reusable builder yields the same locator chain as a direct definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.reused";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const reusable = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: "Intro" }).nth(1);
	console.log(reusable);

	registry.add("heading").getByRole("heading", { level: 2 }).filter({ hasText: "Intro" }).nth(1);
	console.log(registry.get("heading"));
	registry.add("heading.reused", { reuse: reusable });

	const direct = registry.getLocator("heading");
	const reused = registry.getLocator("heading.reused");

	expect(`${await reused}`).toEqual(`${await direct}`);
});

test("add rejects reuse by locator schema path", async ({ page }) => {
	type LocatorSchemaPaths = "seed" | "copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("seed").locator("error-message");

	// @ts-expect-error reuse by path is not supported
	expect(() => registry.add("copy", { reuse: "seed" })).toThrowError(
		/reusing locator schemas by path has been removed/i,
	);
});

test("add reuse by reusable locator patches options while preserving selector", async ({ page }) => {
	type LocatorSchemaPaths = "errorMessage" | "main.error";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const errorMessage = registry.createReusable.locator("error-message");
	registry.add("errorMessage", { reuse: errorMessage });
	registry.add("main.error", { reuse: errorMessage }).locator({ hasText: /invalid password/ });

	expect(registry.get("errorMessage")).toEqual({
		definition: { selector: "error-message", type: "locator" },
		locatorSchemaPath: "errorMessage",
		steps: [],
	});

	expect(registry.get("main.error")).toEqual({
		definition: { options: { hasText: /invalid password/ }, selector: "error-message", type: "locator" },
		locatorSchemaPath: "main.error",
		steps: [],
	});
});

test("add reuse by reusable locator inherits selector and discriminant", async ({ page }) => {
	type LocatorSchemaPaths = "errorMessage" | "main.error";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const errorMessage = registry.createReusable.locator("error-message", { hasText: /invalid password/ });
	registry.add("errorMessage", { reuse: errorMessage });
	registry.add("main.error", { reuse: errorMessage }).locator({ hasText: /invalid email/ });

	expect(registry.get("errorMessage")).toEqual({
		definition: { options: { hasText: /invalid password/ }, selector: "error-message", type: "locator" },
		locatorSchemaPath: "errorMessage",
		steps: [],
	});

	expect(registry.get("main.error")).toEqual({
		definition: { options: { hasText: /invalid email/ }, selector: "error-message", type: "locator" },
		locatorSchemaPath: "main.error",
		steps: [],
	});
});

test("add reuse with a reusable locator does not mutate the reusable definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.first";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const reusable = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });

	registry.add("heading", { reuse: reusable });
	registry.add("heading.first", { reuse: reusable }).nth(0);

	expect(reusable.steps).toEqual([{ filter: { hasText: /Summary/ }, kind: "filter" }]);
	expect(registry.get("heading")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading",
		steps: [{ filter: { hasText: /Summary/ }, kind: "filter" }],
	});

	expect(registry.get("heading.first")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading.first",
		steps: [
			{ filter: { hasText: /Summary/ }, kind: "filter" },
			{ index: 0, kind: "index" },
		],
	});
});

test("add reuse enforces matching locator type overrides", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.reuseLocator";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	const button = registry.createReusable.getByRole("button", { name: "Submit" });

	expect(() => registry.add("button", { reuse: button }).getByText("text")).toThrowError(
		'must use the "role" strategy',
	);

	registry.add("button", { reuse: button });

	expect(registry.get("button")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button",
		steps: [],
	});

	expect(() => registry.add("button.reuseLocator", { reuse: button }).getById("Submit")).toThrowError(
		'must use the "role" strategy',
	);

	registry.add("button.reuseLocator", { reuse: button }).getByRole({ name: "Submit" });

	expect(registry.get("button.reuseLocator")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button.reuseLocator",
		steps: [],
	});
});

test("add reuse patches role options while preserving role value", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const h2 = registry.createReusable.getByRole("heading", { level: 2 });

	registry.add("heading", { reuse: h2 }).getByRole({ name: "Summary" });

	expect(registry.get("heading")).toEqual({
		definition: { role: "heading", options: { level: 2, name: "Summary" }, type: "role" },
		locatorSchemaPath: "heading",
		steps: [],
	});
});

test("add prevents multiple locator type definitions", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const builder = registry.add("heading").getByRole("heading", { level: 2 });

	expect((builder as { getByText?: unknown }).getByText).toBeUndefined();

	builder.filter({ hasText: "Heading" }).nth(0);
});

test("add typing narrows locator methods after a definition is chosen", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const postDefinition = registry.add("heading").getByRole("heading", { level: 2 });

	// @ts-expect-error additional locator methods are not exposed after a definition is set
	const _invalidLocatorMethod = postDefinition.getByText;

	postDefinition.filter({ hasText: "Heading" }).nth(0);
});

test("add reuse typing narrows override methods to the matching strategy", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const button = registry.createReusable.getByRole("button", { name: "Submit" });
	const builder = registry.add("button", { reuse: button });

	// @ts-expect-error mismatched locator strategies are not exposed when reusing a locator
	const _invalidOverrideMethod = builder.getByText;

	builder.getByRole({ name: "Submit" });
});

test("add reuse allows only one matching locator override", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const h2 = registry.createReusable.getByRole("heading", { level: 2 });

	const builder = registry.add("heading", { reuse: h2 });

	builder.getByRole("heading", { name: "Summary" });

	expect(() => builder.getByRole("heading", { name: "Other" })).toThrowError("only one matching override is allowed");
});

test("A LocatorSchemaPath can only be added once", async ({ page }) => {
	type LocatorSchemaPaths = "body";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("body").locator("body");

	const errMsg = /A locator schema with the path "body" already exists*/;

	expect(() => registry.add("body").locator("someone elses body")).toThrowError(errMsg);
});
