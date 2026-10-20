import { test as base } from "pomwright";
import { AccountPage } from "./account.page";
import { CheckoutPage } from "./checkout.page";
import { LoginPage } from "./login.page";

export { expect } from "@playwright/test";

type PageObjects = {
	loginPage: LoginPage;
	accountPage: AccountPage;
	checkoutPage: CheckoutPage;
};

export const test = base.extend<PageObjects>({
	loginPage: async ({ page }, use) => {
		await use(new LoginPage(page));
	},
	accountPage: async ({ page }, use) => {
		await use(new AccountPage(page));
	},
	checkoutPage: async ({ page }, use) => {
		await use(new CheckoutPage(page));
	},
});
