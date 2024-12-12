import TestPage from "@page-object-models/testApp/with-options/pages/testPage.page";
import Color from "@page-object-models/testApp/with-options/pages/testPath/[color]/color.page";
import TestPath from "@page-object-models/testApp/with-options/pages/testPath/testPath.page";
import TestFilters from "@page-object-models/testApp/with-options/pages/testfilters/testfilters.page";
import { expect } from "@playwright/test";
import { test as base } from "pomwright";

type fixtures = {
	testPage: TestPage;
	testPath: TestPath;
	color: Color;
	testFilters: TestFilters;
};

const test = base.extend<fixtures>({
	testPage: async ({ page, log }, use, testInfo) => {
		const testPage = new TestPage(page, testInfo, log);
		await use(testPage);
	},

	testPath: async ({ page, log }, use, testInfo) => {
		const testPath = new TestPath(page, testInfo, log);
		await use(testPath);
	},

	color: async ({ page, log }, use, testInfo) => {
		const color = new Color(page, testInfo, log);
		await use(color);
	},

	testFilters: async ({ page, log }, use, testInfo) => {
		const testFilters = new TestFilters(page, testInfo, log);
		await use(testFilters);
	},
});

export { expect, test };
