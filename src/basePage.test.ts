import { type Page, type TestInfo } from "@playwright/test";
import { beforeEach, describe, expect, test } from "vitest";
import { PlaywrightReportLogger } from "../index";
import { type LocatorSchemaPath, POC } from "./basePage.test.poc";
import { getLocatorSchemaDummy } from "./helpers/locatorSchema.interface";
import type { LogEntry } from "./helpers/playwrightReportLogger";

/**
 * BasePage: PageObjectModel
 */

describe("BasePage: PageObjectModel", () => {
	let pageObjectClass: POC;

	beforeEach(() => {
		const page = {} as Page;
		const testInfo = {} as TestInfo;
		const sharedLogEntry: LogEntry[] = [];
		const pwrl = new PlaywrightReportLogger({ current: "warn", initial: "warn" }, sharedLogEntry, "test");
		pageObjectClass = new POC(page, testInfo, pwrl);
	});

	test("has property 'page'", () => {
		expect(pageObjectClass.page).toBeTypeOf("object");
		expect(pageObjectClass.page).toBeInstanceOf(Object);
	});

	test("has property 'testInfo'", () => {
		expect(pageObjectClass.testInfo).toBeTypeOf("object");
	});

	test("has property 'selector'", () => {
		expect(pageObjectClass.selector).toBeTypeOf("object");
	});

	test("has property 'baseUrl'", () => {
		expect(pageObjectClass.baseUrl).toBeTypeOf("string");
		expect(pageObjectClass.baseUrl).toBe("http://localhost:8080");
	});

	test("has property 'urlPath'", () => {
		expect(pageObjectClass.urlPath).toBeTypeOf("string");
		expect(pageObjectClass.urlPath).toBe("/");
	});

	test("has property 'fullUrl'", () => {
		expect(pageObjectClass.fullUrl).toBeTypeOf("string");
		expect(pageObjectClass.fullUrl).toBe(`${pageObjectClass.baseUrl}${pageObjectClass.urlPath}`);
	});

	test("has property 'pocName'", () => {
		expect(pageObjectClass.pocName).toBeTypeOf("string");
		expect(pageObjectClass.pocName).toBe("POC");
	});

	test("has property 'log'", () => {
		expect(pageObjectClass).toHaveProperty("log");
	});

	test("has property sessionStorage", async () => {
		expect(pageObjectClass.sessionStorage).toBeTypeOf("object");
		expect(pageObjectClass.sessionStorage).toHaveProperty("queuedStates");
		expect(pageObjectClass.sessionStorage).toHaveProperty("isInitiated");
		expect(pageObjectClass.sessionStorage).toHaveProperty("writeToSessionStorage");
		expect(pageObjectClass.sessionStorage).toHaveProperty("readFromSessionStorage");
		expect(pageObjectClass.sessionStorage).toHaveProperty("clear");
		expect(pageObjectClass.sessionStorage.clear).toBeTypeOf("function");
		expect(pageObjectClass.sessionStorage).toHaveProperty("get");
		expect(pageObjectClass.sessionStorage.get).toBeTypeOf("function");
		expect(pageObjectClass.sessionStorage).toHaveProperty("set");
		expect(pageObjectClass.sessionStorage.set).toBeTypeOf("function");
		expect(pageObjectClass.sessionStorage).toHaveProperty("setOnNextNavigation");
		expect(pageObjectClass.sessionStorage.setOnNextNavigation).toBeTypeOf("function");
	});

	test("has property 'locators'", () => {
		expect(pageObjectClass).toHaveProperty("locators");
	});

	test("has property 'initLocatorSchemas'", () => {
		expect(pageObjectClass).toHaveProperty("initLocatorSchemas");
	});

	test("has property 'getNestedLocator'", () => {
		expect(pageObjectClass).toHaveProperty("getNestedLocator");
	});

	test("has property 'getLocator'", () => {
		expect(pageObjectClass).toHaveProperty("getLocator");
	});

	test("has property 'getLocatorSchema'", () => {
		expect(pageObjectClass).toHaveProperty("getLocatorSchema");
	});
});

/**
 * BasePage: PageObjectModel.getLocatorSchema
 */

const baseExpectedProperties = [
	"locatorMethod",
	"locatorSchemaPath",
	"schemasMap",
	"update",
	"updates",
	"getNestedLocator",
	"getLocator",
];
const allposProp = Object.keys(getLocatorSchemaDummy());
const allPossibleProperties = [...baseExpectedProperties, ...allposProp];

const locatorSchemaCases = [
	{
		path: "getByRole" as LocatorSchemaPath,
		additionalExpectedProperties: ["role"],
	},
	{
		path: "getByRoleWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["role", "roleOptions"],
	},
	{
		path: "getByText" as LocatorSchemaPath,
		additionalExpectedProperties: ["text"],
	},
	{
		path: "getByTextWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["text", "textOptions"],
	},
	{
		path: "getByLabel" as LocatorSchemaPath,
		additionalExpectedProperties: ["label"],
	},
	{
		path: "getByLabelWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["label", "labelOptions"],
	},
	{
		path: "getByPlaceholder" as LocatorSchemaPath,
		additionalExpectedProperties: ["placeholder"],
	},
	{
		path: "getByPlaceholderWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["placeholder", "placeholderOptions"],
	},
	{
		path: "getByAltText" as LocatorSchemaPath,
		additionalExpectedProperties: ["altText"],
	},
	{
		path: "getByAltTextWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["altText", "altTextOptions"],
	},
	{
		path: "getByTitle" as LocatorSchemaPath,
		additionalExpectedProperties: ["title"],
	},
	{
		path: "getByTitleWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["title", "titleOptions"],
	},
	{
		path: "getByLocator" as LocatorSchemaPath,
		additionalExpectedProperties: ["locator"],
	},
	{
		path: "getByLocatorWithOptions" as LocatorSchemaPath,
		additionalExpectedProperties: ["locator", "locatorOptions"],
	},
	{
		path: "getByFrameLocator" as LocatorSchemaPath,
		additionalExpectedProperties: ["frameLocator"],
	},
	{
		path: "getByTestId" as LocatorSchemaPath,
		additionalExpectedProperties: ["testId"],
	},
	{
		path: "getByDataCy" as LocatorSchemaPath,
		additionalExpectedProperties: ["dataCy"],
	},
	{
		path: "getById" as LocatorSchemaPath,
		additionalExpectedProperties: ["id"],
	},
	{
		path: "minimumLocatorSchema" as LocatorSchemaPath,
		additionalExpectedProperties: [],
	},
	{
		path: "maximumLocatorSchema" as LocatorSchemaPath,
		additionalExpectedProperties: [
			"role",
			"roleOptions",
			"text",
			"textOptions",
			"label",
			"labelOptions",
			"placeholder",
			"placeholderOptions",
			"altText",
			"altTextOptions",
			"title",
			"titleOptions",
			"locator",
			"locatorOptions",
			"frameLocator",
			"testId",
			"dataCy",
			"id",
		],
	},
];

describe("BasePage: PageObjectModel.getLocatorSchema", () => {
	let pageObjectClass: POC;

	beforeEach(() => {
		const page = {} as Page;
		const testInfo = {} as TestInfo;
		const sharedLogEntry: LogEntry[] = [];
		const pwrl = new PlaywrightReportLogger({ current: "warn", initial: "warn" }, sharedLogEntry, "test");
		pageObjectClass = new POC(page, testInfo, pwrl);
	});

	test.each(locatorSchemaCases)(
		"getLocatorSchema($path) should return a LocatorSchemaWithMethods",
		({ path, additionalExpectedProperties }) => {
			const locatorSchemaWithMethods = pageObjectClass.getLocatorSchema(path);
			expect(locatorSchemaWithMethods).toBeTruthy();
			expect(locatorSchemaWithMethods).toBeTypeOf("object");

			const expectedProperties = [...baseExpectedProperties, ...additionalExpectedProperties];
			const notExpectedProperties = allPossibleProperties.filter((prop) => !expectedProperties.includes(prop));

			for (const property of expectedProperties) {
				expect(locatorSchemaWithMethods).toHaveProperty(property);
			}

			for (const property of notExpectedProperties) {
				expect(locatorSchemaWithMethods).not.toHaveProperty(property);
			}

			const hasMethods =
				typeof locatorSchemaWithMethods.update === "function" &&
				typeof locatorSchemaWithMethods.updates === "function" &&
				typeof locatorSchemaWithMethods.getNestedLocator === "function" &&
				typeof locatorSchemaWithMethods.getLocator === "function";
			expect(hasMethods).toBe(true);

			expect(locatorSchemaWithMethods.locatorMethod).toBeTypeOf("string");

			expect(locatorSchemaWithMethods.locatorSchemaPath).toBeTruthy();
			expect(locatorSchemaWithMethods.locatorSchemaPath).toBeTypeOf("string");
			expect(locatorSchemaWithMethods.locatorSchemaPath).toContain(path);
		},
	);
});
