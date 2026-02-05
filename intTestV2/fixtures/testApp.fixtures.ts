import IframePage from "@page-object-models-v2/testApp/pages/iframe/iframe.page";
import TestFilters from "@page-object-models-v2/testApp/pages/testfilters/testfilters.page";
import TestPage from "@page-object-models-v2/testApp/pages/testPage.page";
import Color from "@page-object-models-v2/testApp/pages/testPath/[color]/color.page";
import TestPath from "@page-object-models-v2/testApp/pages/testPath/testPath.page";
import { expect } from "@playwright/test";
import { test as base } from "pomwright";

type Fixtures = {
	iframePage: IframePage;
	testPage: TestPage;
	testPath: TestPath;
	color: Color;
	testFilters: TestFilters;
};

const test = base.extend<Fixtures>({
	iframePage: async ({ page }, use) => {
		const iframePage = new IframePage(page);
		await use(iframePage);
	},
	testPage: async ({ page }, use) => {
		const testPage = new TestPage(page);
		await use(testPage);
	},

	testPath: async ({ page }, use) => {
		const testPath = new TestPath(page);
		await use(testPath);
	},

	color: async ({ page }, use) => {
		const color = new Color(page);
		await use(color);
	},

	testFilters: async ({ page }, use) => {
		const testFilters = new TestFilters(page);
		await use(testFilters);
	},
});

export { expect, test };
