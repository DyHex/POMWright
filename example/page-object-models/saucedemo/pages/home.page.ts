import test, { type Page, type TestInfo } from "@playwright/test";
import { POMWrightLogger } from "pomwright";
import Saucedemo, { type UserCredentials } from "../common/base-page/saucedemo.page";
import { type LocatorSchemaPath, initLocatorSchemas } from "./home.locatorSchema";

export default class Home extends Saucedemo<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: POMWrightLogger) {
		super(page, testInfo, "/", Home.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	async fillLoginForm(userCredentials: UserCredentials) {
		await test.step(`${this.pocName}: Fill user login credentials and login`, async () => {
			const username = await this.getNestedLocator("content.region.login.form.input.username");
			await username.fill(userCredentials.username);

			const password = await this.getNestedLocator("content.region.login.form.input.password");
			await password.fill(userCredentials.password);

			const loginButton = await this.getNestedLocator("content.region.login.form.button.login");
			await loginButton.click();
		});
	}

	// add your helper methods here...
}
