import { expect, test } from "@fixtures-v2/withOptions";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors, PlaywrightReportLogger } from "pomwright";

const createTestRegistry = <Paths extends string>(page: Page) => {
	const logger = new PlaywrightReportLogger({ current: "debug", initial: "debug" }, [], "test-registry");
	return createRegistryWithAccessors<Paths>(page, logger).registry;
};

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
	const l = await registry.getLocator("elementByDataCy");
	console.log(l);

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

	const locator = await registry.getLocator("stringId.#stringId");
	expect(`${locator}`).toEqual("locator('#unique-element')");

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

	const nested = await registry.getNestedLocator("list.item");

	expect(`${nested}`).toEqual(
		"locator('ul.list').filter({ hasText: 'List' }).nth(1).getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last()",
	);
});

test("A LocatorSchemaPath can only be added once", async ({ page }) => {
	type LocatorSchemaPaths = "body";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("body").locator("body");

	const errMsg = /A locator schema with the path "body" already exists*/;

	expect(() => registry.add("body").locator("someone elses body")).toThrowError(errMsg);
});
