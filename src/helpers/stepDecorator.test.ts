import { beforeEach, describe, expect, it, vi } from "vitest";

// test.step is replaced by a recorder; the steps in a real report are covered by the integration specs.
const recorded: { title: string; options: unknown }[] = [];
vi.mock("@playwright/test", () => ({
	test: {
		step: async (title: string, body: () => unknown, options?: unknown) => {
			recorded.push({ title, options });
			return body();
		},
	},
}));
const { step } = await import("./stepDecorator");

// vitest's transform does not lower decorator syntax, so the decorator is called as the compiler would call it;
// the decorator-syntax types are in stepDecorator.test-d.ts.
type Method = (this: unknown, ...args: unknown[]) => unknown;
const context = (name: string, isStatic: boolean, kind = "method") =>
	({ kind, name, static: isStatic, private: false }) as unknown as ClassMethodDecoratorContext;
const stage3 = (decorator: unknown, method: Method, ctx: ClassMethodDecoratorContext) =>
	(decorator as (value: Method, ctx: ClassMethodDecoratorContext) => Method)(method, ctx);

class Account {}

beforeEach(() => {
	recorded.length = 0;
});

describe("@step, stage-3 decorators", () => {
	it("titles an instance method Class.method and returns what the method resolves to", async () => {
		const wrapped = stage3(step(), async () => 7, context("load", false));
		await expect(wrapped.call(new Account())).resolves.toBe(7);
		expect(recorded).toEqual([{ title: "Account.load", options: undefined }]);
	});

	it("titles a static method by its class, not Function", async () => {
		const wrapped = stage3(step(), async () => "c", context("create", true));
		await wrapped.call(Account);
		expect(recorded.map((entry) => entry.title)).toEqual(["Account.create"]);
	});

	it("passes an explicit title and the options through", async () => {
		const wrapped = stage3(step("Open settings", { box: true }), async () => undefined, context("open", false));
		await wrapped.call(new Account());
		expect(recorded).toEqual([{ title: "Open settings", options: { box: true } }]);
	});

	it("works as a bare decorator", async () => {
		const wrapped = stage3(step, async () => undefined, context("bare", false));
		await wrapped.call(new Account());
		expect(recorded.map((entry) => entry.title)).toEqual(["Account.bare"]);
	});

	it("rejects anything that is not a method", () => {
		for (const kind of ["getter", "setter", "field", "accessor"]) {
			expect(() => stage3(step(), async () => 1, context("value", false, kind)), kind).toThrowError(
				"@step decorator can only be applied to methods.",
			);
		}
	});
});

describe("@step, legacy decorators (experimentalDecorators)", () => {
	const legacy = (decorator: unknown, target: object, key: string, method: Method) => {
		const descriptor: PropertyDescriptor = { value: method, writable: true, configurable: true };
		const result = (decorator as (t: object, k: string, d: PropertyDescriptor) => PropertyDescriptor | undefined)(
			target,
			key,
			descriptor,
		);
		return (result ?? descriptor).value as Method;
	};

	it("wraps instance and static methods, with @step() and bare @step", async () => {
		await legacy(step(), Account.prototype, "load", async () => 1).call(new Account());
		await legacy(step, Account.prototype, "bare", async () => 1).call(new Account());
		await legacy(step(), Account, "create", async () => 1).call(Account);
		await legacy(step, Account, "createBare", async () => 1).call(Account);
		expect(recorded.map((entry) => entry.title)).toEqual([
			"Account.load",
			"Account.bare",
			"Account.create",
			"Account.createBare",
		]);
	});

	it("rejects a descriptor without a function", () => {
		expect(() =>
			(step() as unknown as (t: object, k: string, d: object) => unknown)(Account.prototype, "x", {}),
		).toThrowError("@step decorator can only be applied to methods.");
	});
});
