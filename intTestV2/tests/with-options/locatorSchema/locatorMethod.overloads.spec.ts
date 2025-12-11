import { expect, test } from "@fixtures-v2/withOptions";
import { LocatorRegistry } from "pomwright";

test("add getByRole overloads accept optional options and support chained steps", async ({ page, log }) => {
	type LocalPath = "root" | "root.options" | "root.minimal";
	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("root").locator("body");

	registry.add("root.options").getByRole("button", { name: "opts" }).filter({ hasText: "filtered" }).nth("last");
	registry.add("root.minimal").getByRole("button");

	expect(registry.get("root.options")).toEqual({
		locatorSchemaPath: "root.options",
		definition: { type: "role", role: "button", options: { name: "opts" } },
		steps: [
			{ kind: "filter", filter: { hasText: "filtered" } },
			{ kind: "index", index: "last" },
		],
	});

	expect(registry.get("root.minimal")).toEqual({
		locatorSchemaPath: "root.minimal",
		definition: { type: "role", role: "button" },
		steps: [],
	});
});

test("update getByRole overloads preserve patch semantics without undefined placeholders", async ({ page, log }) => {
	type LocalPath = "overload" | "overload.target";
	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("overload").locator("body");
	registry.add("overload.target").getByRole("button", { name: "initial" }).filter({ hasText: "initial" }).nth(0);

	const withRoleAndOptions = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole("button", { name: "patched" })
		.filter("overload.target", { hasText: "patched" })
		.nth("overload.target", "last")
		.getNestedLocator();

	expect(`${withRoleAndOptions}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withRoleAndOptions}`).toContain("filter({ hasText: 'patched' })");
	expect(`${withRoleAndOptions}`).toContain("last()");

	const withOptionsOnly = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole({ name: "patched" })
		.getNestedLocator();

	expect(`${withOptionsOnly}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withOptionsOnly}`).toContain("filter({ hasText: 'initial' })");
	expect(`${withOptionsOnly}`).toContain("first()");
});

test("add overloads support other strategies with options and chained steps", async ({ page, log }) => {
	type LocalPath = "root.text" | "root.locator" | "root.frame";

	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("root.text").getByText("needle", { exact: true }).filter({ hasText: "filtered" }).nth(0);
	registry.add("root.locator").locator(".selector", { hasText: "opt" }).filter({ hasText: "filtered" }).nth(0);
	registry.add("root.frame").frameLocator("iframe[name=child]");

	expect(registry.get("root.text")).toEqual({
		locatorSchemaPath: "root.text",
		definition: { type: "text", text: "needle", options: { exact: true } },
		steps: [
			{ kind: "filter", filter: { hasText: "filtered" } },
			{ kind: "index", index: 0 },
		],
	});

	expect(registry.get("root.locator")).toEqual({
		locatorSchemaPath: "root.locator",
		definition: { type: "locator", selector: ".selector", options: { hasText: "opt" } },
		steps: [
			{ kind: "filter", filter: { hasText: "filtered" } },
			{ kind: "index", index: 0 },
		],
	});

	expect(registry.get("root.frame")).toEqual({
		locatorSchemaPath: "root.frame",
		definition: { type: "frameLocator", selector: "iframe[name=child]" },
		steps: [],
	});
});

test("update overloads cover multiple strategies and retain filter/index steps", async ({ page, log }) => {
	type LocalPath = "update.text" | "update.locator" | "update.frame";
	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("update.text").getByText("seed");
	registry.add("update.locator").locator(".seed");
	registry.add("update.frame").frameLocator("iframe[name=seed]");

	const textPatched = await registry
		.getLocatorSchema("update.text")
		.update("update.text")
		.getByText({ exact: true })
		.filter("update.text", { hasText: "patched" })
		.nth("update.text", 0)
		.getNestedLocator();

	expect(`${textPatched}`).toEqual("getByText('seed', { exact: true }).filter({ hasText: 'patched' }).first()");

	const locatorPatched = await registry
		.getLocatorSchema("update.locator")
		.update("update.locator")
		.locator({ hasText: "opt" })
		.filter("update.locator", { hasText: "patched" })
		.nth("update.locator", 0)
		.getNestedLocator();

	expect(`${locatorPatched}`).toEqual(
		"locator('.seed').filter({ hasText: 'opt' }).filter({ hasText: 'patched' }).first()",
	);

	const framePatched = await registry
		.getLocatorSchema("update.frame")
		.update("update.frame")
		.frameLocator()
		.getNestedLocator();

	expect(`${framePatched}`).toEqual("locator('iframe[name=seed]')");
});
