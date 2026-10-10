import { expect, test } from "@fixtures/testApp.fixtures";

test.beforeEach(async ({ testIds }) => {
	await testIds.page.goto(testIds.fullUrl);
});

test("string ids resolve exactly their own element, verbatim and case-sensitively", async ({ testIds }) => {
	const panel = testIds.getNestedLocator("body.panel@dot");
	await expect(panel).toHaveCount(1);
	await expect(panel).toHaveId("settings.panel");
	await expect(panel).toHaveText("settings panel");

	await expect(testIds.getNestedLocator("body.input@colon")).toHaveValue("colon");
	await expect(testIds.getNestedLocator("body.item@first")).toHaveText("first");

	const cases = [
		["body.p@digit", "digit"],
		["body.p@space", "space"],
		["body.p@quote", "quote"],
		["body.p@backslash", "backslash"],
		["body.p@chain", "chain chars"],
		["body.p@unicode", "unicode"],
	] as const;
	for (const [path, text] of cases) {
		const locator = testIds.getNestedLocator(path);
		await expect(locator, path).toHaveCount(1);
		await expect(locator, path).toHaveText(text);
	}
});

test("ids containing LF, CR and FF resolve", async ({ testIds }) => {
	await expect(testIds.getNestedLocator("body.p@lf")).toHaveText("lf");
	await expect(testIds.getNestedLocator("body.p@cr")).toHaveText("cr");
	await expect(testIds.getNestedLocator("body.p@ff")).toHaveText("ff");
});

test("no prefix handling: '#' and 'id=' are part of the id", async ({ testIds }) => {
	await expect(testIds.getNestedLocator("body.p@literalHash")).toHaveText("no hash");
	await expect(testIds.getNestedLocator("body.p@hash")).toHaveText("hash");
	await expect(testIds.getNestedLocator("body.p@idEq")).toHaveText("id-eq prefix");
});

test("RegExp ids are evaluated as patterns with their flags", async ({ testIds }) => {
	const anchoredNested = testIds.getNestedLocator("body.generated.button@anchored");
	await expect(anchoredNested).toHaveCount(2);
	await expect(anchoredNested).toHaveText(["one", "two"]);

	// terminal-only resolution is page-wide, so the decoy outside the container matches too
	await expect(testIds.getLocator("body.generated.button@anchored")).toHaveCount(3);

	await expect(testIds.getNestedLocator("body.generated.button@prefix")).toHaveCount(3);
	await expect(testIds.getNestedLocator("body.generated.button@second")).toHaveText("two");
	await expect(testIds.getNestedLocator("body.generated.span@unanchored")).toHaveText("four");
	await expect(testIds.getNestedLocator("body.any@settingsInsensitive")).toHaveCount(3);
	await expect(testIds.getNestedLocator("body.any@prefixGlobal")).toHaveCount(4);
});

test("update and replace accept ids verbatim and RegExp ids as patterns", async ({ testIds }) => {
	const second = testIds
		.getLocatorSchema("body.item@first")
		.update("body.item@first")
		.getById("items[1]")
		.getNestedLocator();
	await expect(second).toHaveText("second");

	const both = testIds
		.getLocatorSchema("body.item@first")
		.replace("body.item@first")
		.getById(/^items\[\d\]$/)
		.getNestedLocator();
	await expect(both).toHaveCount(2);
});

test("filter has: works with a reference whose terminal is a RegExp id", async ({ testIds }) => {
	const container = testIds.getNestedLocator("body.div@containsFour");
	await expect(container).toHaveCount(1);
	await expect(container).toHaveId("generated");
});

test("ids inside an open shadow root and inside a frame resolve", async ({ testIds }) => {
	await expect(testIds.getNestedLocator("body.shadow@inOpen")).toHaveText("shadow");
	await expect(testIds.getNestedLocator("body.frame.button@inner")).toHaveText("inner");
});
