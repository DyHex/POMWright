import { GetByMethod, POMWrightGetLocatorBase } from "pomwright";

export type LocatorSchemaPath =
	| "content"
	| "content.heading"
	| "content.region.login"
	| "content.region.login.form"
	| "content.region.login.form.input.username"
	| "content.region.login.form.input.password"
	| "content.region.login.form.error"
	| "content.region.login.form.error.lockout"
	| "content.region.login.form.button.login"
	| "content.region.credentials"
	| "content.region.credentials.usernames"
	| "content.region.credentials.passwords";

export function initLocatorSchemas(locators: POMWrightGetLocatorBase<LocatorSchemaPath>) {
	locators.addSchema("content", {
		locator: ".login_container",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("content.heading", {
		locator: ".login_logo",
		text: "Swag Labs",
		locatorMethod: GetByMethod.text,
	});

	locators.addSchema("content.region.login", {
		locator: ".login_wrapper",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("content.region.login.form", {
		locator: "form",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("content.region.login.form.input.username", {
		role: "textbox",
		roleOptions: {
			name: "Username",
		},
		placeholder: "Username",
		placeholderOptions: {
			exact: true,
		},
		id: "user-name",
		locatorMethod: GetByMethod.role,
	});

	locators.addSchema("content.region.login.form.input.password", {
		role: "textbox",
		roleOptions: {
			name: "Password",
		},
		placeholder: "Password",
		placeholderOptions: {
			exact: true,
		},
		id: "password",
		locatorMethod: GetByMethod.role,
	});

	locators.addSchema("content.region.login.form.error", {
		locator: ".error-message-container",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("content.region.login.form.error.lockout", {
		text: "Epic sadface: Sorry, this user has been locked out.",
		locatorMethod: GetByMethod.text,
	});

	locators.addSchema("content.region.login.form.button.login", {
		role: "button",
		roleOptions: {
			name: "Login",
		},
		id: "login-button",
		locatorMethod: GetByMethod.role,
	});

	locators.addSchema("content.region.credentials", {
		locator: ".login_credentials_wrap",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("content.region.credentials.usernames", {
		locator: ".login_credentials",
		id: "login_credentials",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("content.region.credentials.passwords", {
		locator: ".login_password",
		locatorMethod: GetByMethod.locator,
	});
}
