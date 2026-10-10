import IframePage from "@page-object-models/testApp/pages/iframe/iframe.page";
import TestFilters from "@page-object-models/testApp/pages/testfilters/testfilters.page";
import TestIds from "@page-object-models/testApp/pages/testids/testids.page";
import TestNav from "@page-object-models/testApp/pages/testnav/testnav.page";
import TestNavItem from "@page-object-models/testApp/pages/testnav/testnav-item.page";
import TestPage from "@page-object-models/testApp/pages/testPage.page";
import TestStorage from "@page-object-models/testApp/pages/teststorage/teststorage.page";
import TestStorageSecond from "@page-object-models/testApp/pages/teststorage/teststorage-second.page";
import Color from "@page-object-models/testApp/pages/testPath/[color]/color.page";
import TestPath from "@page-object-models/testApp/pages/testPath/testPath.page";
import { expect } from "@playwright/test";
import { test as base } from "pomwright";

type Fixtures = {
	iframePage: IframePage;
	testPage: TestPage;
	testPath: TestPath;
	color: Color;
	testFilters: TestFilters;
	testIds: TestIds;
	testNav: TestNav;
	testNavItem: TestNavItem;
	testStorage: TestStorage;
	testStorageTwin: TestStorage;
	testStorageSecond: TestStorageSecond;
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

	testIds: async ({ page }, use) => {
		const testIds = new TestIds(page);
		await use(testIds);
	},

	testNav: async ({ page }, use) => {
		await use(new TestNav(page));
	},

	testNavItem: async ({ page }, use) => {
		await use(new TestNavItem(page));
	},

	testStorage: async ({ page }, use) => {
		await use(new TestStorage(page));
	},

	testStorageTwin: async ({ page }, use) => {
		await use(new TestStorage(page, { label: "TestStorageTwin" }));
	},

	testStorageSecond: async ({ page }, use) => {
		await use(new TestStorageSecond(page));
	},
});

export { expect, test };
