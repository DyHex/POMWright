import { expectTypeOf, test } from "vitest";
import { step } from "./stepDecorator";

// Type-only: vitest type-checks this file and never runs it, since its transform does not lower decorators.
class Account {
	@step()
	async load(): Promise<number> {
		return 1;
	}

	@step
	async bare(): Promise<void> {}

	@step("Open settings", { box: true })
	async open(): Promise<string> {
		return "s";
	}

	@step()
	static async create(): Promise<Account> {
		return new Account();
	}

	@step()
	promiseReturning(): Promise<number> {
		return Promise.resolve(1);
	}

	// @ts-expect-error a sync method: test.step would make it return a Promise ("@step decorates methods that return a Promise")
	@step()
	sync(): number {
		return 1;
	}

	// @ts-expect-error the same for the bare form
	@step
	syncVoid(): void {}
}

test("a decorated method keeps its type", () => {
	expectTypeOf(new Account().load()).toEqualTypeOf<Promise<number>>();
	expectTypeOf(Account.create()).toEqualTypeOf<Promise<Account>>();
});
