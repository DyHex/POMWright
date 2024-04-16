import { type Page, type TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, PlaywrightReportLogger } from "../index";

export type LocatorSchemaPath =
	| "getByRole"
	| "getByRoleWithOptions"
	| "getByText"
	| "getByTextWithOptions"
	| "getByLabel"
	| "getByLabelWithOptions"
	| "getByPlaceholder"
	| "getByPlaceholderWithOptions"
	| "getByAltText"
	| "getByAltTextWithOptions"
	| "getByTitle"
	| "getByTitleWithOptions"
	| "getByLocator"
	| "getByLocatorWithOptions"
	| "getByFrameLocator"
	| "getByTestId"
	| "getByDataCy"
	| "getById"
	| "minimumLocatorSchema"
	| "maximumLocatorSchema"
	| "null.locator"
	| "null.null.locator"
	| "locator"
	| "locator.null.locator"
	| "locator.null.null.locator"
	| "id"
	| "id.dataCy"
	| "id.dataCy.testId"
	| "id.dataCy.testId.locator"
	| "id.dataCy.testId.locator.title"
	| "id.dataCy.testId.locator.title.altText"
	| "id.dataCy.testId.locator.title.altText.placeholder"
	| "id.dataCy.testId.locator.title.altText.placeholder.label"
	| "id.dataCy.testId.locator.title.altText.placeholder.label.text"
	| "id.dataCy.testId.locator.title.altText.placeholder.label.text.role";

export class POC extends BasePage<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "http://localhost:8080", "/", POC.name, pwrl);
	}

	protected initLocatorSchemas() {
		this.locators.addSchema("getByRole", {
			role: "button",
			locatorMethod: GetByMethod.role,
		});

		this.locators.addSchema("getByRoleWithOptions", {
			role: "button",
			roleOptions: { name: "button", exact: true },
			locatorMethod: GetByMethod.role,
		});

		this.locators.addSchema("getByText", {
			text: "text",
			locatorMethod: GetByMethod.text,
		});

		this.locators.addSchema("getByTextWithOptions", {
			text: "text",
			textOptions: { exact: true },
			locatorMethod: GetByMethod.text,
		});

		this.locators.addSchema("getByLabel", {
			label: "label",
			locatorMethod: GetByMethod.label,
		});

		this.locators.addSchema("getByLabelWithOptions", {
			label: "label",
			labelOptions: { exact: true },
			locatorMethod: GetByMethod.label,
		});

		this.locators.addSchema("getByPlaceholder", {
			placeholder: "placeholder",
			locatorMethod: GetByMethod.placeholder,
		});

		this.locators.addSchema("getByPlaceholderWithOptions", {
			placeholder: "placeholder",
			placeholderOptions: { exact: true },
			locatorMethod: GetByMethod.placeholder,
		});

		this.locators.addSchema("getByAltText", {
			altText: "altText",
			locatorMethod: GetByMethod.altText,
		});

		this.locators.addSchema("getByAltTextWithOptions", {
			altText: "altText",
			altTextOptions: { exact: true },
			locatorMethod: GetByMethod.altText,
		});

		this.locators.addSchema("getByTitle", {
			title: "title",
			locatorMethod: GetByMethod.title,
		});

		this.locators.addSchema("getByTitleWithOptions", {
			title: "title",
			titleOptions: { exact: true },
			locatorMethod: GetByMethod.title,
		});

		this.locators.addSchema("getByLocator", {
			locator: ".class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("getByLocatorWithOptions", {
			locator: ".class",
			locatorOptions: { hasText: "text" },
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("getByFrameLocator", {
			frameLocator: 'iframe[title="frame"]',
			locatorMethod: GetByMethod.frameLocator,
		});

		this.locators.addSchema("getByTestId", {
			testId: "testId",
			locatorMethod: GetByMethod.testId,
		});

		this.locators.addSchema("getByDataCy", {
			dataCy: "dataCy",
			locatorMethod: GetByMethod.dataCy,
		});

		this.locators.addSchema("getById", {
			id: "id",
			locatorMethod: GetByMethod.id,
		});

		this.locators.addSchema("minimumLocatorSchema", {
			// will throw an error during runtime since locator is undefined
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("maximumLocatorSchema", {
			role: "button",
			roleOptions: { name: "button", exact: true },
			text: "text",
			textOptions: { exact: true },
			label: "label",
			labelOptions: { exact: true },
			placeholder: "placeholder",
			placeholderOptions: { exact: true },
			altText: "altText",
			altTextOptions: { exact: true },
			title: "title",
			titleOptions: { exact: true },
			locator: ".class",
			locatorOptions: { hasText: "text" },
			frameLocator: 'iframe[title="frame"]',
			testId: "testId",
			dataCy: "dataCy",
			id: "id",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("null.locator", {
			locator: "button .class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("null.null.locator", {
			locator: "button .class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("locator", {
			locator: "button .class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("locator.null.locator", {
			locator: "button .class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("locator.null.null.locator", {
			locator: "button .class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("id", {
			id: "id",
			locatorMethod: GetByMethod.id,
		});

		this.locators.addSchema("id.dataCy", {
			dataCy: "dataCy",
			locatorMethod: GetByMethod.dataCy,
		});

		this.locators.addSchema("id.dataCy.testId", {
			testId: "testId",
			locatorMethod: GetByMethod.testId,
		});

		this.locators.addSchema("id.dataCy.testId.locator", {
			locator: ".class",
			locatorMethod: GetByMethod.locator,
		});

		this.locators.addSchema("id.dataCy.testId.locator.title", {
			title: "title",
			locatorMethod: GetByMethod.title,
		});

		this.locators.addSchema("id.dataCy.testId.locator.title.altText", {
			altText: "altText",
			locatorMethod: GetByMethod.altText,
		});

		this.locators.addSchema("id.dataCy.testId.locator.title.altText.placeholder", {
			placeholder: "placeholder",
			locatorMethod: GetByMethod.placeholder,
		});

		this.locators.addSchema("id.dataCy.testId.locator.title.altText.placeholder.label", {
			label: "label",
			locatorMethod: GetByMethod.label,
		});

		this.locators.addSchema("id.dataCy.testId.locator.title.altText.placeholder.label.text", {
			text: "text",
			locatorMethod: GetByMethod.text,
		});

		this.locators.addSchema("id.dataCy.testId.locator.title.altText.placeholder.label.text.role", {
			role: "button",
			locatorMethod: GetByMethod.role,
		});
	}
}
