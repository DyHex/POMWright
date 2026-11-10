import { test } from "../../fixtures/fixtures";

test("a visitor subscribes to the newsletter", async ({ homePage, testData }) => {
	await homePage.navigation.goto();
	await homePage.subscribe(testData.shop.home.newsletter.email);
	await homePage.expectSubscribed();
});
