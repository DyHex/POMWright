import type { LocatorRegistry } from "pomwright";

export type Paths =
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

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("one").locator("div.one");

	registry.add("one.two").locator("div.two").filter({ hasText: "two" }).nth(0);

	registry.add("body").locator("body");

	registry.add("body.section").locator("section");

	registry.add("body.section.heading").getByRole("heading", { level: 2 });

	registry.add("body.section.button").getByRole("button");

	registry.add("body.section@playground").locator("section", { hasText: /Playground/i });

	registry
		.add("body.section@playground.heading")
		.getByRole("heading", { name: "Primary Colors Playground", level: 2, exact: true });

	registry.add("body.section@playground.button").getByRole("button");

	registry.add("body.section@playground.button@red").getByRole("button", { name: "Red" });

	registry.add("body.section@playground.button@reset").getByRole("button", { name: "Reset Color" });

	/** --------------------------- Fictional LocatorSchema ---------------------------
	 * The following LocatorSchema DO NOT exist in the DOM of the /testfilters page
	 *
	 * They are used for testing that the getNestedLocator/getLocator methods correctly
	 * produces correct locator selector strings for LocatorSchema with/without filter.
	 */

	registry.add("fictional.filter@undefined").getByRole("button");

	registry
		.add("fictional.filter@optionsUndefined")
		.getByRole("button")
		.filter({ has: undefined, hasNot: undefined, hasText: undefined, hasNotText: undefined });

	registry
		.add("fictional.locatorWithfilter@allOptions")
		.getByRole("button")
		.filter({
			has: { locator: { type: "locator", selector: "section" } },
			hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
			hasText: "hasText",
			hasNotText: "hasNotText",
		});

	registry
		.add("fictional.locatorAndOptionsWithfilter@allOptions")
		.getByRole("button", { name: "roleOptions" })
		.filter({
			has: { locatorPath: "body.section.heading" },
			hasNot: { locatorPath: "body.section.button" },
			hasText: "hasText",
			hasNotText: "hasNotText",
		});

	registry
		.add("fictional.filter@has")
		.getByRole("button")
		.filter({ has: { locatorPath: "body.section.heading" } });

	registry
		.add("fictional.filter@hasNot")
		.getByRole("button")
		.filter({ hasNot: { locatorPath: "body.section.button" } });

	registry.add("fictional.filter@hasText").getByRole("button").filter({ hasText: "hasText" });

	registry.add("fictional.filter@hasNotText").getByRole("button").filter({ hasNotText: "hasNotText" });

	registry.add("fictional.filter@hasNotText.filter@hasText").getByRole("button").filter({ hasText: "hasText" });

	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByRole("button")
		.filter({ hasNotText: "hasNotText" });

	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" });
}
