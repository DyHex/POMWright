import type { Page } from "@playwright/test";
import { describe, expect, it } from "vitest";
import { createFakePage, type FakeLocator } from "./fakePage";
import { LocatorRegistryInternal } from "./locatorRegistry";

// Seeds from createReusable: what the factory accepts, and a seed as a value. Registering a seed never touches the
// page, so a bare object is enough there; the variants are resolved on the fake page, which records each chain
// (fakePage.ts says what it stands in for and could hide). add.reuseReusable.spec.ts reuses seeds for real.
type Paths = "a" | "a.b" | "seeded" | "anyFrame" | "anyFrame.button";
const stubPage = {} as Page;
const createRegistry = () => new LocatorRegistryInternal<Paths>(stubPage);
const chain = (locator: unknown) => String(locator);

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

describe("a seed is a value", () => {
	it("filter, nth and describe return a new seed and leave the one they were called on as it was", () => {
		const base = createRegistry().createReusable.getByRole("row", { name: "Order" }).describe("Order row");
		const filtered = base.filter({ hasText: "Paid" });
		const indexed = base.nth(0);
		const described = base.describe("Other");
		for (const derived of [filtered, indexed, described]) {
			expect(derived).not.toBe(base);
		}
		expect(base.steps).toEqual([]);
		expect(base.description).toBe("Order row");
		expect(filtered.steps).toEqual([{ kind: "filter", filter: { hasText: "Paid" } }]);
		expect(indexed.steps).toEqual([{ kind: "index", index: 0 }]);
		expect(described.description).toBe("Other");
		expect(filtered.description).toBe("Order row");
	});

	it("a variant of a variant carries both steps; the first variant keeps its own", () => {
		const base = createRegistry().createReusable.locator("tr");
		const paid = base.filter({ hasText: "Paid" });
		const firstPaid = paid.nth(0);
		expect(paid.steps).toEqual([{ kind: "filter", filter: { hasText: "Paid" } }]);
		expect(firstPaid.steps).toEqual([
			{ kind: "filter", filter: { hasText: "Paid" } },
			{ kind: "index", index: 0 },
		]);
	});

	it("definition and steps are copies: changing them changes nothing", () => {
		const registry = createRegistry();
		const seed = registry.createReusable.getByRole("button", { name: "Save" }).filter({ hasText: "x" });
		expect(seed.definition).not.toBe(seed.definition);
		(seed.definition.options as { name: string }).name = "Changed";
		(seed.steps as unknown[]).push({ kind: "index", index: 0 });
		registry.add("seeded", { reuse: seed });
		expect(registry.get("seeded").definition).toEqual({ type: "role", role: "button", options: { name: "Save" } });
		expect(registry.get("seeded").steps).toEqual([{ kind: "filter", filter: { hasText: "x" } }]);
	});

	it("describe still requires a string", () => {
		const seed = createRegistry().createReusable.locator("tr");
		expect(() => seed.describe(undefined as never)).toThrowError("createReusable.describe");
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
