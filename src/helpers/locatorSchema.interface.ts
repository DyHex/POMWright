import type { Locator, Page } from "@playwright/test";
export type AriaRoleType = Parameters<Page["getByRole"]>[0];

/**
 * ENUM representing methods from the "GetBy" helper class, used by the "GetLocatorBase" class when building nested locators
 */
export enum GetByMethod {
  role = "role",
  text = "text",
  label = "label",
  placeholder = "placeholder",
  altText = "altText",
  title = "title",
  locator = "locator",
  frameLocator = "frameLocator",
  testId = "testId",
  dataCy = "dataCy",
  id = "id",
}

/**
 * An interface representing a locator object, which can be used with Playwright or other automation tools to create a reusable and maintainable "library" of Locator objects.
 *
 * To make tests resilient, prioritize user-facing attributes and explicit contracts such as role locators (ARIA).
 *
 * @interface
 */
export interface LocatorSchema {
  /** The ARIA role of the element, this is the prefered way to locate and interact with elements, as it is the closest way to how users and assistive technology perceive the page. {@link AriaRole} */
  role?: AriaRoleType;
  /** The options for the role property.*/
  roleOptions?: {
    /** Whether the element is checked, an attribute usually set by aria-checked or native 'input type=checkbox' controls. */
    checked?: boolean;
    /** Whether the element is disabled, an attribute usually set by aria-disabled or disabled. */
    disabled?: boolean;
    /** Whether name is matched exactly. Playwright: case-sensitive and whole-string, still trims whitespace. Ignored when locating by a regular expression.*/
    exact?: boolean;
    /** Whether the element is expanded, an attribute usually set by aria-expanded. */
    expanded?: boolean;
    /** Whether to include/match hidden elements. */
    includeHidden?: boolean;
    /** The level of the element in the accessibility hierarchy, a number attribute that is usually present for roles heading, listitem, row, treeitem, with default values for h1-h6 elements. */
    level?: number;
    /** Option to match the accessible name. Playwright: By default, matching is case-insensitive and searches for a substring, use exact to control this behavior. */
    name?: string | RegExp;
    /** Whether the element is pressed, an attribute usually set by aria-pressed. */
    pressed?: boolean;
    /** Whether the element is selected, an attribute usually set by aria-selected. */
    selected?: boolean;
  };
  /** The text content of the element, allows locating elements that contain given text. */
  text?: string | RegExp;
  /** The options for the text property. */
  textOptions?: {
    /** Whether to match the text content exactly. Playwright: case-sensitive and whole-string, still trims whitespace. Ignored when locating by a regular expression.*/
    exact?: boolean;
  };
  /** Text to locate the element 'for', allows locating input elements by the text of the associated label. */
  label?: string | RegExp;
  /** The options for the label property. */
  labelOptions?: {
    /** Whether to match the text content of the associated label exactly. Playwright: case-sensitive and whole-string, still trims whitespace. Ignored when locating by a regular expression.*/
    exact?: boolean;
  };
  /** The text content of a placeholder element, allows locating input elements by the placeholder text. */
  placeholder?: string | RegExp;
  /** The options for the placeholder property. */
  placeholderOptions?: {
    /** Whether to match the placeholder text content exactly. Playwright: case-sensitive and whole-string, still trims whitespace. Ignored when locating by a regular expression.*/
    exact?: boolean;
  };
  /** The 'alt' text of the element, allows locating elements by their alt text. */
  altText?: string | RegExp;
  /** The options for the altText property. */
  altTextOptions?: {
    /** Whether to match the 'alt' text content exactly. Playwright: case-sensitive and whole-string, still trims whitespace. Ignored when locating by a regular expression.*/
    exact?: boolean;
  };
  /** The title of the element, allows locating elements by their title attribute. */
  title?: string | RegExp;
  /** The options for the altText property. */
  titleOptions?: {
    /** Whether to match the 'title' attribute exactly. Playwright: case-sensitive and whole-string, still trims whitespace. Ignored when locating by a regular expression.*/
    exact?: boolean;
  };
  /** A Playwright Locator, typically used through Playwright's "page.locator()" method */
  locator?: string | Locator;
  /** The options for the locator property */
  locatorOptions?: {
    has?: Locator;
    hasNot?: Locator;
    hasNotText?: string | RegExp;
    hasText?: string | RegExp;
  };
  /** A Playwright FrameLocator, represents a view to an iframe on the page, e.g.: "page.frameLocator('#my-frame')" */
  frameLocator?: string;
  /** The test ID of the element. Playwright default: "data-testid", can be changed by configuring playwright.config.ts. 'testId' string format: "id-value" */
  testId?: string | RegExp;
  /** FOR BACKWARDS COMPATIBILITY ONLY! A custom Selector Engine is implemented in 'base.page.ts' to support the ICE Web-Teams Cypress test ID. 'dataCy' string format: "data-cy=id-value"" */
  dataCy?: string;
  /** The ID of the element. 'id' string format: "value", or a regex expression of the value */
  id?: string | RegExp;
  /** Defines the preferred Playwright locator method to be used on this LocatorSchema Object */
  locatorMethod: GetByMethod;
  /** The human-readable name of the defined locator object, used for debug logging and test report enrichment. */
  locatorSchemaPath: string;
}

/**
 * `locatorSchemaDummy` is a module-scoped, dummy LocatorSchema object.
 * It serves as a template or example of what a typical LocatorSchema object
 * might look like. This object is not exported and thus remains encapsulated
 * within this module, preventing accidental external modifications.
 *
 * The purpose of this dummy object is to provide a reference for valid LocatorSchema
 * properties, particularly useful in functions like deepMerge in GetLocatorBase.
 * It helps in validating properties during dynamic updates and ensures only valid
 * LocatorSchema properties are used.
 *
 * Properties in this dummy object are not intended to be used directly in the application logic.
 * Instead, they serve as a structural reference.
 */
const locatorSchemaDummy: Partial<LocatorSchema> = {
  role: undefined as unknown as AriaRoleType,
  roleOptions: {
    checked: undefined as unknown as boolean,
    disabled: undefined as unknown as boolean,
    exact: undefined as unknown as boolean,
    expanded: undefined as unknown as boolean,
    includeHidden: undefined as unknown as boolean,
    level: undefined as unknown as number,
    name: undefined as unknown as string | RegExp,
    pressed: undefined as unknown as boolean,
    selected: undefined as unknown as boolean,
  },
  text: undefined as unknown as string | RegExp,
  textOptions: {
    exact: undefined as unknown as boolean,
  },
  label: undefined as unknown as string | RegExp,
  labelOptions: {
    exact: undefined as unknown as boolean,
  },
  placeholder: undefined as unknown as string | RegExp,
  placeholderOptions: {
    exact: undefined as unknown as boolean,
  },
  altText: undefined as unknown as string | RegExp,
  altTextOptions: {
    exact: undefined as unknown as boolean,
  },
  title: undefined as unknown as string | RegExp,
  titleOptions: {
    exact: undefined as unknown as boolean,
  },
  locator: undefined as unknown as string | Locator,
  locatorOptions: {
    has: undefined as unknown as Locator,
    hasNot: undefined as unknown as Locator,
    hasNotText: undefined as unknown as string | RegExp,
    hasText: undefined as unknown as string | RegExp,
  },
  frameLocator: undefined as unknown as string,
  testId: undefined as unknown as string | RegExp,
  dataCy: undefined as unknown as string,
  id: undefined as unknown as string | RegExp,
  locatorMethod: undefined as unknown as GetByMethod,
  locatorSchemaPath: undefined as unknown as string,
};

/**
 * `getLocatorSchemaDummy` is a publicly accessible getter function that returns
 * the `locatorSchemaDummy` object. This function allows other modules to access
 * the structure of a typical LocatorSchema object without exposing the object
 * for direct modification. It provides a safe way to reference the dummy object's
 * structure, especially useful for property validation in dynamic contexts.
 *
 * Usage Example:
 *   - In `GetLocatorBase.ts`, use `getLocatorSchemaDummy` within the `deepMerge`
 *     function to validate the keys being merged.
 *   - Useful in scenarios where you need to ensure that the properties being
 *     added or modified in a LocatorSchema are valid and recognized.
 */
export function getLocatorSchemaDummy(): Partial<LocatorSchema> {
  return locatorSchemaDummy;
}
