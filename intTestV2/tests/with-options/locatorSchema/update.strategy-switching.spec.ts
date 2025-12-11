import { expect, test } from "@fixtures-v2/withOptions";

const path = "body.section" as const;

test("update can switch locator strategies while preserving filters and indices", async ({ page, testFilters }) => {
	const schema = testFilters.getLocatorSchema(path);

	const initialLocator = await schema.getNestedLocator();
	expect(`${initialLocator}`).toEqual("locator('body').locator('section')");

	const manualLocator = page.locator("body").locator("newSelector").filter({ hasText: "Text" }).first();
	const locator = await schema
		.update(path)
		.locator("newSelector")
		.filter(path, { hasText: "Text" })
		.nth(path, 0)
		.getNestedLocator();
	expect(`${locator}`).toEqual(`${manualLocator}`);

	const manualRole = page
		.locator("body")
		.getByRole("region", { name: "Now a region" })
		.filter({ hasText: "Text" })
		.first();
	const role = await schema.update(path).getByRole("region", { name: "Now a region" }).getNestedLocator();
	expect(`${role}`).toEqual(`${manualRole}`);

	const manualText = page.locator("body").getByText("Text node").filter({ hasText: "Text" }).first();
	const text = await schema.update(path).getByText("Text node").getNestedLocator();
	expect(`${text}`).toEqual(`${manualText}`);

	const manualLabel = page.locator("body").getByLabel("Label").filter({ hasText: "Text" }).first();
	const label = await schema.update(path).getByLabel("Label").getNestedLocator();
	expect(`${label}`).toEqual(`${manualLabel}`);

	const manualPlaceholder = page.locator("body").getByPlaceholder("Placeholder").filter({ hasText: "Text" }).first();
	const placeholder = await schema.update(path).getByPlaceholder("Placeholder").getNestedLocator();
	expect(`${placeholder}`).toEqual(`${manualPlaceholder}`);

	const manualAltText = page.locator("body").getByAltText("Alt").filter({ hasText: "Text" }).first();
	const altText = await schema.update(path).getByAltText("Alt").getNestedLocator();
	expect(`${altText}`).toEqual(`${manualAltText}`);

	const manualTitle = page.locator("body").getByTitle("Title").filter({ hasText: "Text" }).first();
	const title = await schema.update(path).getByTitle("Title").getNestedLocator();
	expect(`${title}`).toEqual(`${manualTitle}`);

	const manualFrameLocator = page.locator("body").locator("iframe[name=child]");
	const frameLocator = await schema.update(path).frameLocator("iframe[name=child]").getNestedLocator();
	expect(`${frameLocator}`).toEqual(`${manualFrameLocator}`);

	const manualTestId = page.locator("body").getByTestId("new-test-id").filter({ hasText: "Text" }).first();
	const testId = await schema.update(path).getByTestId("new-test-id").getNestedLocator();
	expect(`${testId}`).toEqual(`${manualTestId}`);

	const manualId = page.locator("body").locator("#new-id").filter({ hasText: "Text" }).first();
	const id = await schema.update(path).getById("new-id").getNestedLocator();
	expect(`${id}`).toEqual(`${manualId}`);

	const manualDataCy = page.locator("body").locator("data-cy=new-cy").filter({ hasText: "Text" }).first();
	const dataCy = await schema.update(path).getByDataCy("new-cy").getNestedLocator();
	expect(`${dataCy}`).toEqual(`${manualDataCy}`);

	const manualReset = page.locator("body").locator("section").filter({ hasText: "Text" }).first();
	const reset = await schema.update(path).locator().getNestedLocator();
	expect(`${reset}`).toEqual(`${manualReset}`);
});
