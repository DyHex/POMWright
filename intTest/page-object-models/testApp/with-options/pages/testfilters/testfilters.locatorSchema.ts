import type { Locator } from "@playwright/test";
import { GetByMethod, type GetLocatorBase, type ModifiedLocatorSchema } from "pomwright";

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

	const bodySectionSchema: ModifiedLocatorSchema = { locator: "section", locatorMethod: GetByMethod.locator };
	locators.addSchema("body.section", bodySectionSchema);

	const bodySectionHeadingSchema: ModifiedLocatorSchema = {
		role: "heading",
		roleOptions: {
			level: 2,
		},
		locatorMethod: GetByMethod.role,
	};
	locators.addSchema("body.section.heading", bodySectionHeadingSchema);

	const bodySectionButtonSchema: ModifiedLocatorSchema = { role: "button", locatorMethod: GetByMethod.role };
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

	const allLocatorTypes: ModifiedLocatorSchema = {
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

	const allLocatorTypesWithOptions: ModifiedLocatorSchema = {
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
