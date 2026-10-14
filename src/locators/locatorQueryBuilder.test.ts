import type { Page } from "@playwright/test";
import { describe, expectTypeOf, it } from "vitest";
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
		expectTypeOf(query.remove("list")).toEqualTypeOf<LocatorQueryBuilder<Paths, "list.item">>();
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
	query.remove("list").applyUpdate("list.item", { type: "locator" });
	// @ts-expect-error internal, private
	query.update().getByRole("listitem").applyReplacement("list.item", { type: "id", id: "x" });
	// @ts-expect-error internal, private
	query.replace().getByRole("listitem").applyUpdate("list.item", { type: "role" });
	query.update("list");
	const named: LocatorQueryBuilder<Paths, "list.item"> = query;
	// @ts-expect-error "main" is not in the chain of "list.item", also through the public name
	named.update("main");
};
void typeContract;
