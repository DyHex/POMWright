import { expect, test } from "@fixtures-v2/withOptions";

test("getLocatorSchema.addFilter should throw for invalid sub-paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
			.addFilter("fictional.filter@missing", { hasText: "nope" })
			.getNestedLocator();
	}).rejects.toThrow(
		'"fictional.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText"',
	);
});

test("getLocatorSchema.update should reject invalid segments", ({ testFilters }) => {
	expect(() =>
		testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
			.update("fictional.filter@missing", { type: "text", text: "nope" }),
	).toThrow('"fictional.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText"');
});

test.describe("getNestedLocator sub-path overrides", () => {
	const expectedChain =
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).nth(2).getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })";

	test("nestedLocator applies overrides", async ({ testFilters }) => {
		const locator = await testFilters.getNestedLocator(
			"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
			{
				"fictional.filter@hasNotText": 2,
			},
		);

		expect(`${locator}`).toContain(".nth(2)");
		expect(`${locator}`).toEqual(expectedChain);
	});

	test("query.getNestedLocator applies overrides", async ({ testFilters }) => {
		const locator = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.getNestedLocator({ "fictional.filter@hasNotText": 2 });

		expect(`${locator}`).toContain(".nth(2)");
		expect(`${locator}`).toEqual(expectedChain);
	});

	test("nth supports first/last/index helpers while updating the chain", async ({ testFilters }) => {
		const nthLocator = await testFilters
			.getLocatorSchema("body.section.button")
			.nth("body.section.button", 1)
			.getNestedLocator();

		expect(`${nthLocator}`).toEqual("locator('body').locator('section').getByRole('button').nth(1)");

		const firstLocator = await testFilters
			.getLocatorSchema("body.section.button")
			.nth("body.section.button", "first")
			.getNestedLocator();

		expect(`${firstLocator}`).toEqual("locator('body').locator('section').getByRole('button').first()");

		const lastLocator = await testFilters
			.getLocatorSchema("body.section.button")
			.nth("body.section.button", "last")
			.getNestedLocator();

		expect(`${lastLocator}`).toEqual("locator('body').locator('section').getByRole('button').last()");
	});

	test("query.getNestedLocator rejects unknown sub-path overrides", async ({ testFilters }) => {
		await expect(async () => {
			await testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.getNestedLocator({ "fictional.filter@has": 1 });
		}).rejects.toThrow(
			'Missing locator definition for "fictional.filter@has" while resolving "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
		);
	});

	test("getNestedLocator requires registered override paths", async ({ testFilters }) => {
		await expect(async () => {
			await testFilters.getNestedLocator(
				"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
				{ fictional: 1 },
			);
		}).rejects.toThrow(
			'Missing locator definition for "fictional" while resolving "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
		);
	});

	test("getNestedLocator maps negative indexes to last()", async ({ testFilters }) => {
		const locator = await testFilters.getNestedLocator(
			"fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText",
			{
				"fictional.filter@hasNotText": -1,
			},
		);

		expect(`${locator}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).last().getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })",
		);
	});

	test("query.getNestedLocator rejects unregistered sub-paths", async ({ testFilters }) => {
		await expect(async () => {
			await testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
				.getNestedLocator({ fictional: 1 });
		}).rejects.toThrow(
			'Missing locator definition for "fictional" while resolving "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
		);
	});
});

test.describe("update", () => {
	test("update replaces intermediate definitions without mutating registry", async ({ testFilters }) => {
		const original = await testFilters.getNestedLocator("body.section.heading");
		expect(`${original}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

		const replaced = await testFilters
			.getLocatorSchema("body.section.heading")
			.update("body.section", {
				type: "role",
				role: "heading",
				options: { level: 1 },
			})
			.getNestedLocator();

		expect(`${replaced}`).toEqual(
			"locator('body').getByRole('heading', { level: 1 }).getByRole('heading', { level: 2 })",
		);

		const after = await testFilters.getNestedLocator("body.section.heading");
		expect(`${after}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");
	});

	test("chainable update operations", async ({ testFilters }) => {
		const chained = await testFilters
			.getLocatorSchema("body.section")
			.update("body", { type: "locator", selector: "SOMEBODY" })
			.update("body.section", {
				type: "role",
				role: "button",
				options: { name: "Click me!" },
			})
			.getNestedLocator();

		expect(`${chained}`).toEqual("locator('SOMEBODY').getByRole('button', { name: 'Click me!' })");
	});

	test("update merges options", async ({ testFilters }) => {
		const merged = await testFilters
			.getLocatorSchema("body.section.heading")
			.update("body.section.heading", { options: { name: "HEADING TEXT" } })
			.getNestedLocator();

		expect(`${merged}`).toEqual(
			"locator('body').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
		);
	});

	test("update handles full and partial definitions from fresh builders", async ({ testFilters }) => {
		const full = await testFilters
			.getLocatorSchema("body.section.heading")
			.update("body.section.heading", {
				type: "role",
				role: "heading",
				options: { level: 3 },
			})
			.getNestedLocator();

		const partial = await testFilters
			.getLocatorSchema("body.section.heading")
			.update("body.section.heading", { options: { level: 3 } })
			.getNestedLocator();

		expect(`${full}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
		expect(`${partial}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
		expect(full).not.toBe(partial);
	});

	test("update rejects missing sub-paths", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema("body.section.heading")
				.update("body.section.missing", { type: "locator", selector: "noop" }),
		).toThrow('"body.section.missing" is not a valid sub-path of "body.section.heading"');
	});

	test("update can be chained across sub-paths without mutating registry", async ({ testFilters }) => {
		const original = await testFilters.getNestedLocator("body.section.heading");

		const chained = await testFilters
			.getLocatorSchema("body.section.heading")
			.update("body", { selector: "SOMEBODY" })
			.update("body.section.heading", { options: { name: "HEADING TEXT" } })
			.getNestedLocator();

		expect(`${chained}`).toEqual(
			"locator('SOMEBODY').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
		);

		const after = await testFilters.getNestedLocator("body.section.heading");
		expect(`${after}`).toEqual(`${original}`);
	});
});

test.describe("addFilter", () => {
	test("addFilter adds additional filters per sub-path", async ({ testFilters }) => {
		const filtered = await testFilters
			.getLocatorSchema("body.section")
			.addFilter("body", { hasText: "Playground" })
			.addFilter("body.section", { hasText: "Primary Colors Playground" })
			.getNestedLocator();

		expect(`${filtered}`).toEqual(
			"locator('body').filter({ hasText: 'Playground' }).locator('section').filter({ hasText: 'Primary Colors Playground' })",
		);
	});

	test("addFilter with has locator", async ({ testFilters }) => {
		const heading = await testFilters.getLocator("body.section.heading");

		const filtered = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.addFilter("fictional.filter@hasNotText", { has: heading })
			.getNestedLocator();

		expect(`${filtered}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
		);
	});

	test("addFilter chaining is non-destructive", async ({ testFilters }) => {
		const base = await testFilters.getNestedLocator("body.section");

		const filtered = await testFilters
			.getLocatorSchema("body.section")
			.addFilter("body.section", { hasText: /Playground/i })
			.getNestedLocator();

		expect(`${filtered}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

		const unchanged = await testFilters.getNestedLocator("body.section");
		expect(`${unchanged}`).toEqual(`${base}`);
	});

	test("addFilter rejects unknown root-level sub-paths", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
				.addFilter("fictional", { hasText: "something" }),
		).toThrow('"fictional" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText".');
	});

	test("addFilter rejects invalid intermediate sub-paths", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
				.addFilter("fictional.filter@hasNotText.filter@missing", {
					hasText: "something",
				}),
		).toThrow(
			'"fictional.filter@hasNotText.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText.filter@hasNotText".',
		);
	});
});

test("nestedLocator overrides require known sub-paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters.getNestedLocator("fictional.filter@hasNotText.filter@hasText", {
			"fictional.filter@has": 1,
		});
	}).rejects.toThrow(/Missing locator definition/);
});

test("update accepts intermediate sub-paths and keeps existing filters", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText", {
			type: "role",
			role: "button",
			options: { name: "roleOptions" },
		})
		.update("fictional.filter@hasNotText.filter@hasText", {
			type: "locator",
			selector: "locator",
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'hasText' })",
	);
});
