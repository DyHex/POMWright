import { expect } from "@playwright/test";
import { test as base } from "pomwright";
import TestPage from "../page-object-models/testPage/testPage.page";

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
