import type { Page } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import { LocatorRegistryInternal } from "./locatorRegistry";
import {
	buildReplacementDefinition,
	mergeLocatorDefinition,
	mergeOptions,
	parseUpdateArguments,
} from "./locatorUpdateBuilder";
import type { LocatorStrategyDefinition, LocatorUpdate, OptionsPatch } from "./types";
import { methodForStrategy } from "./utils";

describe("parseUpdateArguments", () => {
	it("tells the primary from the options and treats undefined as not provided", () => {
		expect(parseUpdateArguments("button")).toEqual({ primary: "button", options: undefined, hasOptions: false });
		expect(parseUpdateArguments("button", undefined)).toEqual({
			primary: "button",
			options: undefined,
			hasOptions: false,
		});
		expect(parseUpdateArguments("button", null)).toEqual({ primary: "button", options: null, hasOptions: true });
		expect(parseUpdateArguments("button", { name: "x" })).toEqual({
			primary: "button",
			options: { name: "x" },
			hasOptions: true,
		});
		expect(parseUpdateArguments({ name: "x" })).toEqual({
			primary: undefined,
			options: { name: "x" },
			hasOptions: true,
		});
		expect(parseUpdateArguments(null)).toEqual({ primary: undefined, options: null, hasOptions: true });
		expect(parseUpdateArguments(undefined, { name: "x" })).toEqual({
			primary: undefined,
			options: { name: "x" },
			hasOptions: true,
		});
		expect(parseUpdateArguments(undefined, undefined)).toEqual({
			primary: undefined,
			options: undefined,
			hasOptions: false,
		});
		expect(parseUpdateArguments()).toEqual({ primary: undefined, options: undefined, hasOptions: false });
		const pattern = /re/;
		expect(parseUpdateArguments(pattern)).toEqual({ primary: pattern, options: undefined, hasOptions: false });
		expect(parseUpdateArguments("")).toEqual({ primary: "", options: undefined, hasOptions: false });
	});
});

describe("mergeOptions (JSON Merge Patch)", () => {
	const current = { name: "Login", exact: true };

	it("leaves the options alone for an absent patch and deletes them all for null", () => {
		expect(mergeOptions(current, undefined)).toEqual(current);
		expect(mergeOptions(current, null)).toBeUndefined();
		expect(mergeOptions(undefined, undefined)).toBeUndefined();
	});

	it("deletes a null key, skips an undefined key, and replaces any other value", () => {
		expect(mergeOptions(current, { name: null })).toEqual({ exact: true });
		expect(mergeOptions(current, { name: undefined })).toEqual(current);
		expect(mergeOptions(current, { name: "Save" })).toEqual({ name: "Save", exact: true });
		expect(mergeOptions(current, { name: null, exact: false, level: 2 } as OptionsPatch<typeof current>)).toEqual({
			exact: false,
			level: 2,
		});
		expect(mergeOptions(undefined, { name: "Save" })).toEqual({ name: "Save" });
	});

	it("drops the options entirely when nothing remains", () => {
		expect(mergeOptions({ name: "Login" }, { name: null })).toBeUndefined();
		expect(mergeOptions(undefined, { name: null })).toBeUndefined();
		expect(mergeOptions(undefined, {})).toBeUndefined();
	});

	it("does not mutate the current options", () => {
		const frozen = Object.freeze({ name: "Login", exact: true });
		expect(mergeOptions(frozen, { name: null })).toEqual({ exact: true });
		expect(frozen).toEqual({ name: "Login", exact: true });
	});
});

describe("mergeLocatorDefinition (update)", () => {
	const role: LocatorStrategyDefinition = { type: "role", role: "button", options: { name: "Login", exact: true } };

	it("keeps the primary when none is given and replaces it when given", () => {
		expect(mergeLocatorDefinition(role, { type: "role" }, "p")).toEqual(role);
		expect(mergeLocatorDefinition(role, { type: "role", role: "link" }, "p")).toEqual({
			type: "role",
			role: "link",
			options: { name: "Login", exact: true },
		});
		expect(mergeLocatorDefinition({ type: "text", text: "a" }, { type: "text", text: "" }, "p")).toEqual({
			type: "text",
			text: "",
		});
		expect(mergeLocatorDefinition({ type: "testId", testId: "a" }, { type: "testId", testId: "" }, "p")).toEqual({
			type: "testId",
			testId: "",
		});
	});

	it("merges the options and drops them when nothing remains", () => {
		expect(mergeLocatorDefinition(role, { type: "role", options: { name: "Save" } }, "p")).toEqual({
			type: "role",
			role: "button",
			options: { name: "Save", exact: true },
		});
		expect(mergeLocatorDefinition(role, { type: "role", options: { name: null } }, "p")).toEqual({
			type: "role",
			role: "button",
			options: { exact: true },
		});
		expect(mergeLocatorDefinition(role, { type: "role", options: null }, "p")).toEqual({
			type: "role",
			role: "button",
		});
		expect(mergeLocatorDefinition(role, { type: "role", options: { name: undefined } }, "p")).toEqual(role);
		expect(
			mergeLocatorDefinition(
				{ type: "locator", selector: "li", options: { hasText: "x" } },
				{ type: "locator", options: { hasText: null } },
				"p",
			),
		).toEqual({ type: "locator", selector: "li" });
	});

	it("keeps a frame segment's form: a selector inherits, the any-frame form stays any-frame", () => {
		expect(mergeLocatorDefinition({ type: "frameLocator", selector: "iframe" }, { type: "frameLocator" }, "p")).toEqual(
			{
				type: "frameLocator",
				selector: "iframe",
			},
		);
		expect(mergeLocatorDefinition({ type: "frameLocator" }, { type: "frameLocator" }, "p")).toEqual({
			type: "frameLocator",
		});
		expect(mergeLocatorDefinition({ type: "frameLocator" }, { type: "frameLocator", selector: "x" }, "p")).toEqual({
			type: "frameLocator",
			selector: "x",
		});
	});

	it("throws for another strategy, naming replace() and its method, for every pair", () => {
		const definitions: LocatorStrategyDefinition[] = [
			{ type: "role", role: "button" },
			{ type: "text", text: "t" },
			{ type: "label", text: "t" },
			{ type: "placeholder", text: "t" },
			{ type: "altText", text: "t" },
			{ type: "title", text: "t" },
			{ type: "locator", selector: "s" },
			{ type: "frameLocator", selector: "s" },
			{ type: "testId", testId: "t" },
			{ type: "id", id: "i" },
		];
		for (const current of definitions) {
			for (const target of definitions) {
				if (target.type === current.type) {
					continue;
				}
				expect(() => mergeLocatorDefinition(current, { type: target.type } as LocatorUpdate, "list.item")).toThrowError(
					`update("list.item") cannot change the strategy from "${current.type}" to "${target.type}"; use replace("list.item").${methodForStrategy[target.type]}(…) instead.`,
				);
			}
		}
	});
});

describe("buildReplacementDefinition (replace)", () => {
	it("requires the primary for every strategy but frameLocator, whose absence is the any-frame form", () => {
		expect(() => buildReplacementDefinition({ type: "role" }, "p")).toThrowError(
			'Locator replace for "p" of type "role" requires a "role" value.',
		);
		expect(() => buildReplacementDefinition({ type: "label" }, "p")).toThrowError(
			'Locator replace for "p" of type "label" requires a "text" value.',
		);
		expect(() => buildReplacementDefinition({ type: "locator" }, "p")).toThrowError(
			'Locator replace for "p" of type "locator" requires a "selector" value.',
		);
		expect(() => buildReplacementDefinition({ type: "testId" }, "p")).toThrowError(
			'Locator replace for "p" of type "testId" requires a "testId" value.',
		);
		expect(() => buildReplacementDefinition({ type: "id" }, "p")).toThrowError(
			'Locator replace for "p" of type "id" requires an "id" value.',
		);
		expect(buildReplacementDefinition({ type: "frameLocator" }, "p")).toEqual({ type: "frameLocator" });
		expect(buildReplacementDefinition({ type: "frameLocator", selector: "iframe" }, "p")).toEqual({
			type: "frameLocator",
			selector: "iframe",
		});
	});

	it("takes the options as given, where null equals omission", () => {
		expect(buildReplacementDefinition({ type: "role", role: "button", options: { name: "x" } }, "p")).toEqual({
			type: "role",
			role: "button",
			options: { name: "x" },
		});
		expect(buildReplacementDefinition({ type: "role", role: "button", options: null }, "p")).toEqual({
			type: "role",
			role: "button",
		});
		expect(buildReplacementDefinition({ type: "role", role: "button", options: { name: null } }, "p")).toEqual({
			type: "role",
			role: "button",
		});
		expect(buildReplacementDefinition({ type: "text", text: "", options: { exact: true } }, "p")).toEqual({
			type: "text",
			text: "",
			options: { exact: true },
		});
	});
});

describe("types", () => {
	it("OptionsPatch accepts null and undefined per key", () => {
		expectTypeOf<OptionsPatch<{ name?: string; exact?: boolean } | undefined>>().toEqualTypeOf<{
			name?: string | null;
			exact?: boolean | null;
		}>();
	});
});

// Type-level contract for the builder's argument shapes. Never called; vitest's typecheck mode
// reports an unused @ts-expect-error. The query builder needs no page until resolution.
const typeContract = (registry: LocatorRegistryInternal<"a">) => {
	const schema = registry.getLocatorSchema("a");
	schema.update().getByRole("button");
	schema.update().getByRole("button", undefined);
	schema.update().getByRole("button", null);
	schema.update().getByRole(null);
	schema.update().getByRole({ name: null });
	schema.update().getByRole({ name: undefined });
	schema.update().getByRole();
	schema.update().locator("li", { hasText: null });
	schema.update().getByText({ exact: null });
	schema.update().frameLocator();
	schema.update().getByTestId();
	schema.replace().getByRole("button", { name: "x" });
	schema.replace().getByRole("button", undefined);
	schema.replace().getByText(/x/, { exact: true });
	schema.replace().locator("li", { hasText: "x" });
	schema.replace().frameLocator();
	schema.replace().frameLocator("iframe");
	schema.replace().getByTestId("t");
	schema.replace().getById(/x/);
	// @ts-expect-error replace needs the role, as page.getByRole does
	schema.replace().getByRole();
	// @ts-expect-error an options-only call is update's form, not replace's
	schema.replace().getByRole({ name: "x" });
	// @ts-expect-error a null primary is not a value
	schema.replace().getByRole(null);
	// @ts-expect-error replace takes Playwright's options, where null deletes nothing
	schema.replace().getByRole("button", null);
	// @ts-expect-error replace takes Playwright's options, where null deletes nothing
	schema.replace().getByRole("button", { name: null });
	// @ts-expect-error replace needs the text
	schema.replace().getByText();
	// @ts-expect-error replace needs the text
	schema.replace().getByLabel({ exact: true });
	// @ts-expect-error replace needs the selector
	schema.replace().locator({ hasText: "x" });
	// @ts-expect-error replace needs the test id
	schema.replace().getByTestId();
	// @ts-expect-error replace needs the id
	schema.replace().getById();
	// @ts-expect-error a null primary is not a value
	schema.update().getByRole(null, null);
	// @ts-expect-error not an ARIA role
	schema.update().getByRole("banana");
	// @ts-expect-error a value of the wrong type is not a patch
	schema.update().getByRole({ name: 1 });
};
void typeContract;

// Replacing never touches the page until resolution; resolution records the strategy calls on a chainable stub.
const createStubPage = () => {
	const calls: { method: string; args: unknown[] }[] = [];
	const chain: object = new Proxy(
		{},
		{
			get: (_target, key) =>
				typeof key === "symbol" || key === "then"
					? undefined
					: (...args: unknown[]) => {
							calls.push({ method: key, args });
							return chain;
						},
		},
	);
	return { page: chain as Page, calls };
};

describe("replace from JavaScript", () => {
	const createRegistry = () => {
		const stub = createStubPage();
		const registry = new LocatorRegistryInternal<"form" | "form.button">(stub.page);
		registry.add("form").locator("form");
		registry.add("form.button").getByRole("button", { name: "Save" });
		return { registry, calls: stub.calls };
	};

	it("throws the shared message at the call when the first argument is missing", () => {
		const { registry } = createRegistry();
		const replace = () =>
			registry.getLocatorSchema("form.button").replace() as unknown as Record<string, (...args: unknown[]) => unknown>;
		const cases: [string, unknown[], string][] = [
			["getByRole", [], 'getByRole requires a role value for "form.button".'],
			["getByRole", [{ name: "x" }], 'getByRole requires a role value for "form.button".'],
			["getByRole", [null], 'getByRole requires a role value for "form.button".'],
			["getByText", [], 'getByText requires a text value for "form.button".'],
			["getByLabel", [{ exact: true }], 'getByLabel requires a text value for "form.button".'],
			["getByPlaceholder", [], 'getByPlaceholder requires a text value for "form.button".'],
			["getByAltText", [], 'getByAltText requires a text value for "form.button".'],
			["getByTitle", [], 'getByTitle requires a text value for "form.button".'],
			["locator", [{ hasText: "x" }], 'locator requires a selector value for "form.button".'],
			["getByTestId", [], 'getByTestId requires a testId value for "form.button".'],
			["getById", [], 'getById requires a non-empty id for "form.button".'],
		];
		for (const [method, args, message] of cases) {
			expect(() => replace()[method]?.(...args), `${method}(${JSON.stringify(args)})`).toThrowError(message);
		}
	});

	it("keeps treating a null options argument or option as omission", () => {
		const { registry, calls } = createRegistry();
		const replace = () =>
			registry.getLocatorSchema("form.button").replace() as unknown as {
				getByRole: (...args: unknown[]) => { getLocator: () => unknown };
			};
		replace().getByRole("button", null).getLocator();
		replace().getByRole("button", { name: null }).getLocator();
		const roles = calls.filter((call) => call.method === "getByRole").map((call) => call.args);
		expect(roles).toEqual([
			["button", undefined],
			["button", undefined],
		]);
	});

	it("still installs the any-frame form without a selector", () => {
		const { registry } = createRegistry();
		expect(() => registry.getLocatorSchema("form").replace().frameLocator()).not.toThrow();
	});
});
