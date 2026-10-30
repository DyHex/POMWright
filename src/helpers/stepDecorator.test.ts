import { beforeEach, describe, expect, it, vi } from "vitest";

// test.step is replaced by a recorder, a stand-in for Playwright's runner, so a test reads the title and options each
// call passes without a run. It could hide what the runner does with them: the step in the report, its location, an
// error inside it, boxing. test/tests/step/step.spec.ts and test/step-locations/ check those through the runner.
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

	it("titles a method by the class of the object it runs on: an inherited method shows the subclass", async () => {
		class Base {}
		class Derived extends Base {}
		const inherited = stage3(step(), async () => undefined, context("open", false));
		await inherited.call(new Derived());
		await inherited.call(new Base());
		expect(recorded.map((entry) => entry.title)).toEqual(["Derived.open", "Base.open"]);
	});

	it("gives an override that calls super two steps with one title", async () => {
		class Base {}
		class Derived extends Base {}
		const baseOpen = stage3(step(), async () => "base", context("open", false));
		const derivedOpen = stage3(
			step(),
			async function (this: unknown) {
				return baseOpen.call(this); // super.open(), as the compiler calls it
			},
			context("open", false),
		);
		await expect(derivedOpen.call(new Derived())).resolves.toBe("base");
		expect(recorded.map((entry) => entry.title)).toEqual(["Derived.open", "Derived.open"]);
	});

	it("passes an explicit title and the options through, a boxed step with its caller's line", async () => {
		const wrapped = stage3(step("Open settings", { box: true }), async () => undefined, context("open", false));
		await wrapped.call(new Account());
		const location = expect.objectContaining({ file: expect.stringMatching(/stepDecorator\.test\.ts$/) });
		expect(recorded).toEqual([{ title: "Open settings", options: { box: true, location } }]);
	});

	it("keeps a location the caller passes", async () => {
		const location = { file: "/suite/checkout.ts", line: 3, column: 5 };
		const wrapped = stage3(step({ box: true, location }), async () => undefined, context("pay", false));
		await wrapped.call(new Account());
		expect(recorded).toEqual([{ title: "Account.pay", options: { box: true, location } }]);
	});

	it("runs a method called without its object, with its own title or as Anonymous.method", async () => {
		const titled = stage3(step("Add an item"), async () => "added", context("addItem", false));
		const untitled = stage3(step(), async () => "added", context("addItem", false));
		for (const method of [titled, untitled]) {
			await expect(method.call(undefined)).resolves.toBe("added");
		}
		const boxed = stage3(step({ box: true }), async () => "added", context("addItem", false));
		await expect(boxed.call(undefined)).resolves.toBe("added");
		expect(recorded.map((entry) => entry.title)).toEqual(["Add an item", "Anonymous.addItem", "Anonymous.addItem"]);
	});

	it("works as a bare decorator", async () => {
		const wrapped = stage3(step, async () => undefined, context("bare", false));
		await wrapped.call(new Account());
		expect(recorded.map((entry) => entry.title)).toEqual(["Account.bare"]);
	});

	it("rejects, in the step, a method that returns a plain value, boxed or not, with the compile error's text", async () => {
		const message = "@step decorates methods that return a Promise: make the method async";
		for (const decorator of [step(), step({ box: true })]) {
			const plain = stage3(decorator, () => 42, context("total", false));
			const error = await (plain.call(new Account()) as Promise<unknown>).catch((thrown: unknown) => thrown);
			expect(error).toBeInstanceOf(TypeError);
			expect((error as TypeError).message).toBe(message);
		}
		// the step opened, and the error is its body's
		expect(recorded.map((entry) => entry.title)).toEqual(["Account.total", "Account.total"]);
	});

	it("accepts a method that returns a thenable that is not a Promise", async () => {
		// biome-ignore lint/suspicious/noThenProperty: the test needs a thenable that is not a Promise
		const thenable = { then: (resolve: (value: number) => void) => resolve(7) };
		const wrapped = stage3(step(), () => thenable, context("later", false));
		await expect(wrapped.call(new Account())).resolves.toBe(7);
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

	it("rejects, in the step, a method that returns a plain value", async () => {
		const plain = legacy(step(), Account.prototype, "total", () => 42);
		const error = await (plain.call(new Account()) as Promise<unknown>).catch((thrown: unknown) => thrown);
		expect(error).toBeInstanceOf(TypeError);
		expect((error as TypeError).message).toBe("@step decorates methods that return a Promise: make the method async");
	});

	it("rejects a descriptor without a function", () => {
		expect(() =>
			(step() as unknown as (t: object, k: string, d: object) => unknown)(Account.prototype, "x", {}),
		).toThrowError("@step decorator can only be applied to methods.");
	});
});
