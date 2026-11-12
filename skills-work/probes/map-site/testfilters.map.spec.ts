import { test as base, expect } from "@playwright/test";
import { type Paths, TestFiltersPage } from "./testfilters.page";

const test = base.extend<{ testFiltersPage: TestFiltersPage }>({
	testFiltersPage: async ({ page }, use) => {
		await use(new TestFiltersPage(page));
	},
});

const singular: Paths[] = [
	"region@accessible",
	"region@accessible.heading",
	"region@accessible.button@red",
	"region@accessible.button@resetColor",
	"section@primaryColors",
	"section@primaryColors.heading",
	"section@primaryColors.button@red",
];
const plural: Paths[] = ["region@accessible.buttons"];

test("every path of TestFiltersPage matches the page", async ({ testFiltersPage }) => {
	await testFiltersPage.navigation.goto();
	for (const path of singular) {
		await expect(testFiltersPage.getNestedLocator(path), path).toHaveCount(1);
	}
	for (const path of plural) {
		await expect(testFiltersPage.getNestedLocator(path).first(), path).toBeVisible();
	}
});

test("control: without its section, the red button is not one element", async ({ testFiltersPage }) => {
	await testFiltersPage.navigation.goto();
	await expect(testFiltersPage.getLocator("section@primaryColors.button@red")).toHaveCount(4);
});
