import { expect, test } from "@fixtures-v2/withOptions";

test("query.filter should throw for invalid sub-paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters
			.query("fictional.filter@hasNotText.filter@hasText")
			.filter("fictional.filter@missing", { hasText: "nope" })
			.getNestedLocator();
	}).rejects.toThrow(
		'"fictional.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText"',
	);
});

test("query.replace should reject invalid segments", ({ testFilters }) => {
	expect(() =>
		testFilters
			.query("fictional.filter@hasNotText.filter@hasText")
			.replace("fictional.filter@missing", { type: "text", text: "nope" }),
	).toThrow('"fictional.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText"');
});

test("nestedLocator overrides require known sub-paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters.nestedLocator("fictional.filter@hasNotText.filter@hasText", {
			"fictional.filter@has": 1,
		});
	}).rejects.toThrow(/Missing locator definition/);
});

test("replace accepts intermediate sub-paths and keeps existing filters", async ({ testFilters }) => {
	const locator = await testFilters
		.query("fictional.filter@hasNotText.filter@hasText")
		.replace("fictional.filter@hasNotText", {
			type: "role",
			role: "button",
			options: { name: "roleOptions" },
		})
		.replace("fictional.filter@hasNotText.filter@hasText", {
			type: "locator",
			selector: "locator",
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'hasText' })",
	);
});
