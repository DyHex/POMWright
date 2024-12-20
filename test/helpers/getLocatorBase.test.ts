import type { Locator, Page, TestInfo } from "@playwright/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GetByMethod, GetLocatorBase, PlaywrightReportLogger } from "../../index";
import type { LocatorSchemaWithoutPath } from "../../src/helpers/getLocatorBase";
import type { LogEntry } from "../../src/helpers/playwrightReportLogger";
import { type LocatorSchemaPath, POC } from "../basePage.test.poc";

describe("GetLocatorBase", () => {
	let pageObjectClass: POC;
	let mockLog: PlaywrightReportLogger;

	beforeEach(() => {
		const page = {} as Page;
		const testInfo = {} as TestInfo;
		const sharedLogEntry: LogEntry[] = [];
		mockLog = vi.mocked(
			new PlaywrightReportLogger({ current: "warn", initial: "warn" }, sharedLogEntry, "MockPOC"),
			true,
		);

		vi.spyOn(mockLog, "getNewChildLogger").mockReturnValue(mockLog);

		pageObjectClass = new POC(page, testInfo, mockLog);
	});

	test("should initialize correctly with dependencies", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);
		expect(instance).toBeTruthy();
		expect(instance).toBeInstanceOf(GetLocatorBase);
	});

	test("addSchema() should take a LocatorSchemaPath and a LocatorSchemaWithoutPath as input and add a LocatorSchema to the locatorSchemas Map", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "topMenu" as LocatorSchemaPath;

		const schema: LocatorSchemaWithoutPath = {
			locator: ".class",
			locatorMethod: GetByMethod.locator,
		};

		expect(() => {
			instance.getLocatorSchema(path);
		}).toThrowError(`[${pageObjectClass.pocName}] LocatorSchema not found for path: '${path}'`);

		instance.addSchema(path, schema);

		const locatorSchema = instance.getLocatorSchema(path);

		expect(locatorSchema).toBeTypeOf("object");

		expect(locatorSchema).toHaveProperty("locator");
		expect(locatorSchema.locator).toContain(schema.locator);

		expect(locatorSchema).toHaveProperty("locatorMethod");
		expect(locatorSchema.locatorMethod).toBe(schema.locatorMethod);

		expect(locatorSchema).toHaveProperty("locatorSchemaPath");
		expect(locatorSchema.locatorSchemaPath).toEqual(path);
	});

	test("addSchema() should not be able to add a LocatorSchema with a LocatorSchemaPath that has previously been added", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		instance.addSchema("topMenu" as LocatorSchemaPath, {
			locator: ".w3-top",
			locatorMethod: GetByMethod.locator,
		});

		instance.addSchema("topMenu.myAccount" as LocatorSchemaPath, {
			title: "My Account",
			locatorMethod: GetByMethod.title,
		});

		expect(() => {
			instance.addSchema("topMenu.myAccount" as LocatorSchemaPath, {
				role: "button",
				roleOptions: { name: "My Account", exact: true },
				locatorMethod: GetByMethod.role,
			});
		}).toThrowError(
			"[POC] A LocatorSchema with the path 'topMenu.myAccount' already exists. \n" +
				"Existing Schema: {\n" +
				'  "title": "My Account",\n' +
				'  "locatorMethod": "title",\n' +
				'  "locatorSchemaPath": "topMenu.myAccount"\n' +
				"} \n" +
				"Attempted to Add Schema: {\n" +
				'  "role": "button",\n' +
				'  "roleOptions": {\n' +
				'    "name": "My Account",\n' +
				'    "exact": true\n' +
				"  },\n" +
				'  "locatorMethod": "role",\n' +
				'  "locatorSchemaPath": "topMenu.myAccount"\n' +
				"}",
		);
	});

	test("getLocatorSchema() should return a LocatorSchemaWithMethods object", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "minimalLocator" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			locator: ".class",
			locatorMethod: GetByMethod.locator,
		};

		const path1 = "minimalLocator.maximumLocator" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "button", exact: true },
			text: "text",
			textOptions: { exact: true },
			label: "label",
			labelOptions: { exact: true },
			placeholder: "placeholder",
			placeholderOptions: { exact: true },
			altText: "altText",
			altTextOptions: { exact: true },
			title: "title",
			titleOptions: { exact: true },
			locator: ".class",
			locatorOptions: {
				has: ".has" as unknown as Locator,
				hasNot: ".hasNot" as unknown as Locator,
				hasNotText: "hasNotText",
				hasText: "hasText",
			},
			frameLocator: 'iframe[title="frame"]',
			testId: "testId",
			dataCy: "dataCy",
			id: "id",
			filter: {
				has: ".has" as unknown as Locator,
				hasNot: ".hasNot" as unknown as Locator,
				hasNotText: "hasNotText",
				hasText: "hasText",
			},
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);

		const locatorSchema = instance.getLocatorSchema(path1);
		expect(locatorSchema).toBeTruthy();
		expect(locatorSchema).toBeTypeOf("object");

		const propertiesCount = Object.keys(locatorSchema).length;
		expect(propertiesCount).toBe(28);

		expect(locatorSchema).toHaveProperty("locatorMethod");
		expect(locatorSchema.locatorMethod).toBe(schema1.locatorMethod);

		expect(locatorSchema).toHaveProperty("locatorSchemaPath");
		expect(locatorSchema.locatorSchemaPath).toEqual(path1);

		expect(locatorSchema).toHaveProperty("role");
		expect(locatorSchema.role).toBe(schema1.role);

		expect(locatorSchema).toHaveProperty("roleOptions");
		expect(locatorSchema.roleOptions).toBeInstanceOf(Object);
		expect(locatorSchema.roleOptions).toEqual(schema1.roleOptions);

		expect(locatorSchema).toHaveProperty("text");
		expect(locatorSchema.text).toBe(schema1.text);

		expect(locatorSchema).toHaveProperty("textOptions");
		expect(locatorSchema.textOptions).toBeInstanceOf(Object);
		expect(locatorSchema.textOptions).toEqual(schema1.textOptions);

		expect(locatorSchema).toHaveProperty("label");
		expect(locatorSchema.label).toBe(schema1.label);

		expect(locatorSchema).toHaveProperty("labelOptions");
		expect(locatorSchema.labelOptions).toBeInstanceOf(Object);
		expect(locatorSchema.labelOptions).toEqual(schema1.labelOptions);

		expect(locatorSchema).toHaveProperty("placeholder");
		expect(locatorSchema.placeholder).toBe(schema1.placeholder);

		expect(locatorSchema).toHaveProperty("placeholderOptions");
		expect(locatorSchema.placeholderOptions).toBeInstanceOf(Object);
		expect(locatorSchema.placeholderOptions).toEqual(schema1.placeholderOptions);

		expect(locatorSchema).toHaveProperty("altText");
		expect(locatorSchema.altText).toBe(schema1.altText);

		expect(locatorSchema).toHaveProperty("altTextOptions");
		expect(locatorSchema.altTextOptions).toBeInstanceOf(Object);
		expect(locatorSchema.altTextOptions).toEqual(schema1.altTextOptions);

		expect(locatorSchema).toHaveProperty("title");
		expect(locatorSchema.title).toBe(schema1.title);

		expect(locatorSchema).toHaveProperty("locator");
		expect(locatorSchema.locator).toBe(schema1.locator);

		expect(locatorSchema).toHaveProperty("locatorOptions");
		expect(locatorSchema.locatorOptions).toBeInstanceOf(Object);
		expect(locatorSchema.locatorOptions).toEqual(schema1.locatorOptions);

		expect(locatorSchema).toHaveProperty("frameLocator");
		expect(locatorSchema.frameLocator).toBe(schema1.frameLocator);

		expect(locatorSchema).toHaveProperty("testId");
		expect(locatorSchema.testId).toBe(schema1.testId);

		expect(locatorSchema).toHaveProperty("dataCy");
		expect(locatorSchema.dataCy).toBe(schema1.dataCy);

		expect(locatorSchema).toHaveProperty("id");
		expect(locatorSchema.id).toBe(schema1.id);

		expect(locatorSchema).toHaveProperty("filter");
		expect(locatorSchema.filter).toBeInstanceOf(Object);
		expect(locatorSchema.filter).toEqual(schema1.filter);

		expect(locatorSchema).toHaveProperty("addFilter");
		expect(locatorSchema.addFilter).toBeInstanceOf(Function);

		expect(locatorSchema).toHaveProperty("update");
		expect(locatorSchema.update).toBeInstanceOf(Function);

		expect(locatorSchema).toHaveProperty("updates");
		expect(locatorSchema.updates).toBeInstanceOf(Function);

		expect(locatorSchema).toHaveProperty("getNestedLocator");
		expect(locatorSchema.getNestedLocator).toBeInstanceOf(Function);

		expect(locatorSchema).toHaveProperty("getLocator");
		expect(locatorSchema.getLocator).toBeInstanceOf(Function);

		expect(locatorSchema).toHaveProperty("schemasMap");
		expect(locatorSchema.schemasMap).toBeInstanceOf(Map);
		expect(locatorSchema.schemasMap.size).toBe(2);

		const schema1inMap = locatorSchema.schemasMap.get(path1);
		expect(schema1inMap).toBeTruthy();
		expect(locatorSchema).containSubset(schema1inMap);
		// Check circular reference, the schema in the map should be the same as the schema retrieved from the instance
		expect(schema1inMap).toBe(locatorSchema);

		const schema0inMap = locatorSchema.schemasMap.get(path0);
		expect(schema0inMap).toBeTruthy();
		expect(schema0inMap?.locator).toBe(schema0.locator);
		expect(schema0inMap?.locatorMethod).toBe(schema0.locatorMethod);
		expect(schema0inMap?.locatorSchemaPath).toBe(path0);
		const retrievedSchema0 = instance.getLocatorSchema(path0);
		expect(Object.keys(retrievedSchema0).length).toBe(10);
		expect(retrievedSchema0).containSubset(schema0inMap);
		expect(retrievedSchema0).toBe(retrievedSchema0.schemasMap.get(path0));
	});

	test("getLocatorSchema() should return a new deepCopy LocatorSchemaWithMethods", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "locator" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			locator: ".class",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path, schema);

		const locatorSchema_A = instance.getLocatorSchema(path);
		expect(locatorSchema_A).toBeTruthy();

		const locatorSchema_B = instance.getLocatorSchema(path);
		expect(locatorSchema_B).toBeTruthy();

		expect(locatorSchema_A).not.toBe(locatorSchema_B);
	});

	test("update() should alter the last locatorSchema in the chain e.g. the LocatorSchemaWithMethods the full LocatorSchemaPath resolves to", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "the.path" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			locator: ".subClass",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema = instance.getLocatorSchema(path);
		expect(locatorSchema).toBeTruthy();
		expect(Object.keys(locatorSchema).length).toBe(10);
		expect(locatorSchema).containSubset({ ...schema, locatorSchemaPath: path }); // should reflect test data
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema); // should reference itself

		// Calling .update() should return an updated locatorSchemaWithMethods object and still contain a reference to itself in its schemasMap
		const newLocatorSchemaWeAlterWithUpdate = instance.getLocatorSchema(path).update({ locator: ".newSubClass" });
		expect(newLocatorSchemaWeAlterWithUpdate).toBeTruthy();
		expect(newLocatorSchemaWeAlterWithUpdate.locator).toBe(".newSubClass");
		expect(newLocatorSchemaWeAlterWithUpdate.schemasMap.get(path)?.locator).toBe(".newSubClass");
		expect(newLocatorSchemaWeAlterWithUpdate.schemasMap.get(path)).toEqual(newLocatorSchemaWeAlterWithUpdate);
	});

	test("update() should be callable on the LocatorSchemaWithMethods object after it has been assigned to a const with getLocatorSchema", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "the.path" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			locator: ".subClass",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema = instance.getLocatorSchema(path);
		expect(locatorSchema).toBeTruthy();
		expect(Object.keys(locatorSchema).length).toBe(10);
		expect(locatorSchema).containSubset({ ...schema, locatorSchemaPath: path }); // should reflect test data
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema); // should reference itself

		// Calling .update() should update the previously created locatorSchemaWithMethods object and still contain a reference to itself in its schemasMap
		locatorSchema.update({ locator: ".newSubClass" });
		expect(locatorSchema).toBeTruthy();
		expect(locatorSchema.locator).toBe(".newSubClass");
		expect(locatorSchema.schemasMap.get(path)?.locator).toBe(".newSubClass");
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema);
		expect(locatorSchema).not.containSubset({ ...schema, locatorSchemaPath: path });
	});

	test("update() should not alter entries in the getLocatorBase.locatorSchemas Map or the schemasMap on the retrieved deepCopy", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "the" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			locator: ".mainClass",
			locatorMethod: GetByMethod.locator,
		};

		const path1 = "the.path" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			locator: ".subClass",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path1);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(10);
		expect(locatorSchema_A).containSubset({ ...schema1, locatorSchemaPath: path1 }); // should reflect test data
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A); // should reference itself

		// Calling getLocatorSchema().update() should return a new altered locatorSchemaWithMethods object and still contain a reference to itself in its schemasMap
		const locatorSchema_B = instance.getLocatorSchema(path1).update({ locator: ".newSubClass" });
		expect(locatorSchema_B).toBeTruthy();
		expect(locatorSchema_B.locator).toBe(".newSubClass");
		expect(locatorSchema_B.schemasMap.get(path1)?.locator).toBe(".newSubClass");
		expect(locatorSchema_B.schemasMap.get(path1)).toEqual(locatorSchema_B);

		// Check that the initial locatorSchema is still the same
		expect(locatorSchema_A).containSubset({ ...schema1, locatorSchemaPath: path1 });
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A);

		// Check that the LocatorSchemas are different objects
		expect(locatorSchema_A).not.toBe(locatorSchema_B);
		expect(locatorSchema_A.schemasMap.get(path1)).not.toBe(locatorSchema_B);
		expect(locatorSchema_A.schemasMap.get(path1)).not.toBe(locatorSchema_B.schemasMap.get(path1));
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A);
		expect(locatorSchema_B.schemasMap.get(path1)).toEqual(locatorSchema_B);

		// Check that the original locatorSchema in getLocatorBase.locatorSchemas is still the same
		const locatorSchema_C = instance.getLocatorSchema(path1);
		expect(locatorSchema_C).toBeTruthy();
		expect(Object.keys(locatorSchema_C).length).toBe(10);
		expect(locatorSchema_C).containSubset({ ...schema1, locatorSchemaPath: path1 }); // should reflect test data
		expect(locatorSchema_C.schemasMap.get(path1)).toEqual(locatorSchema_C); // should reference itself

		// Check that we can call .update() again and that the locatorSchema is updated correctly, again
		locatorSchema_B.update({ locator: ".subClass" });
		expect(locatorSchema_B).toBeTruthy();
		expect(Object.keys(locatorSchema_B).length).toBe(10);
		expect(locatorSchema_B).containSubset({ ...schema1, locatorSchemaPath: path1 });
		expect(locatorSchema_B.schemasMap.get(path1)).toEqual(locatorSchema_B);
	});

	test("update() should be able to set any undefined Partial<LocatorSchema> property", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "minimum" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(9);
		expect(locatorSchema_A).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema_A.schemasMap.get(path)).toEqual(locatorSchema_A);

		const newSchema: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "button", exact: true },
			text: "text",
			textOptions: { exact: true },
			label: "label",
			labelOptions: { exact: true },
			placeholder: "placeholder",
			placeholderOptions: { exact: true },
			altText: "altText",
			altTextOptions: { exact: true },
			title: "title",
			titleOptions: { exact: true },
			locator: ".class",
			locatorOptions: { hasText: "text" },
			frameLocator: 'iframe[title="frame"]',
			testId: "testId",
			dataCy: "dataCy",
			id: "id",
			filter: {
				hasNotText: "hasNotText",
				hasText: "text",
			},
			locatorMethod: GetByMethod.locator,
		};

		locatorSchema_A.update(newSchema);
		expect(Object.keys(locatorSchema_A).length).toBe(28);
		expect(locatorSchema_A).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema_A.schemasMap.get(path)).toEqual(locatorSchema_A);

		const locatorSchema_B = instance.getLocatorSchema(path).update(newSchema);
		expect(Object.keys(locatorSchema_B).length).toBe(28);
		expect(locatorSchema_B).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema_B.schemasMap.get(path)).toEqual(locatorSchema_B);
	});

	test("updates() should alter the last locatorSchema in the chain e.g. the LocatorSchemaWithMethods the full LocatorSchemaPath resolves to the same way update does", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "the" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			locator: ".mainClass",
			locatorMethod: GetByMethod.locator,
		};

		const path1 = "the.path" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			locator: ".subClass",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path1);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(10);
		expect(locatorSchema_A).containSubset({ ...schema1, locatorSchemaPath: path1 }); // should reflect test data
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A); // should reference itself

		// Calling .update() should return an updated locatorSchemaWithMethods object and still contain a reference to itself in its schemasMap
		const locatorSchema_B = instance.getLocatorSchema(path1).updates({ 1: { locator: ".newSubClass" } });
		expect(locatorSchema_B).toBeTruthy();
		expect(locatorSchema_B.locator).toBe(".newSubClass");
		expect(locatorSchema_B.schemasMap.get(path1)?.locator).toBe(".newSubClass");
		expect(locatorSchema_B.schemasMap.get(path1)).toEqual(locatorSchema_B);

		// Check that the first LocatorSchema in the chain ("the") is still the same
		expect(locatorSchema_B.schemasMap.get(path0)).toEqual(locatorSchema_A.schemasMap.get(path0));
		expect(locatorSchema_B.schemasMap.get(path0)).not.toBe(locatorSchema_A.schemasMap.get(path0));
	});

	test("updates() should be callable on the LocatorSchemaWithMethods object after it has been assigned to a const with getLocatorSchema", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "the" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			locator: ".mainClass",
			locatorMethod: GetByMethod.locator,
		};

		const path1 = "the.path" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			locator: ".subClass",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);

		// Check that the locatorSchema is as expected
		const locatorSchema = instance.getLocatorSchema(path1);
		expect(locatorSchema).toBeTruthy();
		expect(Object.keys(locatorSchema).length).toBe(10);
		expect(locatorSchema).containSubset({ ...schema1, locatorSchemaPath: path1 }); // should reflect test data
		expect(locatorSchema.schemasMap.get(path1)).toEqual(locatorSchema); // should reference itself

		// Calling .updates() should update the previously created locatorSchemaWithMethods object and still contain a reference to itself in its schemasMap
		locatorSchema.updates({ 1: { locator: ".newSubClass" } });
		expect(locatorSchema).toBeTruthy();
		expect(locatorSchema.locator).toBe(".newSubClass");
		expect(locatorSchema.schemasMap.get(path1)?.locator).toBe(".newSubClass");
		expect(locatorSchema.schemasMap.get(path1)).toEqual(locatorSchema);
		expect(locatorSchema).not.containSubset({ ...schema1, locatorSchemaPath: path1 });
		expect(locatorSchema.schemasMap.get(path0)).toEqual({ ...schema0, locatorSchemaPath: path0 });
	});

	test("updates() should be able to alter any locatorSchema in the chain by referencing them through index", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "zero" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			locator: ".zero",
			locatorMethod: GetByMethod.locator,
		};

		const path1 = "zero.one" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			locator: ".one",
			locatorMethod: GetByMethod.locator,
		};

		const path2 = "zero.one.two" as LocatorSchemaPath;
		const schema2: LocatorSchemaWithoutPath = {
			locator: ".two",
			locatorMethod: GetByMethod.locator,
		};

		const path3 = "zero.one.two.three" as LocatorSchemaPath;
		const schema3: LocatorSchemaWithoutPath = {
			locator: ".three",
			locatorMethod: GetByMethod.locator,
		};

		const path4 = "zero.one.two.three.four" as LocatorSchemaPath;
		const schema4: LocatorSchemaWithoutPath = {
			locator: ".four",
			locatorMethod: GetByMethod.locator,
		};

		const path5 = "zero.one.two.three.four.five" as LocatorSchemaPath;
		const schema5: LocatorSchemaWithoutPath = {
			locator: ".five",
			locatorMethod: GetByMethod.locator,
		};

		const path6 = "zero.one.two.three.four.five.six" as LocatorSchemaPath;
		const schema6: LocatorSchemaWithoutPath = {
			locator: ".six",
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);
		instance.addSchema(path2, schema2);
		instance.addSchema(path3, schema3);
		instance.addSchema(path4, schema4);
		instance.addSchema(path5, schema5);
		instance.addSchema(path6, schema6);

		// Check that the locatorSchema is as expected
		const locatorSchema = instance.getLocatorSchema(path6);
		expect(locatorSchema).toBeTruthy();
		expect(Object.keys(locatorSchema).length).toBe(10);
		expect(locatorSchema).containSubset({ ...schema6, locatorSchemaPath: path6 }); // should reflect test data
		expect(locatorSchema.schemasMap.get(path6)).toEqual(locatorSchema); // should reference itself
		expect(locatorSchema.schemasMap.size).toBe(7);

		// Should be able to update all LocatorSchema in schemasMap and the LocatorSchemaWithMethods containing it through .updates()
		locatorSchema.updates({
			0: { locator: "#0" },
			1: { locator: "#1" },
			2: { locator: "#2" },
			3: { locator: "#3" },
			4: { locator: "#4" },
			5: { locator: "#5" },
			6: { locator: "#6" },
		});
		expect(locatorSchema).toBeTruthy();
		expect(locatorSchema.locator).toBe("#6");
		expect(locatorSchema.schemasMap.get(path0)?.locator).toBe("#0");
		expect(locatorSchema.schemasMap.get(path1)?.locator).toBe("#1");
		expect(locatorSchema.schemasMap.get(path2)?.locator).toBe("#2");
		expect(locatorSchema.schemasMap.get(path3)?.locator).toBe("#3");
		expect(locatorSchema.schemasMap.get(path4)?.locator).toBe("#4");
		expect(locatorSchema.schemasMap.get(path5)?.locator).toBe("#5");
		expect(locatorSchema.schemasMap.get(path6)?.locator).toBe("#6");
		expect(locatorSchema.schemasMap.get(path6)).toEqual(locatorSchema);

		expect(locatorSchema.schemasMap.get(path0)).not.containSubset(schema0);
		expect(locatorSchema.schemasMap.get(path1)).not.containSubset(schema1);
		expect(locatorSchema.schemasMap.get(path2)).not.containSubset(schema2);
		expect(locatorSchema.schemasMap.get(path3)).not.containSubset(schema3);
		expect(locatorSchema.schemasMap.get(path4)).not.containSubset(schema4);
		expect(locatorSchema.schemasMap.get(path5)).not.containSubset(schema5);
		expect(locatorSchema.schemasMap.get(path6)).not.containSubset(schema6);

		expect(locatorSchema.schemasMap.get(path0)?.locatorSchemaPath).toEqual(path0);
		expect(locatorSchema.schemasMap.get(path1)?.locatorSchemaPath).toEqual(path1);
		expect(locatorSchema.schemasMap.get(path2)?.locatorSchemaPath).toEqual(path2);
		expect(locatorSchema.schemasMap.get(path3)?.locatorSchemaPath).toEqual(path3);
		expect(locatorSchema.schemasMap.get(path4)?.locatorSchemaPath).toEqual(path4);
		expect(locatorSchema.schemasMap.get(path5)?.locatorSchemaPath).toEqual(path5);
		expect(locatorSchema.schemasMap.get(path6)?.locatorSchemaPath).toEqual(path6);
	});

	test("updates() should be able to set any undefined Partial<LocatorSchema> property", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "minimum" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			locatorMethod: GetByMethod.locator,
		};

		const path1 = "minimum.minimum" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			locatorMethod: GetByMethod.locator,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path1);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(9);
		let path0LocatorSchema_A = locatorSchema_A.schemasMap.get(path0);
		if (path0LocatorSchema_A) {
			expect(Object.keys(path0LocatorSchema_A).length).toBe(2);
		} else {
			throw new Error("path0LocatorSchema is undefined");
		}
		expect(locatorSchema_A).containSubset({ ...schema0, locatorSchemaPath: path1 });
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A);

		const locator = {} as Locator;

		const newSchema: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: {
				name: "button",
				exact: true,
				checked: true,
				disabled: true,
				expanded: true,
				includeHidden: true,
				level: 1,
				pressed: true,
				selected: true,
			},
			text: "text",
			textOptions: { exact: true },
			label: "label",
			labelOptions: { exact: true },
			placeholder: "placeholder",
			placeholderOptions: { exact: true },
			altText: "altText",
			altTextOptions: { exact: true },
			title: "title",
			titleOptions: { exact: true },
			locator: ".class",
			locatorOptions: { has: locator, hasNot: locator, hasText: "yesText", hasNotText: "noText" },
			frameLocator: 'iframe[title="frame"]',
			testId: "testId",
			dataCy: "dataCy",
			id: "id",
			locatorMethod: GetByMethod.locator,
		};

		locatorSchema_A.updates({ 0: newSchema, 1: newSchema });
		expect(Object.keys(locatorSchema_A).length).toBe(27);
		expect(locatorSchema_A).containSubset({ ...schema1, locatorSchemaPath: path1 });
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A);
		expect(locatorSchema_A.schemasMap.get(path0)).containSubset({ ...schema0, locatorSchemaPath: path0 });
		path0LocatorSchema_A = locatorSchema_A.schemasMap.get(path0);
		if (path0LocatorSchema_A) {
			expect(Object.keys(path0LocatorSchema_A).length).toBe(20);
		} else {
			throw new Error("path0LocatorSchema is undefined");
		}

		const locatorSchema_B = instance.getLocatorSchema(path1).updates({ 0: newSchema, 1: newSchema });
		expect(Object.keys(locatorSchema_B).length).toBe(27);
		expect(locatorSchema_B).containSubset({ ...schema1, locatorSchemaPath: path1 });
		expect(locatorSchema_B.schemasMap.get(path1)).toEqual(locatorSchema_B);
		const path0LocatorSchema_B = locatorSchema_B.schemasMap.get(path0);
		if (path0LocatorSchema_B) {
			expect(Object.keys(path0LocatorSchema_B).length).toBe(20);
		} else {
			throw new Error("path0LocatorSchema is undefined");
		}
	});

	test("should be able to chain update()", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "button" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "button", exact: true },
			locatorMethod: GetByMethod.role,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(11);
		expect(locatorSchema_A).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema_A.schemasMap.get(path)).toEqual(locatorSchema_A);

		// Should be able to chain update() calls on an existing object
		locatorSchema_A.update({ role: "radio" }).update({ roleOptions: { name: "Agree", exact: false } });

		expect(locatorSchema_A.role).toBe("radio");
		expect(locatorSchema_A.roleOptions).toEqual({ name: "Agree", exact: false });

		// Should be able to chain update() calls directly when calling getLocatorSchema
		const locatorSchema_B = instance
			.getLocatorSchema(path)
			.update({ role: "radio" })
			.update({ roleOptions: { name: "Agree", exact: false } });
		expect(locatorSchema_B.role).toBe("radio");
		expect(locatorSchema_B.roleOptions).toEqual({ name: "Agree", exact: false });
	});

	test("should be able to chain updates()", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path0 = "region" as LocatorSchemaPath;
		const schema0: LocatorSchemaWithoutPath = {
			role: "region",
			roleOptions: { name: "Personal Details", exact: true },
			locatorMethod: GetByMethod.role,
		};

		const path1 = "region.button" as LocatorSchemaPath;
		const schema1: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "Save", exact: true },
			locatorMethod: GetByMethod.role,
		};

		instance.addSchema(path0, schema0);
		instance.addSchema(path1, schema1);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path1);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(11);
		expect(locatorSchema_A).containSubset({ ...schema1, locatorSchemaPath: path1 });
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A);

		// Should be able to chain updates() calls on an existing object
		locatorSchema_A
			.updates({
				0: { role: "radio" },
				1: { roleOptions: { name: "Agree", exact: false } },
			})
			.updates({
				0: { roleOptions: { name: "Enable something" } },
				1: { role: "checkbox" },
			});

		expect(locatorSchema_A.role).toBe("checkbox");
		expect(locatorSchema_A.roleOptions).toEqual({ name: "Agree", exact: false });
		expect(locatorSchema_A.schemasMap.get(path1)).toEqual(locatorSchema_A);
		expect(locatorSchema_A.schemasMap.get(path0)).toEqual(locatorSchema_A.schemasMap.get(path0));
		expect(locatorSchema_A.schemasMap.get(path0)?.role).toBe("radio");
		expect(locatorSchema_A.schemasMap.get(path0)?.roleOptions).toEqual({ name: "Enable something", exact: true });
	});

	test("should be able to chain update() and updates()", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "button" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "button", exact: true },
			locatorMethod: GetByMethod.role,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema_A = instance.getLocatorSchema(path);
		expect(locatorSchema_A).toBeTruthy();
		expect(Object.keys(locatorSchema_A).length).toBe(11);
		expect(locatorSchema_A).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema_A.schemasMap.get(path)).toEqual(locatorSchema_A);

		// Should be able to chain update() and updates() calls on an existing object
		locatorSchema_A
			.update({ role: "radio" })
			.updates({
				0: { roleOptions: { name: "Agree" } },
			})
			.update({ roleOptions: { exact: false } })
			.updates({ 0: { locator: ".class" } });

		expect(locatorSchema_A.role).toBe("radio");
		expect(locatorSchema_A.roleOptions).toEqual({ name: "Agree", exact: false });
		expect(locatorSchema_A.locator).toBe(".class");
		expect(locatorSchema_A.schemasMap.get(path)).toEqual(locatorSchema_A);
	});

	test("should not be able to change LocatorSchemaPath through update or updates", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "button" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "button", exact: true },
			locatorMethod: GetByMethod.role,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema = instance.getLocatorSchema(path);
		expect(locatorSchema).toBeTruthy();
		expect(Object.keys(locatorSchema).length).toBe(11);
		expect(locatorSchema).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema);

		// Should not be able to change the LocatorSchemaPath
		expect(() => {
			// @ts-ignore Object literal may only specify known properties, and 'locatorSchemaPath' does not exist in type 'Partial<UpdatableLocatorSchemaProperties>'.ts(2353)
			locatorSchema.update({ locatorSchemaPath: "newPath" });
		}).toThrowError(
			"[POC] Invalid property: 'locatorSchemaPath' cannot be updated. Attempted to update LocatorSchemaPath from 'button' to 'newPath'.",
		);

		expect(() => {
			// @ts-ignore Object literal may only specify known properties, and 'locatorSchemaPath' does not exist in type 'Partial<UpdatableLocatorSchemaProperties>'.ts(2353)
			locatorSchema.updates({ 0: { locatorSchemaPath: "newPath" } });
		}).toThrowError(
			"[POC] Invalid property: 'locatorSchemaPath' cannot be updated. Attempted to update LocatorSchemaPath from 'button' to 'newPath'.",
		);
	});

	test("last update/updates should take precedence over previous ones", () => {
		const instance = new GetLocatorBase(pageObjectClass, mockLog);

		const path = "button" as LocatorSchemaPath;
		const schema: LocatorSchemaWithoutPath = {
			role: "button",
			roleOptions: { name: "button", exact: true },
			locatorMethod: GetByMethod.role,
		};

		instance.addSchema(path, schema);

		// Check that the locatorSchema is as expected
		const locatorSchema = instance.getLocatorSchema(path);
		expect(locatorSchema).toBeTruthy();
		expect(Object.keys(locatorSchema).length).toBe(11);
		expect(locatorSchema).containSubset({ ...schema, locatorSchemaPath: path });
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema);

		// Should not be able to change the LocatorSchemaPath
		locatorSchema.update({ role: "radio" }).updates({ 0: { role: "checkbox" } });

		expect(locatorSchema.role).toBe("checkbox");
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema);

		locatorSchema.updates({ 0: { role: "checkbox" } }).update({ role: "radio" });
		expect(locatorSchema.role).toBe("radio");
		expect(locatorSchema.schemasMap.get(path)).toEqual(locatorSchema);
	});

	// getNestedLocator is covered through integration tests (found in ./tests) using Playwright/test (project found in ./test)

	// getLocator is covered through integration tests (found in ./test) using Playwright/test (project found in ./test)
});
