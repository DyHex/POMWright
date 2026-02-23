import type { Locator } from "@playwright/test";
import { GetByMethod, type GetLocatorBase, type LocatorRegistry, type LocatorSchemaWithoutPath } from "pomwright";

export type LocatorSchemaPath =
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

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	locators.addSchema("body", {
		locator: "body",
		locatorMethod: GetByMethod.locator,
	});

	const bodySectionSchema: LocatorSchemaWithoutPath = { locator: "section", locatorMethod: GetByMethod.locator };
	locators.addSchema("body.section", bodySectionSchema);

	const bodySectionHeadingSchema: LocatorSchemaWithoutPath = {
		role: "heading",
		roleOptions: {
			level: 2,
		},
		locatorMethod: GetByMethod.role,
	};
	locators.addSchema("body.section.heading", bodySectionHeadingSchema);

	const bodySectionButtonSchema: LocatorSchemaWithoutPath = { role: "button", locatorMethod: GetByMethod.role };
	locators.addSchema("body.section.button", bodySectionButtonSchema);

	locators.addSchema("body.section@playground", {
		...bodySectionSchema,
		filter: { hasText: /Playground/i },
	});

	locators.addSchema("body.section@playground.heading", {
		...bodySectionHeadingSchema,
		roleOptions: {
			name: "Primary Colors Playground",
			level: 2,
			exact: true,
		},
	});

	locators.addSchema("body.section@playground.button", { ...bodySectionButtonSchema });

	locators.addSchema("body.section@playground.button@red", {
		...bodySectionButtonSchema,
		roleOptions: {
			name: "Red",
		},
	});

	locators.addSchema("body.section@playground.button@reset", {
		...bodySectionButtonSchema,
		roleOptions: {
			name: "Reset Color",
		},
	});

	/** --------------------------- Fictional LocatorSchema ---------------------------
	 * The following LocatorSchema DO NOT exist in the DOM of the /testfilters page
	 *
	 * They are used for testing that the getNestedLocator/getLocator methods correctly
	 * produces correct locator selector strings for LocatorSchema with/without filter.
	 */

	const allLocatorTypes: LocatorSchemaWithoutPath = {
		role: "button",
		text: "text",
		label: "label",
		placeholder: "placeholder",
		altText: "altText",
		title: "title",
		locator: "locator",
		frameLocator: 'iframe[title="name"]',
		dataCy: "dataCy",
		testId: "testId",
		id: "id",
		locatorMethod: GetByMethod.role,
	};

	const allLocatorTypesWithOptions: LocatorSchemaWithoutPath = {
		...allLocatorTypes,
		roleOptions: {
			name: "roleOptions",
		},
		textOptions: {
			exact: true,
		},
		labelOptions: {
			exact: true,
		},
		placeholderOptions: {
			exact: true,
		},
		altTextOptions: {
			exact: true,
		},
		titleOptions: {
			exact: true,
		},
		locatorOptions: {
			hasText: "locatorOptionsHasText",
			hasNotText: "locatorOptionshasNotText",
		},
	};

	locators.addSchema("fictional.filter@undefined", {
		...allLocatorTypes,
	});

	locators.addSchema("fictional.filter@optionsUndefined", {
		...allLocatorTypes,
		filter: {
			has: undefined,
			hasNot: undefined,
			hasText: undefined,
			hasNotText: undefined,
		},
	});

	locators.addSchema("fictional.locatorWithfilter@allOptions", {
		...allLocatorTypes,
		filter: {
			has: "has" as unknown as Locator,
			hasNot: "hasNot" as unknown as Locator,
			hasText: "hasText",
			hasNotText: "hasNotText",
		},
	});

	locators.addSchema("fictional.locatorAndOptionsWithfilter@allOptions", {
		...allLocatorTypesWithOptions,
		filter: {
			has: "has" as unknown as Locator,
			hasNot: "hasNot" as unknown as Locator,
			hasText: "hasText",
			hasNotText: "hasNotText",
		},
	});

	locators.addSchema("fictional.filter@has", {
		...allLocatorTypes,
		filter: {
			has: "has" as unknown as Locator,
		},
	});

	locators.addSchema("fictional.filter@hasNot", {
		...allLocatorTypes,
		filter: {
			hasNot: "hasNot" as unknown as Locator,
		},
	});

	locators.addSchema("fictional.filter@hasText", {
		...allLocatorTypes,
		filter: {
			hasText: "hasText",
		},
	});

	locators.addSchema("fictional.filter@hasNotText", {
		...allLocatorTypesWithOptions,
		filter: {
			hasNotText: "hasNotText",
		},
	});

	locators.addSchema("fictional.filter@hasNotText.filter@hasText", {
		...allLocatorTypesWithOptions,
		filter: {
			hasText: "hasText",
		},
	});

	locators.addSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText", {
		...allLocatorTypesWithOptions,
		filter: {
			hasNotText: "hasNotText",
		},
	});

	locators.addSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText", {
		...allLocatorTypesWithOptions,
		filter: {
			hasText: "hasText",
		},
	});
}

export function defineLocators(registry: LocatorRegistry<LocatorSchemaPath>) {
	registry.add("body").locator("body");

	registry.add("body.section").locator("section");

	registry.add("body.section.heading").getByRole("heading", { level: 2 });

	registry.add("body.section.button").getByRole("button");

	registry.add("body.section@playground").locator("section").filter({ hasText: /Playground/i });

	registry
		.add("body.section@playground.heading")
		.getByRole("heading", { name: "Primary Colors Playground", level: 2, exact: true });

	registry.add("body.section@playground.button").getByRole("button");

	registry.add("body.section@playground.button@red").getByRole("button", { name: "Red" });

	registry.add("body.section@playground.button@reset").getByRole("button", { name: "Reset Color" });

	registry.add("fictional.filter@undefined").getByRole("button");

	registry
		.add("fictional.filter@optionsUndefined")
		.getByRole("button")
		.filter({ has: undefined, hasNot: undefined, hasText: undefined, hasNotText: undefined });

	registry
		.add("fictional.locatorWithfilter@allOptions")
		.getByRole("button")
		.filter({
			has: "has" as unknown as Locator,
			hasNot: "hasNot" as unknown as Locator,
			hasText: "hasText",
			hasNotText: "hasNotText",
		});

	registry
		.add("fictional.locatorAndOptionsWithfilter@allOptions")
		.getByRole("button", { name: "roleOptions" })
		.filter({
			has: "has" as unknown as Locator,
			hasNot: "hasNot" as unknown as Locator,
			hasText: "hasText",
			hasNotText: "hasNotText",
		});

	registry
		.add("fictional.filter@has")
		.getByRole("button")
		.filter({ has: "has" as unknown as Locator });

	registry
		.add("fictional.filter@hasNot")
		.getByRole("button")
		.filter({ hasNot: "hasNot" as unknown as Locator });

	registry
		.add("fictional.filter@hasText")
		.getByRole("button")
		.filter({ hasText: "hasText" });

	registry
		.add("fictional.filter@hasNotText")
		.getByRole("button", { name: "roleOptions" })
		.filter({ hasNotText: "hasNotText" });

	registry
		.add("fictional.filter@hasNotText.filter@hasText")
		.getByRole("button", { name: "roleOptions" })
		.filter({ hasText: "hasText" });

	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByRole("button", { name: "roleOptions" })
		.filter({ hasNotText: "hasNotText" });

	registry
		.add("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.getByRole("button", { name: "roleOptions" })
		.filter({ hasText: "hasText" });
}
