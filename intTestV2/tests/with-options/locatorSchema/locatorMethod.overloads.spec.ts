import { expect, test } from "@fixtures-v2/withOptions";
import { LocatorRegistry } from "pomwright";

test("add getByRole overloads accept varied argument orders", async ({ page, log }) => {
	type LocalPath = "root" | "root.optionsConfig" | "root.optionsOnly" | "root.configOnly" | "root.minimal";
	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("root").locator("body");

	const config = { filters: { hasText: "filtered" }, index: "last" as const };

	registry.add("root.optionsConfig").getByRole("button", { name: "opts" }, config);
	registry.add("root.optionsOnly").getByRole("button", { name: "opts" });
	registry.add("root.configOnly").getByRole("button", config);
	registry.add("root.minimal").getByRole("button");

	expect(registry.get("root.optionsConfig").definition).toEqual({
		type: "role",
		role: "button",
		options: { name: "opts" },
	});
	expect(registry.get("root.optionsConfig").filters).toEqual([{ hasText: "filtered" }]);
	expect(registry.get("root.optionsConfig").index).toBe("last");

	expect(registry.get("root.optionsOnly").definition).toEqual({
		type: "role",
		role: "button",
		options: { name: "opts" },
	});
	expect(registry.get("root.optionsOnly").filters).toBeUndefined();
	expect(registry.get("root.optionsOnly").index).toBeNull();

	expect(registry.get("root.configOnly").definition).toEqual({
		type: "role",
		role: "button",
	});
	expect(registry.get("root.configOnly").filters).toEqual([{ hasText: "filtered" }]);
	expect(registry.get("root.configOnly").index).toBe("last");

	expect(registry.get("root.minimal").definition).toEqual({
		type: "role",
		role: "button",
	});
	expect(registry.get("root.minimal").filters).toBeUndefined();
	expect(registry.get("root.minimal").index).toBeNull();
});

test("update getByRole overloads preserve patch semantics without undefined placeholders", async ({ page, log }) => {
	type LocalPath = "overload" | "overload.target";
	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("overload").locator("body");
	registry
		.add("overload.target")
		.getByRole("button", { name: "initial" }, { filters: { hasText: "initial" }, index: 0 });

	const config = { filters: { hasText: "patched" }, index: "last" as const };

	const withRoleAndOptions = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole("button", { name: "patched" }, config)
		.getNestedLocator();

	expect(`${withRoleAndOptions}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withRoleAndOptions}`).toContain("filter({ hasText: 'patched' })");
	expect(`${withRoleAndOptions}`).toContain("last()");

	const withRoleAndConfig = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole("button", config)
		.getNestedLocator();

	expect(`${withRoleAndConfig}`).toContain("getByRole('button', { name: 'initial' })");
	expect(`${withRoleAndConfig}`).toContain("filter({ hasText: 'patched' })");
	expect(`${withRoleAndConfig}`).toContain("last()");

	const withOptionsOnly = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole({ name: "patched" })
		.getNestedLocator();

	expect(`${withOptionsOnly}`).toContain("getByRole('button', { name: 'patched' })");
	expect(`${withOptionsOnly}`).toContain("filter({ hasText: 'initial' })");
	expect(`${withOptionsOnly}`).toContain("first()");

	const withConfigOnly = await registry
		.getLocatorSchema("overload.target")
		.update("overload.target")
		.getByRole(config)
		.getNestedLocator();

	expect(`${withConfigOnly}`).toContain("getByRole('button', { name: 'initial' })");
	expect(`${withConfigOnly}`).toContain("filter({ hasText: 'patched' })");
	expect(`${withConfigOnly}`).toContain("last()");
});

test("add overloads support other strategies with config and options", async ({ page, log }) => {
	type LocalPath =
		| "root.text.optionsConfig"
		| "root.text.configOnly"
		| "root.locator.optionsConfig"
		| "root.frame.configOnly";

	const registry = new LocatorRegistry<LocalPath>(page, log);

	const config = { filters: { hasText: "filtered" }, index: 0 as const };

	registry.add("root.text.optionsConfig").getByText("needle", { exact: true }, config);
	registry.add("root.text.configOnly").getByText("needle", config);
	registry.add("root.locator.optionsConfig").locator(".selector", { hasText: "opt" }, config);
	registry.add("root.frame.configOnly").frameLocator("iframe[name=child]", config);

	expect(registry.get("root.text.optionsConfig").definition).toEqual({
		type: "text",
		text: "needle",
		options: { exact: true },
	});
	expect(registry.get("root.text.optionsConfig").filters).toEqual([{ hasText: "filtered" }]);
	expect(registry.get("root.text.optionsConfig").index).toBe(0);

	expect(registry.get("root.text.configOnly").definition).toEqual({ type: "text", text: "needle" });
	expect(registry.get("root.text.configOnly").filters).toEqual([{ hasText: "filtered" }]);
	expect(registry.get("root.text.configOnly").index).toBe(0);

	expect(registry.get("root.locator.optionsConfig").definition).toEqual({
		type: "locator",
		selector: ".selector",
		options: { hasText: "opt" },
	});
	expect(registry.get("root.locator.optionsConfig").filters).toEqual([{ hasText: "filtered" }]);
	expect(registry.get("root.locator.optionsConfig").index).toBe(0);

	expect(registry.get("root.frame.configOnly").definition).toEqual({
		type: "frameLocator",
		selector: "iframe[name=child]",
	});
	expect(registry.get("root.frame.configOnly").filters).toEqual([{ hasText: "filtered" }]);
	expect(registry.get("root.frame.configOnly").index).toBe(0);
});

test("update overloads cover multiple strategies and retain filter/index patches", async ({ page, log }) => {
	type LocalPath = "update.text" | "update.locator" | "update.frame";
	const registry = new LocatorRegistry<LocalPath>(page, log);

	registry.add("update.text").getByText("seed");
	registry.add("update.locator").locator(".seed");
	registry.add("update.frame").frameLocator("iframe[name=seed]");

	const config = { filters: { hasText: "patched" }, index: 0 as const };

	const textPatched = await registry
		.getLocatorSchema("update.text")
		.update("update.text")
		.getByText({ exact: true }, config)
		.getNestedLocator();

	expect(`${textPatched}`).toEqual("getByText('seed', { exact: true }).filter({ hasText: 'patched' }).first()");

	const locatorPatched = await registry
		.getLocatorSchema("update.locator")
		.update("update.locator")
		.locator({ hasText: "opt" }, config)
		.getNestedLocator();

	expect(`${locatorPatched}`).toEqual(
		"locator('.seed').filter({ hasText: 'opt' }).filter({ hasText: 'patched' }).first()",
	);

	const framePatched = await registry
		.getLocatorSchema("update.frame")
		.update("update.frame")
		.frameLocator(config)
		.getNestedLocator();

	expect(`${framePatched}`).toEqual("locator('iframe[name=seed]')");
});
