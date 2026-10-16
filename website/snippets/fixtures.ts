import { test as base } from "pomwright";
import { LoginPage } from "./login.page";

export { expect } from "@playwright/test";

export const test = base.extend<{ loginPage: LoginPage }>({
	loginPage: async ({ page }, use) => {
		await use(new LoginPage(page));
	},
});
