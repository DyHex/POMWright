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

test("RegExp ids in unicode mode find an id with a quote, an apostrophe, a backtick or >>", async ({ testIds }) => {
	for (const [path, text] of [
		["body.p@quoteUnicode", "quote"],
		["body.p@apostropheUnicodeSets", "apostrophe"],
		["body.p@backtickUnicode", "backtick"],
		["body.p@chainUnicode", "chain chars"],
	] as const) {
		await expect(testIds.getNestedLocator(path), path).toHaveText(text);
		await expect(testIds.getLocator(path), path).toHaveText(text);
	}
});

test("RegExp ids with an escaped backtick, two quotes in a row, \\> before > or a group closed before > find their id", async ({
	testIds,
}) => {
	for (const [path, text] of [
		["body.p@backtickEscapedUnicodeSets", "backtick"],
		["body.p@quotePair", "quote"],
		["body.p@chainEscapedGt", "chain chars"],
		["body.p@chainNamedGroup", "chain chars"],
	] as const) {
		await expect(testIds.getNestedLocator(path), path).toHaveText(text);
		await expect(testIds.getLocator(path), path).toHaveText(text);
	}
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

test("the sticky flag is a start anchor against DOM", async ({ testIds }) => {
	// Playwright resets the regex state per element from 1.64.0, the peer floor, so /^gen/y and /gen/y both
	// match only an id that starts with "gen", and /en/y (sticky at index 0) matches nothing.
	const container = testIds.getLocatorSchema("body.item@first").update("body.item@first").getById(/^gen/y).getLocator();
	await expect(container).toHaveCount(1);
	await expect(container).toHaveId("generated");

	const unanchoredSticky = testIds
		.getLocatorSchema("body.item@first")
		.update("body.item@first")
		.getById(/gen/y)
		.getLocator();
	await expect(unanchoredSticky).toHaveId("generated");

	const inner = testIds.getLocatorSchema("body.item@first").update("body.item@first").getById(/en/y).getLocator();
	await expect(inner).toHaveCount(0);
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
