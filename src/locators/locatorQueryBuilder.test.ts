import type { Page } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createFakePage, type FakeLocator } from "./fakePage";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import { LocatorRegistryInternal } from "./locatorRegistry";

type Paths = "main" | "list" | "list.item";
// Building a query never touches the page; resolution is covered by the integration specs.
const createRegistry = () => {
	const registry = new LocatorRegistryInternal<Paths>({} as Page);
	registry.add("main").locator("main");
	registry.add("list").locator("ul");
	registry.add("list.item").getByRole("listitem");
	return registry;
};

describe("types", () => {
	it("every step of the chain is the public LocatorQueryBuilder", () => {
		const query = createRegistry().getLocatorSchema("list.item");
		expectTypeOf(query).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.filter({ hasText: "x" })).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.filter("list", { hasText: "x" })).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.nth(0)).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.clearSteps()).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.skip("list")).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.unskip("list")).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.describe("d")).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.update().getByRole("listitem")).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
		expectTypeOf(query.replace().getByRole("listitem")).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
	});
});

// Type-level contract. Never called; vitest's typecheck mode reports an unused @ts-expect-error.
const typeContract = (registry: LocatorRegistryInternal<Paths>) => {
	const query = registry.getLocatorSchema("list.item");
	// @ts-expect-error internal, private
	query.applyUpdate("list.item", { type: "role" });
	// @ts-expect-error internal, private
	query.filter({ hasText: "x" }).applyReplacement("list.item", { type: "locator", selector: "li" });
	// @ts-expect-error internal, private
	query.nth(0).applyUpdate("list.item", { type: "role", role: "listitem" });
	// @ts-expect-error internal, private
	query.clearSteps().applyUpdate("list.item", { type: "role" });
	// @ts-expect-error internal, private
	query.describe("d").applyReplacement("list.item", { type: "testId", testId: "t" });
	// @ts-expect-error internal, private
	query.skip("list").applyUpdate("list.item", { type: "locator" });
	// @ts-expect-error internal, private
	query.update().getByRole("listitem").applyReplacement("list.item", { type: "id", id: "x" });
	// @ts-expect-error internal, private
	query.replace().getByRole("listitem").applyUpdate("list.item", { type: "role" });
	query.update("list");
	const named: LocatorQueryBuilder<Paths, "list.item"> = query;
	// @ts-expect-error "main" is not in the chain of "list.item", also through the public name
	named.update("main");
	// @ts-expect-error the terminal path cannot be skipped
	query.skip("list.item");
	// @ts-expect-error skip needs a sub-path
	query.skip();
	// @ts-expect-error not a segment of "list.item"
	query.skip("main");
	// @ts-expect-error remove() is replaced by skip() and unskip()
	query.remove("list");
	// @ts-expect-error a one-segment query has nothing to skip
	registry.getLocatorSchema("list").skip("list");
	// @ts-expect-error describe takes a string; describe("") removes the description
	query.describe(null);
	query.describe("");
};
void typeContract;

// Runtime: a fake page records the chain each locator was built from.
type ChainPaths = "main" | "main.list" | "main.list.item" | "a" | "a.b.c";
const createChainRegistry = () => {
	const registry = new LocatorRegistryInternal<ChainPaths>(createFakePage());
	registry.add("main").locator("main");
	registry.add("main.list").locator("ul").filter({ hasText: "Orders" }).describe("the list");
	registry.add("main.list.item").locator("li").nth(0).describe("first item");
	registry.add("a").locator("section");
	registry.add("a.b.c").locator("p"); // "a.b" is a segment of the path without a registration
	return registry;
};
const REGISTERED = "locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').nth(0)";

describe("update with an explicit undefined first argument", () => {
	it("keeps the registered one, as an omitted argument does, with or without options", () => {
		const query = () => createChainRegistry().getLocatorSchema("main.list.item");
		expect(String(query().update().locator(undefined, { hasText: "Open" }).getLocator())).toBe(
			"locator('li', { hasText: 'Open' }).nth(0)",
		);
		expect(String(query().update().locator(undefined).getLocator())).toBe("locator('li').nth(0)");
	});
});

describe("skip and unskip", () => {
	it("leave an ancestor out of the chain and bring it back exactly as it was", () => {
		const query = createChainRegistry().getLocatorSchema("main.list.item");
		expect(String(query.skip("main.list").getNestedLocator())).toBe("locator('main').locator('li').nth(0)");
		const restored = query.unskip("main.list").getNestedLocator();
		expect(String(restored)).toBe(REGISTERED);
		expect((restored as unknown as FakeLocator).description()).toBe("first item");
	});

	it("keep what the segment was given before the skip", () => {
		const query = createChainRegistry()
			.getLocatorSchema("main.list.item")
			.filter("main.list", { hasText: "Open" })
			.skip("main.list")
			.unskip("main.list");
		expect(String(query.getNestedLocator())).toBe(
			"locator('main').locator('ul').filter({ hasText: 'Orders' }).filter({ hasText: 'Open' }).locator('li').nth(0)",
		);
	});

	it("leave getLocator alone, which resolves the terminal only", () => {
		const query = createChainRegistry().getLocatorSchema("main.list.item").skip("main").skip("main.list");
		expect(String(query.getLocator())).toBe("locator('li').nth(0)");
	});

	it("reject a change to a skipped segment, naming unskip", () => {
		const skipped = () => createChainRegistry().getLocatorSchema("main.list.item").skip("main.list");
		const unskip = 'it is skipped in this query; call unskip("main.list") first.';
		expect(() => skipped().update("main.list")).toThrowError(`update() cannot apply to "main.list": ${unskip}`);
		expect(() => skipped().replace("main.list")).toThrowError(`replace() cannot apply to "main.list": ${unskip}`);
		expect(() => skipped().filter("main.list", { hasText: "x" })).toThrowError(
			`filter() cannot apply to "main.list": ${unskip}`,
		);
		expect(() => skipped().nth("main.list", 1)).toThrowError(`nth() cannot apply to "main.list": ${unskip}`);
		expect(() => skipped().clearSteps("main.list")).toThrowError(`clearSteps() cannot apply to "main.list": ${unskip}`);
	});

	it("reject a change from an update() or replace() builder kept from before the skip, changing nothing", () => {
		const unskip = 'it is skipped in this query; call unskip("main.list") first.';
		const query = createChainRegistry().getLocatorSchema("main.list.item");
		const pendingUpdate = query.update("main.list");
		const pendingReplace = query.replace("main.list");
		query.skip("main.list");
		expect(() => pendingUpdate.locator("ol")).toThrowError(`update() cannot apply to "main.list": ${unskip}`);
		expect(() => pendingReplace.getByRole("list")).toThrowError(`replace() cannot apply to "main.list": ${unskip}`);
		expect(String(query.unskip("main.list").getNestedLocator())).toBe(REGISTERED);
	});

	it("leave the query unchanged when such a call throws", () => {
		const query = createChainRegistry().getLocatorSchema("main.list.item").skip("main.list");
		expect(() => query.update("main.list")).toThrow();
		expect(String(query.unskip("main.list").getNestedLocator())).toBe(REGISTERED);
	});

	it("reject a second skip, a stray unskip, and the terminal from JavaScript", () => {
		const query = createChainRegistry().getLocatorSchema("main.list.item");
		const loose = query as unknown as { skip: (path?: string) => unknown };
		expect(() => query.unskip("main.list")).toThrowError(
			'unskip() cannot unskip "main.list": it is not skipped in this query.',
		);
		query.skip("main.list");
		expect(() => query.skip("main.list")).toThrowError(
			'skip() cannot skip "main.list": it is already skipped in this query.',
		);
		expect(() => loose.skip("main.list.item")).toThrowError(
			'skip() cannot skip "main.list.item": it is the path this query resolves; skip one of its ancestors.',
		);
		expect(() => loose.skip()).toThrowError('"undefined" is not a valid sub-path of "main.list.item".');
	});

	it("replace remove, which no longer exists", () => {
		const query = createChainRegistry().getLocatorSchema("main.list.item") as unknown as Record<string, unknown>;
		expect(query.remove).toBeUndefined();
	});
});

describe("sub-path errors", () => {
	it("give the reason when the sub-path is a segment of the path without a registration", () => {
		const query = createChainRegistry().getLocatorSchema("a.b.c") as unknown as {
			filter: (path: string, filter: object) => unknown;
		};
		expect(() => query.filter("a.b", { hasText: "x" })).toThrowError(
			'"a.b" is not a valid sub-path of "a.b.c". It is a segment of that path, but no locator schema is registered for it.',
		);
	});

	it("keep the single sentence for a path outside the chain", () => {
		const query = createChainRegistry().getLocatorSchema("a.b.c") as unknown as {
			filter: (path: string, filter: object) => unknown;
		};
		let message = "";
		try {
			query.filter("main", { hasText: "x" });
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toBe('"main" is not a valid sub-path of "a.b.c".');
	});
});

describe("describe on a query", () => {
	it('removes the description with "" and rejects anything but a string', () => {
		const registry = createChainRegistry();
		const plain = registry.getLocatorSchema("main.list.item").describe("").getNestedLocator();
		expect((plain as unknown as FakeLocator).description()).toBeNull();
		const query = registry.getLocatorSchema("main.list.item") as unknown as { describe: (value: unknown) => unknown };
		expect(() => query.describe(null)).toThrowError(
			'describe requires a string for "main.list.item"; pass "" to remove the description.',
		);
		expect(() => query.describe(undefined)).toThrowError(
			'describe requires a string for "main.list.item"; pass "" to remove the description.',
		);
	});
});

describe("the any-frame form in a query", () => {
	type FramePaths = "frame" | "frame.btn" | "main" | "main.frame" | "main.frame.btn" | "any" | "any.btn";
	const createFrameRegistry = () => {
		const registry = new LocatorRegistryInternal<FramePaths>(createFakePage());
		registry.add("frame").frameLocator("iframe").nth(1);
		registry.add("frame.btn").getByRole("button");
		registry.add("main").locator("main");
		registry.add("main.frame").frameLocator("iframe");
		registry.add("main.frame.btn").getByRole("button");
		registry.add("any").frameLocator();
		registry.add("any.btn").getByRole("button");
		return registry;
	};
	const STEPPED =
		'replace() cannot apply to "frame": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("frame") first.';
	const anyFrameSteps = (method: string, path: string) =>
		`${method} cannot apply to "${path}": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`;

	it("replace().frameLocator() on a segment with steps throws at the call, naming clearSteps, and changes nothing", () => {
		const query = createFrameRegistry().getLocatorSchema("frame.btn");
		expect(() => query.replace("frame").frameLocator()).toThrowError(STEPPED);
		expect(String(query.getNestedLocator())).toBe("locator('iframe').nth(1).contentFrame().getByRole('button')");
		const added = createFrameRegistry().getLocatorSchema("main.frame.btn").nth("main.frame", 0);
		expect(() => added.replace("main.frame").frameLocator()).toThrowError(
			'replace() cannot apply to "main.frame": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("main.frame") first.',
		);
	});

	it("after clearSteps the replacement resolves; query methods chain in any order", () => {
		const query = createFrameRegistry()
			.getLocatorSchema("frame.btn")
			.clearSteps("frame")
			.replace("frame")
			.frameLocator();
		expect(String(query.getNestedLocator())).toBe("frameLocator().getByRole('button')");
	});

	it("replace().frameLocator() on the query's own path throws at the call", () => {
		const query = createFrameRegistry().getLocatorSchema("frame.btn");
		expect(() => query.replace().frameLocator()).toThrowError(
			'replace() cannot apply to "frame.btn": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.',
		);
	});

	it("the first-segment rule stays at resolution, where the chain is known", () => {
		const query = createFrameRegistry().getLocatorSchema("main.frame.btn").replace("main.frame").frameLocator();
		expect(() => query.getNestedLocator()).toThrowError(
			'frameLocator() without a selector must be the first segment of the chain; "main.frame" has the ancestor "main".',
		);
		const skipped = createFrameRegistry()
			.getLocatorSchema("main.frame.btn")
			.replace("main.frame")
			.frameLocator()
			.skip("main");
		expect(String(skipped.getNestedLocator())).toBe("frameLocator().getByRole('button')");
	});

	it("filter and nth on an any-frame segment give the message add gives", () => {
		const query = createFrameRegistry().getLocatorSchema("any.btn");
		expect(() => query.nth("any", 1)).toThrowError(anyFrameSteps("nth()", "any"));
		expect(() => query.filter("any", { visible: true })).toThrowError(anyFrameSteps("filter()", "any"));
	});
});
