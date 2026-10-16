import { describe, expect, it } from "vitest";
import { createFakePage, FakeLocator } from "./fakePage";
import { LocatorRegistryInternal } from "./locatorRegistry";
import type { FilterDefinition, ReusableLocator } from "./types";

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

describe("reuse by path", () => {
	type ReusePaths = "list" | "list.item" | "list.plain" | "other" | "other.item" | "other.plain" | "other.copy";
	const create = () => {
		const registry = new LocatorRegistryInternal<ReusePaths>(createFakePage());
		registry.add("list").locator("ul");
		registry.add("list.item").getByRole("listitem").filter({ hasText: "b" }).nth("last").describe("Last bold item");
		registry.add("list.plain").getByRole("listitem").filter({ hasText: "a" });
		registry.add("other").locator("ol");
		return registry;
	};
	const description = (locator: unknown) => (locator as FakeLocator).description();

	it("copies the strategy, the steps and an explicit description", () => {
		const registry = create();
		registry.add("other.item", { reuse: "list.item" });
		expect(chain(registry.getNestedLocator("other.item"))).toBe(
			"locator('ol').getByRole('listitem').filter({ hasText: 'b' }).last()",
		);
		expect(description(registry.getNestedLocator("other.item"))).toBe("Last bold item");
	});

	it("describes a copy without a description by its own path", () => {
		const registry = create();
		registry.add("other.plain", { reuse: "list.plain" });
		expect(description(registry.getNestedLocator("other.plain"))).toBe("other.plain");
	});

	it("returns filter, nth and describe, which apply after the copied steps and leave the source alone", () => {
		const registry = create();
		const view = registry.add("other.copy", { reuse: "list.plain" });
		expect(Object.keys(view).sort()).toEqual(["describe", "filter", "nth"]);
		view.filter({ hasText: "x" }).nth(0).describe("copy");
		expect(chain(registry.getNestedLocator("other.copy"))).toBe(
			"locator('ol').getByRole('listitem').filter({ hasText: 'a' }).filter({ hasText: 'x' }).nth(0)",
		);
		expect(description(registry.getNestedLocator("other.copy"))).toBe("copy");
		expect(chain(registry.getNestedLocator("list.plain"))).toBe(
			"locator('ul').getByRole('listitem').filter({ hasText: 'a' })",
		);
		expect(description(registry.getNestedLocator("list.plain"))).toBe("list.plain");
	});

	it("keeps the source's explicit description unless describe replaces or removes it", () => {
		const registry = create();
		registry.add("other.item", { reuse: "list.item" }).describe("");
		expect(description(registry.getNestedLocator("other.item"))).toBeNull();
		expect(description(registry.getNestedLocator("list.item"))).toBe("Last bold item");
	});
});

describe("a reuse value that is neither a path nor a seed", () => {
	it("throws one message for {}, 42 and null, and registers nothing", () => {
		const registry = createRegistry();
		const add = registry.add.bind(registry) as (path: string, options: { reuse: unknown }) => unknown;
		for (const reuse of [{}, 42, null, { definition: { type: "css" } }]) {
			expect(() => add("x", { reuse })).toThrowError(
				'reuse requires a registered path or a seed from createReusable for "x".',
			);
			expect(() => registry.get("x")).toThrowError('No locator schema registered for path "x".');
		}
	});

	it("keeps the message of a forced array", () => {
		const registry = createRegistry();
		const add = registry.add.bind(registry) as (path: string, options: { reuse: unknown }) => unknown;
		expect(() => add("x", { reuse: ["reason"] })).toThrowError('Invalid reuse path configuration for "x": reason');
	});

	it("accepts a hand-made object of the seed's shape", () => {
		const registry = createRegistry();
		const seedShaped = {
			type: "locator",
			definition: { type: "locator", selector: "b" },
			steps: [],
			description: undefined,
			filter() {
				return this;
			},
			nth() {
				return this;
			},
			describe() {
				return this;
			},
		} as const;
		registry.add("x", { reuse: seedShaped as unknown as ReusableLocator<Paths, "locator"> });
		expect(chain(registry.getLocator("x"))).toBe("locator('b')");
	});
});

describe("variants derived from one seed", () => {
	type TablePaths = "table" | "table.row" | "table.row@first" | "table.row@last" | "summary" | "other";
	it("are each the base plus their own step and description", () => {
		const registry = new LocatorRegistryInternal<TablePaths>(createFakePage());
		const row = registry.createReusable.locator("tr");
		registry.add("table").locator("table");
		registry.add("table.row", { reuse: row });
		registry.add("table.row@first", { reuse: row.nth(0) });
		registry.add("table.row@last", { reuse: row.nth("last") });
		expect(chain(registry.getNestedLocator("table.row"))).toBe("locator('table').locator('tr')");
		expect(chain(registry.getNestedLocator("table.row@first"))).toBe("locator('table').locator('tr').nth(0)");
		expect(chain(registry.getNestedLocator("table.row@last"))).toBe("locator('table').locator('tr').last()");

		const heading = registry.createReusable.getByRole("heading", { level: 2 });
		registry.add("summary", { reuse: heading.describe("Summary heading").filter({ hasText: "Summary" }) });
		registry.add("other", { reuse: heading.filter({ hasText: "Other" }) });
		const other = registry.getNestedLocator("other");
		expect(chain(other)).toBe("getByRole('heading', { level: 2 }).filter({ hasText: 'Other' })");
		expect((other as unknown as FakeLocator).description()).toBe("other");
	});
});

describe("steps or a description on an any-frame definition", () => {
	type FramePaths = "anyFrame" | "copy" | "copy.button" | "seeded" | "stepped" | "described" | "a" | "a.b" | "a.b.c";
	const create = () => new LocatorRegistryInternal<FramePaths>(createFakePage());
	const anyFrameSeed = (steps: { kind: "index"; index: number }[], description?: string) =>
		({
			type: "frameLocator",
			definition: { type: "frameLocator" },
			steps,
			description,
			filter() {
				return this;
			},
			nth() {
				return this;
			},
			describe() {
				return this;
			},
		}) as unknown as ReusableLocator<FramePaths, "frameLocator">;
	const message = (what: string, path: string) =>
		`${what} cannot apply to "${path}": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`;

	it("a copy by path registers, refuses filter, nth and describe at the call, and passes verify at a root path", () => {
		const registry = create();
		registry.add("anyFrame").frameLocator();
		const view = registry.add("copy", { reuse: "anyFrame" });
		expect(() => view.filter({ hasText: "x" })).toThrowError(message("filter()", "copy"));
		expect(() => view.nth(0)).toThrowError(message("nth()", "copy"));
		expect(() => view.describe("d")).toThrowError(message("describe()", "copy"));
		registry.add("copy.button").getByRole("button");
		expect(registry.get("copy").steps).toEqual([]);
		expect(() => registry.verify()).not.toThrow();
		expect(chain(registry.getNestedLocator("copy.button"))).toBe("frameLocator().getByRole('button')");
	});

	it("leaves a copy's position to verify: below namespaces it passes, below a registered ancestor it fails", () => {
		const registry = create();
		registry.add("anyFrame").frameLocator();
		registry.add("a.b.c", { reuse: "anyFrame" });
		expect(() => registry.verify()).not.toThrow();
		registry.add("a").locator("main");
		expect(() => registry.verify()).toThrowError(
			'"a.b.c": frameLocator() without a selector must be the first segment of the chain; "a.b.c" has the ancestor "a".',
		);
	});

	it("a hand-made any-frame seed without steps registers like add(path).frameLocator()", () => {
		const registry = create();
		registry.add("seeded", { reuse: anyFrameSeed([]) });
		expect(registry.get("seeded").definition).toEqual({ type: "frameLocator" });
		expect(() => registry.verify()).not.toThrow();
	});

	it("a hand-made any-frame seed with steps or a description throws at add and registers nothing", () => {
		const registry = create();
		expect(() => registry.add("stepped", { reuse: anyFrameSeed([{ kind: "index", index: 0 }]) })).toThrowError(
			message("reuse", "stepped"),
		);
		expect(() => registry.add("described", { reuse: anyFrameSeed([], "d") })).toThrowError(
			message("reuse", "described"),
		);
		expect(() => registry.get("stepped")).toThrowError("No locator schema registered");
		expect(() => registry.get("described")).toThrowError("No locator schema registered");
	});

	it("an override that gives an any-frame seed a selector makes it a frame segment that takes steps", () => {
		const registry = create();
		registry
			.add("seeded", { reuse: anyFrameSeed([]) })
			.frameLocator("iframe")
			.nth(0);
		expect(registry.get("seeded").definition).toEqual({ type: "frameLocator", selector: "iframe" });
		expect(registry.get("seeded").steps).toEqual([{ kind: "index", index: 0 }]);
	});

	it("add(path).frameLocator() is unchanged: it returns nothing to chain", () => {
		expect(create().add("anyFrame").frameLocator()).toBeUndefined();
	});
});

describe("a primary is always a value; a lone null is the options", () => {
	type NullPaths = "main" | "main.save" | "seeded" | "x";
	const create = () => {
		const registry = new LocatorRegistryInternal<NullPaths>(createFakePage());
		registry.add("main").locator("main");
		registry.add("main.save").getByRole("button", { name: "Save", exact: true });
		return registry;
	};
	const seed = (registry: LocatorRegistryInternal<NullPaths>) =>
		registry.createReusable.getByRole("button", { name: "Save", exact: true });
	const js = (value: unknown) => value as never;

	it("a seeded override's lone null clears the seed's options, as update's does", () => {
		const registry = create();
		registry.add("seeded", { reuse: seed(registry) }).getByRole(null);
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "button" });
		expect(chain(registry.getLocatorSchema("main.save").update().getByRole(null).getLocator())).toBe(
			"getByRole('button')",
		);
	});

	it("a seeded override's null key deletes the key instead of storing null", () => {
		const registry = create();
		registry.add("seeded", { reuse: seed(registry) }).getByRole({ exact: null });
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "button", options: { name: "Save" } });
	});

	it("a primary with null options sets the primary and clears the options", () => {
		const registry = create();
		registry.add("seeded", { reuse: seed(registry) }).getByRole("link", null);
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "link" });
	});

	it("null as the first of two arguments throws on a seeded override and on update", () => {
		const registry = create();
		expect(() => registry.add("seeded", { reuse: seed(registry) }).getByRole(js(null), null)).toThrowError(
			'getByRole requires a role value for "seeded".',
		);
		expect(() => registry.getLocatorSchema("main.save").update().getByRole(js(null), { name: "x" })).toThrowError(
			'getByRole requires a role value for "main.save".',
		);
	});

	it("null for a strategy without options throws on every builder", () => {
		const registry = create();
		expect(() => registry.add("x").getByTestId(js(null))).toThrowError('getByTestId requires a testId value for "x".');
		expect(() => registry.add("x").frameLocator(js(null))).toThrowError(
			'frameLocator requires a selector value for "x".',
		);
		expect(() => registry.add("x").getById(js(null))).toThrowError('getById requires a non-empty id for "x".');
		expect(() =>
			registry.add("seeded", { reuse: registry.createReusable.getByTestId("save") }).getByTestId(js(null)),
		).toThrowError('getByTestId requires a testId value for "seeded".');
		expect(() => registry.getLocatorSchema("main.save").replace().frameLocator(js(null))).toThrowError(
			'frameLocator requires a selector value for "main.save".',
		);
		expect(() => registry.createReusable.getByTestId(js(null))).toThrowError(
			"createReusable.getByTestId requires a testId value.",
		);
	});

	it("a number, an object or a RegExp where Playwright takes a string throws, as add always did", () => {
		const registry = create();
		expect(() => registry.add("seeded", { reuse: seed(registry) }).getByRole(js(42))).toThrowError(
			'getByRole requires a role value for "seeded".',
		);
		expect(() => registry.getLocatorSchema("main.save").update().getByRole(js(/S/i))).toThrowError(
			'getByRole requires a role value for "main.save".',
		);
		expect(() => registry.createReusable.getByText(js({ exact: true }))).toThrowError(
			"createReusable.getByText requires a text value.",
		);
		registry.add("x", { reuse: registry.createReusable.getByText("Save") }).getByText(/Sa/i);
		expect(registry.get("x").definition).toEqual({ type: "text", text: /Sa/i });
	});

	it("omitting stays what it was: inherit on a seed, the any-frame form on add", () => {
		const registry = create();
		registry.add("seeded", { reuse: registry.createReusable.frameLocator("iframe") }).frameLocator();
		expect(registry.get("seeded").definition).toEqual({ type: "frameLocator", selector: "iframe" });
		expect(registry.add("x").frameLocator()).toBeUndefined();
	});
});

describe("a seeded override stores what update stores", () => {
	// every strategy: [primary, options, other options, an option key, other primary]
	const strategies: Record<string, readonly [string, object?, object?, string?, (string | RegExp)?]> = {
		getByRole: ["button", { name: "Save", exact: true }, { name: "Cancel" }, "exact", "link"],
		getByText: ["Save", { exact: true }, { exact: false }, "exact", /Sa/i],
		getByLabel: ["Save", { exact: true }, { exact: false }, "exact", /Sa/i],
		getByPlaceholder: ["Save", { exact: true }, { exact: false }, "exact", /Sa/i],
		getByAltText: ["Save", { exact: true }, { exact: false }, "exact", /Sa/i],
		getByTitle: ["Save", { exact: true }, { exact: false }, "exact", /Sa/i],
		locator: ["button", { hasText: "Save", hasNotText: "Draft" }, { hasText: "Cancel" }, "hasText", "a"],
		getByTestId: ["save"],
		getById: ["save"],
		frameLocator: ["iframe"],
	};
	type Call = (...args: unknown[]) => unknown;
	const outcome = (fn: () => unknown) => {
		try {
			return { result: fn() };
		} catch (error) {
			return { error: (error as Error).message };
		}
	};

	for (const [method, [primary, options, otherOptions, key, otherPrimary = `${primary}-2`]] of Object.entries(
		strategies,
	)) {
		const forms: Record<string, unknown[]> = {
			"()": [],
			"(undefined)": [undefined],
			"(primary)": [otherPrimary],
			"(null)": [null],
			"(null, null)": [null, null],
			"(42)": [42],
			...(options && key
				? {
						"(options)": [otherOptions],
						"({ key: null })": [{ [key]: null }],
						"({ key: undefined })": [{ [key]: undefined }],
						"({})": [{}],
						"(primary, options)": [otherPrimary, otherOptions],
						"(primary, null)": [otherPrimary, null],
						"(primary, undefined)": [otherPrimary, undefined],
						"(null, options)": [null, otherOptions],
						"(undefined, null)": [undefined, null],
						"(undefined, options)": [undefined, otherOptions],
					}
				: {}),
		};
		for (const [form, args] of Object.entries(forms)) {
			it(`${method}${form}`, () => {
				const viaUpdate = outcome(() => {
					const registry = new LocatorRegistryInternal<"p">(createFakePage());
					(registry.add("p")[method as "locator"] as Call)(primary, ...(options ? [options] : []));
					const query = registry.getLocatorSchema("p");
					(query.update()[method as "locator"] as Call)(...args);
					return chain(query.getLocator());
				});
				const viaSeed = outcome(() => {
					const registry = new LocatorRegistryInternal<"p">(createFakePage());
					const seed = (registry.createReusable[method as "locator"] as Call)(primary, ...(options ? [options] : []));
					const view = registry.add("p", { reuse: seed as ReusableLocator<"p", "locator"> });
					(view[method as "locator"] as Call)(...args);
					return chain(registry.getLocator("p"));
				});
				expect(viaSeed).toEqual(viaUpdate);
			});
		}
	}

	it("merges the options key by key and keeps what is not given", () => {
		const registry = new LocatorRegistryInternal<"a" | "b" | "c">(createFakePage());
		const seed = registry.createReusable.getByRole("button", { name: "Save", exact: true });
		registry.add("a", { reuse: seed }).getByRole({ name: "Cancel" });
		registry.add("b", { reuse: seed }).getByRole({ exact: undefined });
		registry.add("c", { reuse: seed }).getByRole("link", { name: "Cancel" });
		expect(registry.get("a").definition).toEqual({
			type: "role",
			role: "button",
			options: { name: "Cancel", exact: true },
		});
		expect(registry.get("b").definition).toEqual({
			type: "role",
			role: "button",
			options: { name: "Save", exact: true },
		});
		expect(registry.get("c").definition).toEqual({
			type: "role",
			role: "link",
			options: { name: "Cancel", exact: true },
		});
	});
});
