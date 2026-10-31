import type { LocatorRegistry } from "pomwright";

/**
 * Paths for the /testgetby page: the getBy* strategies that match on text, a label, a placeholder or an alt text, each
 * under the section that holds its elements, against real DOM the test server serves.
 */
export type Paths =
	| "greetings"
	| "greetings.text@exact"
	| "greetings.text@substring"
	| "greetings.text@regex"
	| "greetings.text@second"
	| "account"
	| "account.input@wrappingLabel"
	| "account.input@forLabel"
	| "account.input@ariaLabel"
	| "account.input@labelledBy"
	| "account.input@placeholder"
	| "account.textarea@placeholder"
	| "account.field@lastPlaceholder"
	| "gallery"
	| "gallery.img@exact"
	| "gallery.img@regex";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("greetings").locator("#greetings");
	registry.add("greetings.text@exact").getByText("Welcome", { exact: true });
	registry.add("greetings.text@substring").getByText("welcome");
	registry.add("greetings.text@regex").getByText(/^welcome back/i);
	registry.add("greetings.text@second").getByText("Welcome").nth(1);

	registry.add("account").locator("#account");
	registry.add("account.input@wrappingLabel").getByLabel("Username");
	registry.add("account.input@forLabel").getByLabel("Email", { exact: true });
	registry.add("account.input@ariaLabel").getByLabel("Search");
	registry.add("account.input@labelledBy").getByLabel(/^password$/i);
	registry.add("account.input@placeholder").getByPlaceholder("Enter your name", { exact: true });
	registry.add("account.textarea@placeholder").getByPlaceholder(/comment/);
	registry.add("account.field@lastPlaceholder").getByPlaceholder("Enter").nth("last");

	registry.add("gallery").locator("#gallery");
	registry.add("gallery.img@exact").getByAltText("Nature", { exact: true });
	registry.add("gallery.img@regex").getByAltText(/lights$/i);
}
