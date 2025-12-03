import type { LocatorRegistry } from "pomwright";

export type LocatorSchemaPath =
	| "one"
	| "one.two"
	| "body"
	| "body.section"
	| "body.section.heading"
	| "body.section.button"
	| "body.section@playground"
	| "body.section@playground.heading"
	| "body.section@playground.button"
	| "body.section@playground.button@red"
	| "body.section@playground.button@reset"
	/**
	 * Fictional LocatorSchema do not exist in the DOM of the /testfilters page:
	 */
	| "fictional.filter@undefined"
	| "fictional.filter@optionsUndefined"
	| "fictional.locatorWithfilter@allOptions"
	| "fictional.locatorAndOptionsWithfilter@allOptions"
	| "fictional.filter@has"
	| "fictional.filter@hasNot"
	| "fictional.filter@hasText"
	| "fictional.filter@hasNotText"
	| "fictional.filter@hasNotText.filter@hasText"
	| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText"
	| "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText";

export function initLocatorSchemas(locators: LocatorRegistry<LocatorSchemaPath>) {
	locators.add("one").locator("div.one");

	locators.add("one.two").locator("div.two", { filters: { hasText: "two" }, index: 0 });

	locators.add("body").locator("body");

	locators.add("body.section").locator("section");

	locators.add("body.section.heading").getByRole("heading", { level: 2 });

	locators.add("body.section.button").getByRole("button");

	locators.add("body.section@playground").locator("section", { hasText: /Playground/i });

	locators
		.add("body.section@playground.heading")
		.getByRole("heading", { name: "Primary Colors Playground", level: 2, exact: true });

	locators.add("body.section@playground.button").getByRole("button");

	locators.add("body.section@playground.button@red").getByRole("button", { name: "Red" });

	locators.add("body.section@playground.button@reset").getByRole("button", { name: "Reset Color" });

	/** --------------------------- Fictional LocatorSchema ---------------------------
	 * The following LocatorSchema DO NOT exist in the DOM of the /testfilters page
	 *
	 * They are used for testing that the getNestedLocator/getLocator methods correctly
	 * produces correct locator selector strings for LocatorSchema with/without filter.
	 */

	locators.add("fictional.filter@undefined").getByRole("button");

	locators
		.add("fictional.filter@optionsUndefined")
		.getByRole(
			"button",
			{},
			{ filters: { has: undefined, hasNot: undefined, hasText: undefined, hasNotText: undefined } },
		);

	locators.add("fictional.locatorWithfilter@allOptions").getByRole(
		"button",
		{},
		{
			filters: {
				has: { locator: { type: "locator", selector: "section" } },
				hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
				hasText: "hasText",
				hasNotText: "hasNotText",
			},
		},
	);

	locators.add("fictional.locatorAndOptionsWithfilter@allOptions").getByRole(
		"button",
		{ name: "roleOptions" },
		{
			filters: {
				has: { locatorPath: "body.section.heading" },
				hasNot: { locatorPath: "body.section.button" },
				hasText: "hasText",
				hasNotText: "hasNotText",
			},
		},
	);

	locators
		.add("fictional.filter@has")
		.getByRole("button", {}, { filters: { has: { locatorPath: "body.section.heading" } } });

	locators
		.add("fictional.filter@hasNot")
		.getByRole("button", {}, { filters: { hasNot: { locatorPath: "body.section.button" } } });

	locators.add("fictional.filter@hasText").getByRole("button", {}, { filters: { hasText: "hasText" } });

	locators.add("fictional.filter@hasNotText").getByRole("button", {}, { filters: { hasNotText: "hasNotText" } });

	locators.add("fictional.filter@hasNotText.filter@hasText").getByRole(
		"button",
		{},
		{
			filters: { hasText: "hasText" },
		},
	);

	locators.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText").getByRole(
		"button",
		{},
		{
			filters: { hasNotText: "hasNotText" },
		},
	);

	locators.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText").getByRole(
		"button",
		{},
		{
			filters: { hasText: "hasText" },
		},
	);
}
