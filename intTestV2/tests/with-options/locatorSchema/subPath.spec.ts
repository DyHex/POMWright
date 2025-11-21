import { expect, test } from "@fixtures-v2/withOptions";

const chainedPath = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText" as const;

test.describe("sub-path validation", () => {
	test("addFilter rejects invalid root-level sub-paths", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
				.addFilter("fictional", { hasText: "nope" }),
		).toThrow('"fictional" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText".');
	});

	test("addFilter rejects invalid intermediate sub-paths", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema(chainedPath)
				.addFilter("fictional.filter@hasNotText.filter@missing", { hasText: "nope" }),
		).toThrow(
			'"fictional.filter@hasNotText.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
		);
	});

	test("update rejects missing/invalid subPaths", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
				.update("fictional.filter@missing", { type: "text", text: "nope" }),
		).toThrow('"fictional.filter@missing" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText".');
	});

	test("update rejects a valid LocatorSchemaPath when it's an invalid subPath", ({ testFilters }) => {
		expect(() =>
			testFilters
				.getLocatorSchema("body.section.heading")
				.update("body.section.button", { type: "locator", selector: "noop" }),
		).toThrow('"body.section.button" is not a valid sub-path of "body.section.heading"');
	});
});
