import { describe, expect, it } from "vitest";
import { createFakePage, FakeLocator } from "./fakePage";
import { createRegistryWithAccessors, LocatorRegistryInternal } from "./locatorRegistry";
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
		expect(message).toMatch(
			/^A locator schema with the path "row" already exists\.\nExisting and attempted schemas: \{/,
		);
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

	it("ignores a change to the options object before a later step on the same registration", () => {
		const registry = createRegistry();
		const options = { name: "Save" };
		const view = registry.add("btn").getByRole("button", options);
		options.name = "Other";
		view.nth(0).describe("Save button");
		expect(chain(registry.getLocator("btn"))).toBe("getByRole('button', { name: 'Save' }).nth(0)");
	});

	it("ignores compile() on a RegExp after add: a first argument, an option, a filter", () => {
		const registry = createRegistry();
		const text = /Total/;
		const name = /Save/;
		const hasText = /Row/;
		registry.add("x").getByText(text);
		registry.add("btn").getByRole("button", { name });
		registry.add("row").locator("li").filter({ hasText });
		for (const re of [text, name, hasText]) {
			re.compile("Other", "i");
		}
		expect(chain(registry.getLocator("x"))).toBe("getByText(/Total/)");
		expect(chain(registry.getLocator("btn"))).toBe("getByRole('button', { name: /Save/ })");
		expect(chain(registry.getLocator("row"))).toBe("locator('li').filter({ hasText: /Row/ })");
	});

	it("ignores compile() on a RegExp before a later step on the same registration", () => {
		const registry = createRegistry();
		const name = /Save/;
		const view = registry.add("btn").getByRole("button", { name });
		name.compile("Other");
		view.nth(0);
		expect(chain(registry.getLocator("btn"))).toBe("getByRole('button', { name: /Save/ }).nth(0)");
	});

	it("ignores compile() on a seed's RegExps: its arguments, its definition and its steps", () => {
		const registry = createRegistry();
		const text = /Total/;
		const hasText = /Row/;
		const seed = registry.createReusable.getByText(text).filter({ hasText });
		text.compile("Other");
		hasText.compile("Other");
		(seed.definition as { text: RegExp }).text.compile("Changed");
		(seed.steps[0] as { filter: { hasText: RegExp } }).filter.hasText.compile("Changed");
		registry.add("seeded", { reuse: seed });
		expect(chain(registry.getLocator("seeded"))).toBe("getByText(/Total/).filter({ hasText: /Row/ })");
	});

	it("ignores compile() on a RegExp a query was given, until it resolves", () => {
		const registry = createRegistry();
		const updated = /Save/;
		const replaced = /Total/;
		const filtered = /Open/;
		registry.add("btn").getByRole("button", { name: "Cancel" });
		const update = registry.getLocatorSchema("btn").update().getByRole({ name: updated });
		const replace = registry.getLocatorSchema("btn").replace().getByText(replaced);
		const filter = registry.getLocatorSchema("btn").filter({ hasText: filtered });
		for (const re of [updated, replaced, filtered]) {
			re.compile("Other");
		}
		expect(chain(update.getLocator())).toBe("getByRole('button', { name: /Save/ })");
		expect(chain(replace.getLocator())).toBe("getByText(/Total/)");
		expect(chain(filter.getLocator())).toBe("getByRole('button', { name: 'Cancel' }).filter({ hasText: /Open/ })");
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

describe("strictChains", () => {
	type StrictPaths =
		| "main"
		| "main.form"
		| "main.form.button"
		| "main.form.button.save"
		| "dialog.close"
		| "app"
		| "app.frames"
		| "app.frames.any"
		| "anyFrame";
	const create = (options?: { strictChains?: boolean }) =>
		new LocatorRegistryInternal<StrictPaths>(createFakePage(), options);
	const strict = (missing: string) => `strictChains requires every ancestor to be registered; ${missing}`;

	it("leaves a sparse chain alone without the option and with false", () => {
		for (const registry of [create(), create({}), create({ strictChains: false })]) {
			registry.add("main").locator("main");
			registry.add("main.form.button.save").getByRole("button", { name: "Save" });
			expect(() => registry.verify()).not.toThrow();
			expect(chain(registry.getNestedLocator("main.form.button.save"))).toBe(
				"locator('main').getByRole('button', { name: 'Save' })",
			);
		}
	});

	it("names every unregistered ancestor, one line per path", () => {
		const registry = create({ strictChains: true });
		registry.add("main.form.button.save").getByRole("button", { name: "Save" });
		registry.add("dialog.close").getByRole("button", { name: "Close" });
		registry.add("main.form").locator("form");
		expect(() => registry.verify()).toThrowError(
			`Locator registry verification failed for 3 of 3 paths:\n  "main.form.button.save": ${strict('"main" and "main.form.button" are not.')}\n  "dialog.close": ${strict('"dialog" is not.')}\n  "main.form": ${strict('"main" is not.')}`,
		);
	});

	it("lists three or more ancestors with commas", () => {
		const registry = create({ strictChains: true });
		registry.add("main.form.button.save").getByRole("button");
		expect(() => registry.verify()).toThrowError(strict('"main", "main.form" and "main.form.button" are not.'));
	});

	it("passes a chain whose every ancestor is registered, and skip still leaves one out", () => {
		const registry = create({ strictChains: true });
		registry.add("main").locator("main");
		registry.add("main.form").locator("form");
		registry.add("main.form.button").locator("div.buttons");
		registry.add("main.form.button.save").getByRole("button", { name: "Save" });
		expect(() => registry.verify()).not.toThrow();
		expect(chain(registry.getLocatorSchema("main.form.button.save").skip("main.form.button").getNestedLocator())).toBe(
			"locator('main').locator('form').getByRole('button', { name: 'Save' })",
		);
	});

	it("puts every failing check of a path on its line: an any-frame path with a registered and an unregistered ancestor", () => {
		const registry = create({ strictChains: true });
		registry.add("app").locator("main");
		registry.add("app.frames.any").frameLocator();
		expect(() => registry.verify()).toThrowError(
			`"app.frames.any": ${strict('"app.frames" is not.')} frameLocator() without a selector must be the first segment of the chain; "app.frames.any" has the ancestor "app".`,
		);
	});

	it("leaves an any-frame path at the root alone, so under the option an any-frame path is a root path", () => {
		const registry = create({ strictChains: true });
		registry.add("anyFrame").frameLocator();
		expect(() => registry.verify()).not.toThrow();
	});

	it("is turned on by true only; a non-boolean from JavaScript leaves it off", () => {
		const registry = create({ strictChains: "yes" as never });
		registry.add("main.form").locator("form");
		expect(() => registry.verify()).not.toThrow();
	});

	it("does not change that the terminal path must be registered", () => {
		for (const registry of [create(), create({ strictChains: true })]) {
			expect(() => registry.getNestedLocator("main.form")).toThrowError(
				'No locator schema registered for path "main.form".',
			);
		}
	});

	it("is an option of createRegistryWithAccessors", () => {
		const { registry } = createRegistryWithAccessors<StrictPaths>(createFakePage(), { strictChains: true });
		registry.add("main.form").locator("form");
		expect(() => registry.verify()).toThrowError(strict('"main" is not.'));
	});
});

describe("the duplicate-registration message, a RegExp in both records", () => {
	it("prints the RegExp in each record, not [Circular]", () => {
		const registry = createRegistry();
		const save = /Save/i;
		registry.add("btn").getByRole("button", { name: save });
		let message = "";
		try {
			registry.add("btn").getByRole("button", { name: save });
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).not.toContain("[Circular]");
		expect(message.match(/"source": "Save"/g)).toHaveLength(2);
	});
});

describe("a hand-made seed is checked as every builder checks it", () => {
	type SeedPaths = "p" | "anyFrame";
	const handMade = (definition: object) =>
		({
			type: (definition as { type: string }).type,
			definition,
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
		}) as unknown as ReusableLocator<SeedPaths>;
	const cases: [object, string][] = [
		[{ type: "locator", selector: "" }, 'reuse requires a non-empty selector for "p".'],
		[{ type: "locator" }, 'reuse requires a selector value for "p".'],
		[{ type: "role" }, 'reuse requires a role value for "p".'],
		[{ type: "role", role: "" }, 'reuse requires a non-empty role for "p".'],
		[{ type: "role", role: 42 }, 'reuse requires a role value for "p".'],
		[{ type: "id", id: "" }, 'reuse requires a non-empty id for "p".'],
		[{ type: "testId" }, 'reuse requires a testId value for "p".'],
		[{ type: "frameLocator", selector: "" }, 'reuse requires a non-empty selector for "p".'],
		[{ type: "frameLocator", selector: null }, 'reuse requires a selector value for "p".'],
	];
	it.each(cases)("%j throws at add and registers nothing", (definition, message) => {
		const registry = new LocatorRegistryInternal<SeedPaths>(createFakePage());
		expect(() => registry.add("p", { reuse: handMade(definition) })).toThrowError(message);
		expect(() => registry.get("p")).toThrowError("No locator schema registered");
	});

	it("an empty text stays a value, and the any-frame form registers", () => {
		const registry = new LocatorRegistryInternal<SeedPaths>(createFakePage());
		registry.add("p", { reuse: handMade({ type: "text", text: "" }) });
		expect(registry.get("p").definition).toEqual({ type: "text", text: "" });
		registry.add("anyFrame", { reuse: handMade({ type: "frameLocator" }) });
		expect(registry.get("anyFrame").definition).toEqual({ type: "frameLocator" });
	});
});

describe("the any-frame checks at resolution", () => {
	// guards behind the call-time checks: reached here through the internal buildLocatorChain
	type GuardPaths = "main" | "main.any" | "main.any.btn" | "any" | "any.btn";
	const role = { type: "role", role: "button" } as const;
	const anyFrame = { type: "frameLocator" } as const;
	const main = { type: "locator", selector: "main" } as const;
	const registry = () => new LocatorRegistryInternal<GuardPaths>(createFakePage());

	it("an any-frame ancestor below a registered segment is not first", () => {
		expect(() =>
			registry().buildLocatorChain(
				"main.any.btn",
				role,
				new Map<string, never>([
					["main", main as never],
					["main.any", anyFrame as never],
				]),
				new Map(),
			),
		).toThrowError(
			'frameLocator() without a selector must be the first segment of the chain; "main.any" has the ancestor "main".',
		);
	});

	it("an any-frame ancestor with steps has no element to step on", () => {
		expect(() =>
			registry().buildLocatorChain(
				"any.btn",
				role,
				new Map<string, never>([["any", anyFrame as never]]),
				new Map([["any", [{ kind: "index" as const, index: 0 }]]]),
			),
		).toThrowError(
			'frameLocator() without a selector does not point to a particular iframe; "any" cannot be resolved on its own, filtered or indexed; resolve a path inside it.',
		);
	});

	it("an any-frame terminal below a registered segment is not first", () => {
		expect(() =>
			registry().buildLocatorChain("main.any", anyFrame, new Map<string, never>([["main", main as never]]), new Map()),
		).toThrowError(
			'frameLocator() without a selector must be the first segment of the chain; "main.any" has the ancestor "main".',
		);
	});
});

describe("a seeded builder held in a variable", () => {
	it("takes its one override after a step, which leaves the step as it was", () => {
		const registry = createRegistry();
		const seed = registry.createReusable.getByRole("button", { name: "Save" });
		const builder = registry.add("seeded", { reuse: seed });
		builder.nth(0);
		builder.getByRole({ name: "Cancel" });
		expect(registry.get("seeded")).toEqual({
			locatorSchemaPath: "seeded",
			definition: { type: "role", role: "button", options: { name: "Cancel" } },
			steps: [{ kind: "index", index: 0 }],
		});
	});
});

describe("a registration ends at the next call on the registry", () => {
	const ended = (method: string, path: string, by: string, resolvedPath?: string) =>
		method === "filter" && resolvedPath !== undefined && resolvedPath !== path
			? `filter() cannot apply to "${path}": its registration was ended by ${by}. If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "${resolvedPath}" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.`
			: `${method}() cannot apply to "${path}": its registration was ended by ${by}; give a registration all its steps in its add(…) chain, or query the path for one use.`;
	const steps = {
		filter: (view: { filter: (filter: { hasText: string }) => unknown }) => view.filter({ hasText: "x" }),
		nth: (view: { nth: (index: number) => unknown }) => view.nth(0),
		describe: (view: { describe: (description: string) => unknown }) => view.describe("d"),
	};
	const enders: [string, (registry: LocatorRegistryInternal<Paths>) => unknown, string, string?][] = [
		["another add", (registry) => registry.add("x").locator("p"), 'add("x")'],
		["getLocator", (registry) => registry.getLocator("list"), 'getLocator("list")', "list"],
		[
			"getNestedLocator of the path itself",
			(registry) => registry.getNestedLocator("btn"),
			'getNestedLocator("btn")',
			"btn",
		],
		["getLocatorSchema", (registry) => registry.getLocatorSchema("list.item"), 'getLocatorSchema("list.item")'],
		["verify", (registry) => registry.verify(), "verify()"],
	];

	for (const [label, end, by, resolvedPath] of enders) {
		it(`ends at ${label}: filter, nth and describe throw, naming it, and the record stays`, () => {
			for (const [method, step] of Object.entries(steps)) {
				const registry = createRegistry();
				const view = registry.add("btn").getByRole("button");
				end(registry);
				expect(() => step(view as never)).toThrowError(ended(method, "btn", by, resolvedPath));
				expect(registry.get("btn")).toEqual({
					locatorSchemaPath: "btn",
					definition: { type: "role", role: "button" },
					steps: [],
				});
			}
		});
	}

	it("ends when a query resolves, even a query started before the add", () => {
		for (const resolve of ["getLocator", "getNestedLocator"] as const) {
			const registry = createRegistry();
			const query = registry.getLocatorSchema("list.item");
			const view = registry.add("btn").getByRole("button");
			query[resolve]();
			expect(() => view.nth(0)).toThrowError(ended("nth", "btn", `a query's resolution of "list.item"`));
		}
	});

	it("ends at a getLocator in a filter's own arguments, and the message shows both ways to write the filter", () => {
		const registry = createRegistry();
		expect(() =>
			registry
				.add("btn")
				.getByRole("button")
				.filter({ has: registry.getLocator("list") }),
		).toThrowError(ended("filter", "btn", 'getLocator("list")', "list"));
		const resolvedFirst = registry.getLocator("list");
		registry.add("row").locator("tr").filter({ has: resolvedFirst });
		registry.add("x").locator("td").filter({ has: "list" });
		expect(chain(registry.getLocator("x"))).toBe("locator('td').filter({ has: locator('ul') })");
	});

	it("a locator method on a kept add(path) after another call throws and registers nothing", () => {
		const methods: [string, unknown[]][] = [
			["getByRole", ["button"]],
			["getByText", ["Save"]],
			["getByLabel", ["Email"]],
			["getByPlaceholder", ["Search"]],
			["getByAltText", ["Logo"]],
			["getByTitle", ["Help"]],
			["locator", ["p"]],
			["frameLocator", ["iframe"]],
			["getByTestId", ["row"]],
			["getById", ["main"]],
		];
		for (const [method, args] of methods) {
			const registry = createRegistry();
			const pending = registry.add("btn") as unknown as Record<string, (...rest: unknown[]) => unknown>;
			registry.add("x").locator("p");
			expect(() => pending[method]?.(...args)).toThrowError(ended(method, "btn", 'add("x")'));
			expect(registry.getIfExists("btn")).toBeUndefined();
		}
	});

	it("a seeded override after another call throws and the seed stays as registered", () => {
		const registry = createRegistry();
		const seed = registry.createReusable.getByRole("button", { name: "Save" });
		const held = registry.add("seeded", { reuse: seed });
		registry.add("x").locator("p");
		expect(() => held.getByRole({ name: "Cancel" })).toThrowError(ended("getByRole", "seeded", 'add("x")'));
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "button", options: { name: "Save" } });
	});

	it("the source of a reuse by path takes no step after the reuse", () => {
		const registry = createRegistry();
		const source = registry.add("btn").getByRole("button");
		registry.add("x", { reuse: "btn" }).nth("last");
		expect(() => source.filter({ hasText: "Open" })).toThrowError(ended("filter", "btn", 'add("x")'));
		expect(chain(registry.getLocator("btn"))).toBe("getByRole('button')");
		expect(chain(registry.getLocator("x"))).toBe("getByRole('button').last()");
	});

	it("reports the end before any other check of the call", () => {
		const registry = createRegistry();
		const view = registry.add("btn").getByRole("button");
		registry.add("x").frameLocator();
		const copy = registry.add("row", { reuse: "x" });
		registry.verify();
		expect(() => view.describe(null as never)).toThrowError(ended("describe", "btn", 'add("x")'));
		expect(() => copy.filter({ hasText: "x" })).toThrowError(ended("filter", "row", "verify()"));
	});

	it("stays open for steps right after add, in a loop and under a condition", () => {
		const registry = createRegistry();
		const view = registry.add("row").locator("tr");
		for (const hasText of ["Paid", "2026"]) {
			view.filter({ hasText });
		}
		const last = true;
		if (last) {
			view.nth("last");
		}
		expect(chain(registry.getLocator("row"))).toBe(
			"locator('tr').filter({ hasText: 'Paid' }).filter({ hasText: '2026' }).last()",
		);
	});

	it("stays open across createReusable and across another registry's calls", () => {
		const registry = createRegistry();
		const other = createRegistry();
		const view = registry.add("btn").getByRole("button");
		registry.createReusable.locator("p");
		other.add("x").locator("p");
		other.verify();
		view.nth(0);
		expect(chain(registry.getLocator("btn"))).toBe("getByRole('button').nth(0)");
	});
});
