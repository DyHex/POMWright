import type { Page } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { LocatorRegistrationPreDefinitionBuilder } from "./locatorRegistrationBuilder";
import { type LocatorRegistry, LocatorRegistryInternal } from "./locatorRegistry";
import type { ReusableLocator } from "./types";

// Registration never touches the page, so a bare object is enough; resolution is covered by the
// integration specs against the real page.
type Paths = "a" | "a.b" | "seeded" | "anyFrame" | "anyFrame.button";
const stubPage = {} as Page;
const createRegistry = () => new LocatorRegistryInternal<Paths>(stubPage);

const STRATEGIES =
	"getByRole, getByText, getByLabel, getByPlaceholder, getByAltText, getByTitle, locator, frameLocator, getByTestId or getById";

describe("add: the primary argument is required", () => {
	it("rejects a missing primary for every strategy, naming the method and the path, and registers nothing", () => {
		const cases: [string, (registry: LocatorRegistryInternal<Paths>) => unknown, string][] = [
			[
				"getByRole(undefined)",
				(r) => r.add("a").getByRole(undefined as never),
				'getByRole requires a role value for "a".',
			],
			[
				"getByRole({ name })",
				(r) => r.add("a").getByRole({ name: "x" } as never),
				'getByRole requires a role value for "a".',
			],
			[
				"getByText(undefined)",
				(r) => r.add("a").getByText(undefined as never),
				'getByText requires a text value for "a".',
			],
			[
				"getByText({ exact })",
				(r) => r.add("a").getByText({ exact: true } as never),
				'getByText requires a text value for "a".',
			],
			[
				"getByLabel(undefined)",
				(r) => r.add("a").getByLabel(undefined as never),
				'getByLabel requires a text value for "a".',
			],
			[
				"getByPlaceholder(undefined)",
				(r) => r.add("a").getByPlaceholder(undefined as never),
				'getByPlaceholder requires a text value for "a".',
			],
			[
				"getByAltText(undefined)",
				(r) => r.add("a").getByAltText(undefined as never),
				'getByAltText requires a text value for "a".',
			],
			[
				"getByTitle(undefined)",
				(r) => r.add("a").getByTitle(undefined as never),
				'getByTitle requires a text value for "a".',
			],
			[
				"locator(undefined)",
				(r) => r.add("a").locator(undefined as never),
				'locator requires a selector value for "a".',
			],
			[
				"locator({ hasText })",
				(r) => r.add("a").locator({ hasText: "x" } as never),
				'locator requires a selector value for "a".',
			],
			[
				"getByTestId(undefined)",
				(r) => r.add("a").getByTestId(undefined as never),
				'getByTestId requires a testId value for "a".',
			],
			["getById(undefined)", (r) => r.add("a").getById(undefined as never), 'getById requires a non-empty id for "a".'],
		];
		for (const [label, call, message] of cases) {
			const registry = createRegistry();
			expect(() => call(registry), label).toThrowError(message);
			expect(registry.getIfExists("a"), label).toBeUndefined();
		}
	});

	it("rejects an empty string for locator, frameLocator, getByRole and getById", () => {
		const cases: [(registry: LocatorRegistryInternal<Paths>) => unknown, string][] = [
			[(r) => r.add("a").locator(""), 'locator requires a non-empty selector for "a".'],
			[(r) => r.add("a").frameLocator(""), 'frameLocator requires a non-empty selector for "a".'],
			[(r) => r.add("a").getByRole("" as never), 'getByRole requires a non-empty role for "a".'],
			[(r) => r.add("a").getById(""), 'getById requires a non-empty id for "a".'],
		];
		for (const [call, message] of cases) {
			const registry = createRegistry();
			expect(() => call(registry)).toThrowError(message);
			expect(registry.getIfExists("a")).toBeUndefined();
		}
	});

	it("stores an empty string verbatim for the text-likes and getByTestId, which Playwright matches", () => {
		const registry = createRegistry();
		registry.add("a").getByText("");
		expect(registry.get("a").definition).toEqual({ type: "text", text: "" });
		for (const [type, call] of [
			["label", (r: LocatorRegistryInternal<Paths>) => r.add("a").getByLabel("")],
			["placeholder", (r: LocatorRegistryInternal<Paths>) => r.add("a").getByPlaceholder("")],
			["altText", (r: LocatorRegistryInternal<Paths>) => r.add("a").getByAltText("")],
			["title", (r: LocatorRegistryInternal<Paths>) => r.add("a").getByTitle("")],
		] as const) {
			const fresh = createRegistry();
			call(fresh);
			expect(fresh.get("a").definition).toEqual({ type, text: "" });
		}
		const testId = createRegistry();
		testId.add("a").getByTestId("");
		expect(testId.get("a").definition).toEqual({ type: "testId", testId: "" });
	});
});

describe("add: frameLocator() without a selector", () => {
	it("registers the any-frame segment and returns nothing to chain", () => {
		const registry = createRegistry();
		const result = registry.add("anyFrame").frameLocator();
		expect(result).toBeUndefined();
		expectTypeOf(result).toEqualTypeOf<undefined>();
		expect(registry.get("anyFrame")).toEqual({
			locatorSchemaPath: "anyFrame",
			definition: { type: "frameLocator" },
			steps: [],
		});
		expect(Object.keys(registry.get("anyFrame").definition)).toEqual(["type"]);
	});

	it("keeps the one-strategy rule", () => {
		const registry = createRegistry();
		const builder = registry.add("anyFrame");
		builder.frameLocator();
		expect(() => builder.locator("x")).toThrowError("only one locator type can be set for a registration");
		expect(registry.get("anyFrame").definition).toEqual({ type: "frameLocator" });
	});
});

describe("add with a seed", () => {
	it("inherits on undefined and stores or rejects an empty string per strategy", () => {
		const registry = createRegistry();
		const testIdSeed = registry.createReusable.getByTestId("seeded-id");
		registry.add("a", { reuse: testIdSeed }).getByTestId(undefined);
		expect(registry.get("a").definition).toEqual({ type: "testId", testId: "seeded-id" });
		registry.add("a.b", { reuse: testIdSeed }).getByTestId("");
		expect(registry.get("a.b").definition).toEqual({ type: "testId", testId: "" });

		const frameSeed = registry.createReusable.frameLocator("iframe#x").nth(1);
		registry.add("seeded", { reuse: frameSeed }).frameLocator(undefined);
		expect(registry.get("seeded")).toEqual({
			locatorSchemaPath: "seeded",
			definition: { type: "frameLocator", selector: "iframe#x" },
			steps: [{ kind: "index", index: 1 }],
		});
		expect(() => registry.add("anyFrame", { reuse: frameSeed }).frameLocator("")).toThrowError(
			'frameLocator requires a non-empty selector for "anyFrame".',
		);
		expect(registry.get("anyFrame").definition).toEqual({ type: "frameLocator", selector: "iframe#x" });

		const other = createRegistry();
		const roleSeed = other.createReusable.getByRole("button", { name: "Submit" });
		other.add("a", { reuse: roleSeed }).getByRole(undefined as never);
		expect(other.get("a").definition).toEqual({ type: "role", role: "button", options: { name: "Submit" } });
		expect(() => other.add("a.b", { reuse: roleSeed }).getByRole("" as never)).toThrowError(
			'getByRole requires a non-empty role for "a.b".',
		);
		const locatorSeed = other.createReusable.locator("li");
		expect(() => other.add("seeded", { reuse: locatorSeed }).locator("")).toThrowError(
			'locator requires a non-empty selector for "seeded".',
		);
		const textSeed = other.createReusable.getByText("seed");
		other.add("anyFrame", { reuse: textSeed }).getByText("");
		expect(other.get("anyFrame").definition).toEqual({ type: "text", text: "" });
	});
});

describe("createReusable", () => {
	it("applies the same rules under its own label and requires the frame selector", () => {
		const registry = createRegistry();
		const factory = registry.createReusable;
		expect(() => factory.locator("")).toThrowError("createReusable.locator requires a non-empty selector.");
		expect(() => factory.frameLocator("")).toThrowError("createReusable.frameLocator requires a non-empty selector.");
		expect(() => factory.frameLocator(undefined as never)).toThrowError(
			"createReusable.frameLocator requires a selector value.",
		);
		expect(() => factory.getByRole("" as never)).toThrowError("createReusable.getByRole requires a non-empty role.");
		expect(() => factory.getByRole(undefined as never)).toThrowError("createReusable.getByRole requires a role value.");
		expect(() => factory.getByText(undefined as never)).toThrowError("createReusable.getByText requires a text value.");
		expect(factory.getByTestId("").definition).toEqual({ type: "testId", testId: "" });
		expect(factory.getByText("").definition).toEqual({ type: "text", text: "" });
		expect(factory.getByLabel("").definition).toEqual({ type: "label", text: "" });
		expect(factory.frameLocator("iframe").definition).toEqual({ type: "frameLocator", selector: "iframe" });
	});
});

describe("steps and describe before a strategy", () => {
	it("throw at runtime naming the method, register nothing, and leave the path registrable", () => {
		const registry = createRegistry();
		const builder = registry.add("a") as unknown as {
			filter: (filter: object) => unknown;
			nth: (index: number) => unknown;
			describe: (description: string) => unknown;
		};
		expect(() => builder.filter({ hasText: "x" })).toThrowError(
			`filter() needs a locator strategy first for "a"; call ${STRATEGIES} before it.`,
		);
		expect(() => builder.nth(0)).toThrowError(
			`nth() needs a locator strategy first for "a"; call ${STRATEGIES} before it.`,
		);
		expect(() => builder.describe("d")).toThrowError(
			`describe() needs a locator strategy first for "a"; call ${STRATEGIES} before it.`,
		);
		expect(registry.getIfExists("a")).toBeUndefined();
		registry.add("a").getByRole("button");
		expect(registry.get("a").definition).toEqual({ type: "role", role: "button" });
	});
});

describe("a throwing DSL call changes nothing", () => {
	it("keeps the seed after a wrong-type override", () => {
		const registry = createRegistry();
		const seed = registry.createReusable.getByRole("button", { name: "Submit" });
		const builder = registry.add("seeded", { reuse: seed }) as unknown as { getByText: (text: string) => unknown };
		expect(() => builder.getByText("t")).toThrowError('must use the "role" strategy');
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "button", options: { name: "Submit" } });
	});

	it("keeps the first override after a second one", () => {
		const registry = createRegistry();
		const seed = registry.createReusable.getByRole("button", { name: "Submit" });
		const builder = registry.add("seeded", { reuse: seed });
		builder.getByRole({ name: "First" });
		expect(() => builder.getByRole({ name: "Second" })).toThrowError("only one matching override is allowed");
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "button", options: { name: "First" } });
	});

	it("keeps the first strategy after a second one on an unseeded builder", () => {
		const registry = createRegistry();
		const builder = registry.add("a");
		builder.getByRole("button");
		expect(() => builder.locator("x")).toThrowError("only one locator type can be set for a registration");
		expect(registry.get("a").definition).toEqual({ type: "role", role: "button" });
	});
});

describe("types", () => {
	it("the builder returned by add(path) exposes the ten strategies and nothing else", () => {
		expectTypeOf<keyof LocatorRegistrationPreDefinitionBuilder<Paths, "a">>().toEqualTypeOf<
			| "getByRole"
			| "getByText"
			| "getByLabel"
			| "getByPlaceholder"
			| "getByAltText"
			| "getByTitle"
			| "locator"
			| "frameLocator"
			| "getByTestId"
			| "getById"
		>();
		expectTypeOf<LocatorRegistry<Paths>>().toHaveProperty("verify");
	});
});

// Type-level contract. Never called; vitest's typecheck mode reports an unused @ts-expect-error.
const typeContract = (registry: LocatorRegistryInternal<Paths>) => {
	// @ts-expect-error filter needs a strategy first
	registry.add("a").filter({ hasText: "x" });
	// @ts-expect-error nth needs a strategy first
	registry.add("a").nth(0);
	// @ts-expect-error describe needs a strategy first
	registry.add("a").describe("d");
	registry.add("a").getByRole("button").filter({ hasText: "x" }).nth(0).describe("d");
	// @ts-expect-error the any-frame form returns nothing to chain
	registry.add("anyFrame").frameLocator().nth(0);
	registry.add("anyFrame").frameLocator("iframe").nth(0).filter({ visible: true }).describe("frame");
	// @ts-expect-error a seed needs the frame selector
	registry.createReusable.frameLocator();
	// @ts-expect-error the options-only form is seeded-only
	registry.add("a").getByRole({ name: "x" });
	// @ts-expect-error undefined is not accepted unseeded
	registry.add("a").frameLocator(undefined);
	// @ts-expect-error undefined is not accepted unseeded
	registry.add("a").getByTestId(undefined);
	const seed = registry.createReusable.getByRole("button", { name: "x" });
	registry.add("seeded", { reuse: seed }).filter({ hasText: "y" }).nth(0).describe("z");
	registry.add("seeded", { reuse: seed }).getByRole({ name: "y" }).nth(0);
	const frameSeed = registry.createReusable.frameLocator("iframe");
	registry.add("seeded", { reuse: frameSeed }).frameLocator().nth(1);
	registry.add("seeded", { reuse: frameSeed }).frameLocator(undefined);
	// a seed has one public type, covariant in its strategy
	const roleSeed: ReusableLocator<Paths, "role"> = registry.createReusable.getByRole("button").nth(0);
	const anySeed: ReusableLocator<Paths> = registry.createReusable.locator("li").filter({ hasText: "x" });
	const widened: ReusableLocator<Paths> = roleSeed;
	// @ts-expect-error a locator seed is not a role seed
	const wrongSeed: ReusableLocator<Paths, "role"> = registry.createReusable.locator("li");
	registry.add("seeded", { reuse: roleSeed }).getByRole({ name: "y" });
	// @ts-expect-error a role seed offers only the getByRole override
	registry.add("seeded", { reuse: roleSeed }).getByText("y");
	registry.add("seeded", { reuse: anySeed }).getByText("y");
	void [widened, wrongSeed];
};
void typeContract;
