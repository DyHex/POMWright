import { type Page, type TestInfo } from "@playwright/test";
import { BasePage, PlaywrightReportLogger } from "pomwright";

export type UserCredentials = { username: string; password: string };

export default abstract class Saucedemo<LocatorSchemaPathType extends string> extends BasePage<LocatorSchemaPathType> {
	constructor(page: Page, testInfo: TestInfo, urlPath: string, pocName: string, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, process.env.BASE_URL_SAUCEDEMO || "", urlPath, pocName, pwrl);
	}

	getTestData() {
		const passordForAllUsers = "secret_sauce";
		return {
			user: {
				standard: {
					username: "standard_user",
					password: passordForAllUsers,
				} as UserCredentials,
				lockedOut: {
					username: "locked_out_user",
					password: passordForAllUsers,
				} as UserCredentials,
			},
		};
	}

	// add your common helper methods here...
}
