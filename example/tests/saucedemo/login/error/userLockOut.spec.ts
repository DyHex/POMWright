import { expect } from "@playwright/test";
import { test } from "../../../../fixtures/all.fixtures";

test("locked-out user should not be able to login", async ({ sdHome }) => {
	await sdHome.page.goto(sdHome.fullUrl);

	await sdHome.fillLoginForm(sdHome.getTestData().user.lockedOut);

	const errorMessage = await sdHome.getNestedLocator("content.region.login.form.error.lockout");
	await expect(errorMessage).toBeVisible();
});
