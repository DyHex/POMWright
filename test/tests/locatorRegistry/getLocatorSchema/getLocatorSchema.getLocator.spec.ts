import { expect, test } from "@fixtures/testApp.fixtures";

test("getLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getLocator();

	expect(`${updated}`).toEqual("getByRole('heading', { level: 3 })");

	const cleared = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.clearSteps("fictional.filter@hasText")
		.getLocator();

	expect(`${cleared}`).toEqual("getByRole('button')");
});

test("getLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = testFilters.getLocator("body.section.heading");

	expect(`${baseline}`).toEqual("getByRole('heading', { level: 2 })");

	const noArgs = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole()
		.getLocator();

	expect(`${noArgs}`).toEqual("getByRole('heading', { level: 2 })");

	const optionsOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 4 })
		.getLocator();

	expect(`${optionsOnly}`).toEqual("getByRole('heading', { level: 4 })");

	const roleOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading")
		.getLocator();

	expect(`${roleOnly}`).toEqual("getByRole('heading', { level: 2 })");

	const roleAndOptions = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 5 })
		.getLocator();

	expect(`${roleAndOptions}`).toEqual("getByRole('heading', { level: 5 })");
});
