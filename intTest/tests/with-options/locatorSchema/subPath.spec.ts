import { expect, test } from "@fixtures/withOptions";
import { GetByMethod } from "pomwright";

test.describe("getNestedLocator", () => {
	const nth = ".nth(2)";
	const nestedLocator =
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).nth(2).locator(getByRole('button', { name: 'roleOptions' })).filter({ hasText: 'hasText' }).locator(getByRole('button', { name: 'roleOptions' })).filter({ hasNotText: 'hasNotText' }).locator(getByRole('button', { name: 'roleOptions' })).filter({ hasText: 'hasText' })";

	test("await poc.getNestedLocator(LocatorSchemaPath, {subPath: nth})", async ({ testFilters }) => {
		const t = await testFilters.getNestedLocator(
			"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
			{ "fictional.filter@hasNotText": 2 },
		);

		expect(`${t}`).toContain(nth);

		expect(`${t}`).toEqual(nestedLocator);
	});

	test("await poc.getLocatorSchema(LocatorSchemaPath).getNestedLocator({subPath: nth})", async ({ testFilters }) => {
		const t = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.getNestedLocator({ "fictional.filter@hasNotText": 2 });

		expect(`${t}`).toContain(nth);

		expect(`${t}`).toEqual(nestedLocator);
	});

	test("deprecated await poc.getNestedLocator(LocatorSchemaPath, {indexOfPath: nth})", async ({ testFilters }) => {
		const t = await testFilters.getNestedLocator(
			"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
			{ 1: 2 },
		);

		expect(`${t}`).toContain(nth);

		expect(`${t}`).toEqual(nestedLocator);
	});

	test("deprecated await poc.getLocatorSchema(LocatorSchemaPath).getNestedLocator({indexOfPath: nth})", async ({
		testFilters,
	}) => {
		const t = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.getNestedLocator({ 1: 2 });

		expect(`${t}`).toContain(nth);

		expect(`${t}`).toEqual(nestedLocator);
	});

	test("await poc.getLocatorSchema(LocatorSchemaPath).getNestedLocator({invalidSubPath: nth})", async ({
		testFilters,
	}) => {
		await expect(async () => {
			await testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.getNestedLocator({ "fictional.filter@has": 2 });
		}).rejects.toThrowError(
			/Invalid sub-path 'fictional\.filter@has' in getNestedLocator\. Allowed sub-paths are:\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText/,
		);
	});

	test("await poc.getLocatorSchema(LocatorSchemaPath).getNestedLocator({noneExistantSubPath: nth})", async ({
		testFilters,
	}) => {
		await expect(async () => {
			await testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.getNestedLocator({ fictional: 2 });
		}).rejects.toThrowError(
			/Invalid sub-path 'fictional' in getNestedLocator\. Allowed sub-paths are:\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText/,
		);
	});

	test("await poc.getNestedLocator(LocatorSchemaPath, {invalidSubPath: nth})", async ({ testFilters }) => {
		await expect(async () => {
			await testFilters.getNestedLocator(
				"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
				{ "fictional.filter@has": 2 },
			);
		}).rejects.toThrowError(
			/Invalid sub-path 'fictional\.filter@has' in getNestedLocator\. Allowed sub-paths are:\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText/,
		);
	});

	test("await poc.getLocatorSchema(LocatorSchemaPath).getNestedLocator({subPath: -1})", async ({ testFilters }) => {
		await expect(async () => {
			await testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.getNestedLocator({ "fictional.filter@hasNotText": -1 });
		}).rejects.toThrowError(
			"Invalid index for sub-path 'fictional.filter@hasNotText': Expected a positive number or null.",
		);
	});
});

test.describe("update, deprecated update & deprecated updates", () => {
	test("await poc.getLocatorSchema(LocatorSchemaPath).update(subPath, updates)", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section");

		expect(preUpdate.locatorMethod).not.toEqual(GetByMethod.role);
		expect(preUpdate.role).not.toEqual("button");
		expect(preUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const newUpdate = testFilters.getLocatorSchema("body.section").update("body.section", {
			locatorMethod: GetByMethod.testId,
			testId: "someTestId",
		});

		expect(newUpdate.locatorMethod).toEqual(GetByMethod.testId);
		expect(newUpdate.role).not.toEqual("button");
		expect(newUpdate.testId).toEqual("someTestId");
		expect(newUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const postUpdate = preUpdate.update("body.section", {
			locatorMethod: GetByMethod.role,
			role: "button",
			roleOptions: { name: "Click me!" },
		});

		expect(postUpdate.locatorMethod).toEqual(GetByMethod.role);
		expect(postUpdate.role).toEqual("button");
		expect(postUpdate.testId).not.toEqual("someTestId");
		expect(postUpdate.roleOptions).toEqual({ name: "Click me!" });
	});

	test("chainable .update(subPath, updates)", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section");

		expect(preUpdate.schemasMap.get("body").locator).toBe("body");
		expect(preUpdate.locatorMethod).not.toEqual(GetByMethod.role);
		expect(preUpdate.role).not.toEqual("button");
		expect(preUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const multiUpdate = preUpdate
			.update("body", {
				locator: "SOMEBODY",
			})
			.update("body.section", {
				locatorMethod: GetByMethod.role,
			})
			.update("body.section", {
				role: "button",
			})
			.update("body.section", {
				roleOptions: { name: "Click me!" },
			});

		expect(preUpdate.schemasMap.get("body").locator).toBe("SOMEBODY");
		expect(multiUpdate.locatorMethod).toEqual(GetByMethod.role);
		expect(multiUpdate.role).toEqual("button");
		expect(multiUpdate.testId).not.toEqual("someTestId");
		expect(multiUpdate.roleOptions).toEqual({ name: "Click me!" });
	});

	test(".update(subPath, updates) successfully merges", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section.heading");

		expect(preUpdate.role).toEqual("heading");
		expect(preUpdate.roleOptions).toEqual({ level: 2 });
		expect(preUpdate.locatorMethod).toEqual(GetByMethod.role);

		const merged = preUpdate.update("body.section.heading", {
			roleOptions: { name: "HEADING TEXT" },
		});

		expect(merged.role).toEqual("heading");
		expect(merged.roleOptions).toEqual({ name: "HEADING TEXT", level: 2 });
		expect(merged.locatorMethod).toEqual(GetByMethod.role);
	});

	test("deprecated await poc.getLocatorSchema(LocatorSchemaPath).update(updates)", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section");

		expect(preUpdate.locatorMethod).not.toEqual(GetByMethod.role);
		expect(preUpdate.role).not.toEqual("button");
		expect(preUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const newUpdate = testFilters.getLocatorSchema("body.section").update({
			locatorMethod: GetByMethod.testId,
			testId: "someTestId",
		});

		expect(newUpdate.locatorMethod).toEqual(GetByMethod.testId);
		expect(newUpdate.role).not.toEqual("button");
		expect(newUpdate.testId).toEqual("someTestId");
		expect(newUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const postUpdate = preUpdate.update({
			locatorMethod: GetByMethod.role,
			role: "button",
			roleOptions: { name: "Click me!" },
		});

		expect(postUpdate.locatorMethod).toEqual(GetByMethod.role);
		expect(postUpdate.role).toEqual("button");
		expect(postUpdate.testId).not.toEqual("someTestId");
		expect(postUpdate.roleOptions).toEqual({ name: "Click me!" });
	});

	test("deprecated chainable .update(updates)", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section");

		expect(preUpdate.locatorMethod).not.toEqual(GetByMethod.role);
		expect(preUpdate.role).not.toEqual("button");
		expect(preUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const multiUpdate = preUpdate
			.update({
				locatorMethod: GetByMethod.role,
			})
			.update({
				role: "button",
			})
			.update({
				roleOptions: { name: "Click me!" },
			});

		expect(multiUpdate.locatorMethod).toEqual(GetByMethod.role);
		expect(multiUpdate.role).toEqual("button");
		expect(multiUpdate.testId).not.toEqual("someTestId");
		expect(multiUpdate.roleOptions).toEqual({ name: "Click me!" });
	});

	test("deprecated .update(updates) successfully merges", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section.heading");

		expect(preUpdate.role).toEqual("heading");
		expect(preUpdate.roleOptions).toEqual({ level: 2 });
		expect(preUpdate.locatorMethod).toEqual(GetByMethod.role);

		const merged = preUpdate.update({
			roleOptions: { name: "HEADING TEXT" },
		});

		expect(merged.role).toEqual("heading");
		expect(merged.roleOptions).toEqual({ name: "HEADING TEXT", level: 2 });
		expect(merged.locatorMethod).toEqual(GetByMethod.role);
	});

	test("deprecated await poc.getLocatorSchema(LocatorSchemaPath).updates({indexOfPath: updates})", async ({
		testFilters,
	}) => {
		const preUpdate = testFilters.getLocatorSchema("body.section");

		expect(preUpdate.locatorMethod).not.toEqual(GetByMethod.role);
		expect(preUpdate.role).not.toEqual("button");
		expect(preUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const newUpdate = testFilters.getLocatorSchema("body.section").updates({
			1: {
				locatorMethod: GetByMethod.testId,
				testId: "someTestId",
			},
		});

		expect(newUpdate.locatorMethod).toEqual(GetByMethod.testId);
		expect(newUpdate.role).not.toEqual("button");
		expect(newUpdate.testId).toEqual("someTestId");
		expect(newUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const postUpdate = preUpdate.updates({
			1: {
				locatorMethod: GetByMethod.role,
				role: "button",
				roleOptions: { name: "Click me!" },
			},
		});

		expect(postUpdate.locatorMethod).toEqual(GetByMethod.role);
		expect(postUpdate.role).toEqual("button");
		expect(postUpdate.testId).not.toEqual("someTestId");
		expect(postUpdate.roleOptions).toEqual({ name: "Click me!" });
	});

	test("deprecated chainable .updates({indexOfPath: updates, ...})", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section");

		expect(preUpdate.schemasMap.get("body").locator).toBe("body");
		expect(preUpdate.locatorMethod).not.toEqual(GetByMethod.role);
		expect(preUpdate.role).not.toEqual("button");
		expect(preUpdate.roleOptions).not.toEqual({ name: "Click me!" });

		const multiUpdate = preUpdate
			.updates({
				"0": {
					locator: "SOMEBODY",
				},
			})
			.updates({
				1: {
					locatorMethod: GetByMethod.role,
				},
			})
			.updates({
				1: {
					role: "button",
					roleOptions: { name: "Click me!" },
				},
			});

		expect(preUpdate.schemasMap.get("body").locator).toBe("SOMEBODY");
		expect(multiUpdate.locatorMethod).toEqual(GetByMethod.role);
		expect(multiUpdate.role).toEqual("button");
		expect(multiUpdate.testId).not.toEqual("someTestId");
		expect(multiUpdate.roleOptions).toEqual({ name: "Click me!" });
	});

	test("deprecated .updates({indexOfPath: updates}) successfully merges", async ({ testFilters }) => {
		const preUpdate = testFilters.getLocatorSchema("body.section.heading");

		expect(preUpdate.role).toEqual("heading");
		expect(preUpdate.roleOptions).toEqual({ level: 2 });
		expect(preUpdate.locatorMethod).toEqual(GetByMethod.role);

		const merged = preUpdate.updates({
			2: {
				roleOptions: { name: "HEADING TEXT" },
			},
		});

		expect(merged.role).toEqual("heading");
		expect(merged.roleOptions).toEqual({ name: "HEADING TEXT", level: 2 });
		expect(merged.locatorMethod).toEqual(GetByMethod.role);
	});

	test("update, deprecated update & deprecated updates produce the same result", async ({ testFilters }) => {
		const update = testFilters.getLocatorSchema("body.section.heading");
		expect(update.role).toEqual("heading");
		expect(update.roleOptions).toEqual({ level: 2 });
		expect(update.locatorMethod).toEqual(GetByMethod.role);

		update.update("body.section.heading", { roleOptions: { name: "HEADING TEXT" } });

		const deprecatedUpdate = testFilters.getLocatorSchema("body.section.heading");
		expect(deprecatedUpdate.role).toEqual("heading");
		expect(deprecatedUpdate.roleOptions).toEqual({ level: 2 });
		expect(deprecatedUpdate.locatorMethod).toEqual(GetByMethod.role);

		deprecatedUpdate.update({ roleOptions: { name: "HEADING TEXT" } });

		const deprecatedUpdates = testFilters.getLocatorSchema("body.section.heading");
		expect(deprecatedUpdates.role).toEqual("heading");
		expect(deprecatedUpdates.roleOptions).toEqual({ level: 2 });
		expect(deprecatedUpdates.locatorMethod).toEqual(GetByMethod.role);

		deprecatedUpdate.updates({ 2: { roleOptions: { name: "HEADING TEXT" } } });

		expect(`${update}`).toEqual(`${deprecatedUpdate}`);
		expect(`${update}`).toEqual(`${deprecatedUpdates}`);
		expect(`${deprecatedUpdate}`).toEqual(`${deprecatedUpdates}`);

		expect(update).not.toEqual(deprecatedUpdate);
		expect(update).not.toEqual(deprecatedUpdates);
		expect(deprecatedUpdate).not.toEqual(deprecatedUpdates);

		const updateNestedLocator = update.getNestedLocator();
		const deprecatedUpdateNestedLocator = deprecatedUpdate.getNestedLocator();
		const deprecatedUpdatesNestedLocator = deprecatedUpdates.getNestedLocator();

		expect(`${updateNestedLocator}`).toEqual(`${deprecatedUpdateNestedLocator}`);
		expect(`${updateNestedLocator}`).toEqual(`${deprecatedUpdatesNestedLocator}`);
		expect(`${deprecatedUpdateNestedLocator}`).toEqual(`${deprecatedUpdatesNestedLocator}`);

		expect(updateNestedLocator).not.toEqual(deprecatedUpdateNestedLocator);
		expect(updateNestedLocator).not.toEqual(deprecatedUpdatesNestedLocator);
		expect(deprecatedUpdateNestedLocator).not.toEqual(deprecatedUpdatesNestedLocator);
	});
});

test.describe("addFilter", () => {
	test("await poc.getLocatorSchema(LocatorSchemaPath).addFilter(subPath, filterValue)", async ({ testFilters }) => {
		const preFilter = testFilters.getLocatorSchema("body.section");

		expect(preFilter.filterMap.size).toBe(0);

		const postFilter = preFilter.addFilter("body.section", { hasText: "Playground" });

		expect(postFilter.filterMap.get("body.section")).toEqual([{ hasText: "Playground" }]);

		const newFilter = testFilters.getLocatorSchema("body.section");
		expect(newFilter.filterMap.size).toBe(0);
	});

	test("chainable .addFilter(subPath, filterValue)", async ({ testFilters }) => {
		const preFilter = testFilters.getLocatorSchema("body.section");

		const locator = await preFilter.getLocator();

		expect(preFilter.filterMap.size).toBe(0);

		const postFilter = preFilter
			.addFilter("body", { has: locator })
			.addFilter("body.section", { hasText: "Dude... Green is not a primary color." })
			.addFilter("body.section", { hasText: "Playground" });

		expect(postFilter.filterMap).toEqual(
			new Map([
				[
					"body",
					[
						{
							has: {
								_frame: expect.objectContaining({
									_guid: expect.any(String),
									_type: "Frame",
								}),
								_selector: "section",
							},
						},
					],
				],
				["body.section", [{ hasText: "Dude... Green is not a primary color." }, { hasText: "Playground" }]],
			]),
		);

		const newFilter = testFilters.getLocatorSchema("body.section");
		expect(newFilter.filterMap.size).toBe(0);

		const NestedLocatorWithFilter = await postFilter.getNestedLocator();
		expect(`${NestedLocatorWithFilter}`).toEqual(
			"locator('body').filter({ has: locator('section') }).locator(locator('section')).filter({ hasText: 'Dude... Green is not a primary color.' }).filter({ hasText: 'Playground' })",
		);
	});

	test("await poc.getLocatorSchema(LocatorSchemaPath).addFilter(invalidSubPath, filterValue)", async ({
		testFilters,
	}) => {
		expect(async () => {
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.addFilter("fictional.filter@has", { hasText: "something" });
		}).rejects.toThrowError(
			/Invalid sub-path 'fictional\.filter@has' in addFilter\. Allowed sub-paths are:\s*fictional\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText\.filter@hasText/,
		);
	});

	test("await poc.getLocatorSchema(LocatorSchemaPath).addFilter(noneExistantSubPath, filterValue)", async ({
		testFilters,
	}) => {
		expect(async () => {
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.addFilter("fictional", { hasText: "something" });
		}).rejects.toThrowError(
			/Invalid sub-path 'fictional' in addFilter\. Allowed sub-paths are:\s*fictional\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText,\s*fictional\.filter@hasNotText\.filter@hasText\.filter@hasNotText\.filter@hasText/,
		);
	});
});
