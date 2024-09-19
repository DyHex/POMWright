import TestPage from "@page-object-models/testApp/without-options/pages/testPage.page";
import { expect } from "@playwright/test";
import { test as base } from "pomwright";

type fixtures = {
	testPage: TestPage;
};

const test = base.extend<fixtures>({
	testPage: async ({ page, log }, use, testInfo) => {
		const testPage = new TestPage(page, testInfo, log);
		await use(testPage);
	},
});

export { expect, test };
