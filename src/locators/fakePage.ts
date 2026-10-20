import type { Page } from "@playwright/test";

/**
 * Test support for the unit tests, never imported by the runtime (so tsup does not bundle it): a page whose
 * locators record the chain they were built from, `locator('ul').getByRole('listitem').nth(0)`, rendering
 * their arguments when they are called, as Playwright serialises them. Resolution against real DOM is
 * covered by the integration specs.
 */
export class FakeLocator {
	constructor(
		readonly chain: string,
		private readonly label: string | null = null,
	) {}

	private next(segment: string): FakeLocator {
		return new FakeLocator(this.chain === "" ? segment : `${this.chain}.${segment}`);
	}

	private call(method: string, args: unknown[]): FakeLocator {
		return this.next(
			`${method}(${args
				.filter((arg) => arg !== undefined)
				.map(render)
				.join(", ")})`,
		);
	}

	locator(...args: unknown[]) {
		return this.call("locator", args);
	}
	frameLocator(...args: unknown[]) {
		return this.call("frameLocator", args);
	}
	getByRole(...args: unknown[]) {
		return this.call("getByRole", args);
	}
	getByText(...args: unknown[]) {
		return this.call("getByText", args);
	}
	getByLabel(...args: unknown[]) {
		return this.call("getByLabel", args);
	}
	getByPlaceholder(...args: unknown[]) {
		return this.call("getByPlaceholder", args);
	}
	getByAltText(...args: unknown[]) {
		return this.call("getByAltText", args);
	}
	getByTitle(...args: unknown[]) {
		return this.call("getByTitle", args);
	}
	getByTestId(...args: unknown[]) {
		return this.call("getByTestId", args);
	}
	filter(...args: unknown[]) {
		return this.call("filter", args);
	}
	/** Renders every index as given, `undefined` included, as Playwright's own `nth` does. */
	nth(index: unknown) {
		return this.next(`nth(${render(index)})`);
	}
	first() {
		return this.next("first()");
	}
	last() {
		return this.next("last()");
	}
	contentFrame() {
		return this.next("contentFrame()");
	}
	describe(description: string) {
		return new FakeLocator(this.chain, description === "" ? null : description);
	}
	description() {
		return this.label;
	}
	toString() {
		return this.chain;
	}
}

const render = (value: unknown): string => {
	if (typeof value === "string") {
		return `'${value}'`;
	}
	if (value instanceof RegExp || value instanceof FakeLocator) {
		return String(value);
	}
	if (typeof value === "object" && value !== null) {
		return `{ ${Object.entries(value)
			.map(([key, item]) => `${key}: ${render(item)}`)
			.join(", ")} }`;
	}
	return String(value);
};

/** A fresh fake page; the chain of every locator built from it starts empty. */
export const createFakePage = (): Page => new FakeLocator("") as unknown as Page;
