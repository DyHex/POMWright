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

class Generic {
	@step()
	async echo<T>(value: T): Promise<T> {
		return value;
	}

	@step
	async echoBare<T>(value: T): Promise<T> {
		return value;
	}

	@step({ box: true })
	async pick<K extends "card" | "invoice">(key: K): Promise<K> {
		return key;
	}

	async overloaded(value: string): Promise<string>;
	async overloaded(value: number): Promise<number>;
	@step()
	async overloaded(value: string | number): Promise<string | number> {
		return value;
	}

	@step()
	async returnsThis(): Promise<this> {
		return this;
	}

	@step()
	async withThis(this: Generic, count: number, label?: string): Promise<string> {
		return `${count}${label}`;
	}
}

// every @ts-expect-error below is the assertion: each form keeps the compile error
class Rejected {
	// @ts-expect-error a getter is not a method
	@step()
	get value(): Promise<number> {
		return Promise.resolve(1);
	}

	// @ts-expect-error a setter is not a method
	@step()
	set value(_value: Promise<number>) {}

	// @ts-expect-error a field is not a method
	@step()
	handler = async () => {};

	// @ts-expect-error a PromiseLike is not a Promise
	@step()
	thenable(): PromiseLike<number> {
		return Promise.resolve(1);
	}

	// @ts-expect-error a method that may return a plain value
	@step()
	maybe(): Promise<number> | number {
		return 1;
	}

	// @ts-expect-error a generic method that does not return a Promise
	@step()
	plainGeneric<T>(value: T): T {
		return value;
	}
}

test("a decorated method keeps its type", () => {
	expectTypeOf(new Account().load()).toEqualTypeOf<Promise<number>>();
	expectTypeOf(Account.create()).toEqualTypeOf<Promise<Account>>();
});

test("a method that does not return a Promise is refused, generic or not", () => {
	expectTypeOf<Rejected>().toBeObject();
});

test("a decorated generic method keeps its type parameters", () => {
	const generic = new Generic();
	expectTypeOf(generic.echo<number>(1)).toEqualTypeOf<Promise<number>>();
	expectTypeOf(generic.echoBare<string>("x")).toEqualTypeOf<Promise<string>>();
	expectTypeOf(generic.pick("card")).toEqualTypeOf<Promise<"card">>();
	expectTypeOf(generic.overloaded(1)).toEqualTypeOf<Promise<number>>();
	expectTypeOf(generic.returnsThis()).toEqualTypeOf<Promise<Generic>>();
	expectTypeOf(generic.withThis(1)).toEqualTypeOf<Promise<string>>();
	// @ts-expect-error the type argument still constrains the argument
	generic.echo<number>("x");
	// @ts-expect-error the constraint still holds
	generic.pick("cash");
});
