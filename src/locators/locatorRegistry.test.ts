import { describe, expect, it } from "vitest";
import { createFakePage, FakeLocator } from "./fakePage";
import { LocatorRegistryInternal } from "./locatorRegistry";
import type { FilterDefinition } from "./types";

type Paths = "list" | "list.item" | "btn" | "row" | "seeded" | "x";
const createRegistry = () => {
	const registry = new LocatorRegistryInternal<Paths>(createFakePage());
	registry.add("list").locator("ul");
	registry.add("list.item").locator("li").filter({ hasText: "Row" }).nth(0).describe("first row");
	return registry;
};
const chain = (locator: unknown) => String(locator);

describe("the duplicate-registration message", () => {
	it("keeps its first sentence and shows a Locator in a step as Playwright prints it", () => {
		const registry = createRegistry();
		registry
			.add("row")
			.locator("li")
			.filter({ has: new FakeLocator("locator('b')") as never });
		let message = "";
		try {
			registry.add("row").locator("ol");
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toMatch(/^A locator schema with the path "row" already exists\.\nExisting Schema: \{/);
		expect(message).toContain(`"has": "locator('b')"`);
		expect(message).toContain(`"selector": "ol"`);
	});
});

describe("getLocator", () => {
	it("resolves the terminal alone, with its own steps and description", () => {
		const locator = createRegistry().getLocator("list.item");
		expect(chain(locator)).toBe("locator('li').filter({ hasText: 'Row' }).nth(0)");
		expect((locator as unknown as FakeLocator).description()).toBe("first row");
	});

	it("rejects a malformed path from JavaScript with the path rules before looking it up", () => {
		const registry = createRegistry();
		const getLocator = registry.getLocator.bind(registry) as (path: string) => unknown;
		expect(() => getLocator("list..item")).toThrowError("LocatorSchemaPath string cannot contain consecutive dots");
		expect(() => getLocator("list.")).toThrowError("LocatorSchemaPath string cannot end with a dot");
		expect(() => getLocator("")).toThrowError("LocatorSchemaPath string cannot be empty");
		expect(() => getLocator("nope")).toThrowError('No locator schema registered for path "nope".');
	});
});

describe("a registered locator cannot change after registration", () => {
	it("ignores a change to the options object after add", () => {
		const registry = createRegistry();
		const options = { name: "Save" };
		registry.add("btn").getByRole("button", options);
		options.name = "Other";
		expect(chain(registry.getLocator("btn"))).toBe("getByRole('button', { name: 'Save' })");
	});

	it("ignores a change to the filter object after add", () => {
		const registry = createRegistry();
		const filter = { hasText: "Save" };
		registry.add("row").locator("li").filter(filter);
		filter.hasText = "Other";
		expect(chain(registry.getLocator("row"))).toBe("locator('li').filter({ hasText: 'Save' })");
	});

	it("ignores a change to a seed's options, filter or steps, before and after add", () => {
		const registry = createRegistry();
		const options = { name: "Save" };
		const filter = { hasText: "Row" };
		const seed = registry.createReusable.getByRole("button", options).filter(filter);
		options.name = "Other";
		filter.hasText = "Other";
		registry.add("seeded", { reuse: seed });
		const steps = seed.steps as { kind: string; filter?: { hasText?: string } }[];
		if (steps[0]?.filter) {
			steps[0].filter.hasText = "Changed";
		}
		expect(chain(registry.getLocator("seeded"))).toBe(
			"getByRole('button', { name: 'Save' }).filter({ hasText: 'Row' })",
		);
	});

	it("ignores a change to a query's filter object after the call", () => {
		const registry = createRegistry();
		const filter = { hasText: "Save" };
		const query = registry.getLocatorSchema("list.item").filter(filter);
		filter.hasText = "Other";
		expect(chain(query.getLocator())).toBe(
			"locator('li').filter({ hasText: 'Row' }).nth(0).filter({ hasText: 'Save' })",
		);
		expect(chain(registry.getLocator("list.item"))).toBe("locator('li').filter({ hasText: 'Row' }).nth(0)");
	});
});

describe("filter references", () => {
	it("reports an array or a filter-only object in has as an unsupported reference", () => {
		for (const has of [[], [new FakeLocator("locator('b')")], { filter: () => undefined }]) {
			const registry = createRegistry();
			registry
				.add("row")
				.locator("li")
				.filter({ has } as unknown as FilterDefinition<Paths, Paths>);
			expect(() => registry.verify()).toThrowError(
				'"row": Unsupported filter reference while resolving "row". Filter has/hasNot supports Playwright Locator instances or registry path strings.',
			);
		}
	});
});

describe("nth", () => {
	it("hands null and undefined from JavaScript to Playwright's nth instead of dropping the step", () => {
		const registry = createRegistry();
		registry
			.add("x")
			.locator("li")
			.nth(null as never);
		registry
			.add("row")
			.locator("li")
			.nth(undefined as never);
		registry.add("seeded", { reuse: registry.createReusable.locator("li").nth("2" as never) });
		expect(chain(registry.getLocator("x"))).toBe("locator('li').nth(null)");
		expect(chain(registry.getLocator("row"))).toBe("locator('li').nth(undefined)");
		expect(chain(registry.getLocator("seeded"))).toBe("locator('li').nth('2')");
		expect(
			chain(
				registry
					.getLocatorSchema("list.item")
					.nth(null as never)
					.getLocator(),
			),
		).toBe("locator('li').filter({ hasText: 'Row' }).nth(0).nth(null)");
	});
});
