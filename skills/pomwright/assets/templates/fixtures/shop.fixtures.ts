import { test as base } from "pomwright";
import { HomePage } from "../page-objects/shop/pages/home.page";

export type ShopFixtures = { homePage: HomePage };

/** The shop's page objects, one fixture each, created for each test that asks for them. */
export const test = base.extend<ShopFixtures>({
	homePage: async ({ page }, use) => {
		await use(new HomePage(page));
	},
});
