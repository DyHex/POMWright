// Compile-only: @step under experimentalDecorators (tsconfig.legacyDecorators.json) and under the standard decorators
// of the harness's own tsconfig; both run in pnpm typecheck, which enforces every @ts-expect-error.
import { type StepDecorator, step } from "pomwright";

// a preconfigured decorator, stored and shared
export const boxedStep: StepDecorator = step({ box: true });

export class Checkout {
	@boxedStep
	async stored(): Promise<void> {}

	@step
	async bare(): Promise<void> {}

	@step()
	async called(): Promise<void> {}

	@step("Pay with the test card", { box: true })
	async titled(): Promise<number> {
		return 1;
	}

	@step
	static async create(): Promise<Checkout> {
		return new Checkout();
	}

	@step
	async choose<Method extends "card" | "invoice">(method: Method): Promise<Method> {
		return method;
	}

	@step("Echo", { box: true })
	async echo<T>(value: T): Promise<T> {
		return value;
	}

	// @ts-expect-error @step decorates methods that return a Promise
	@step
	notAsync(): number {
		return 1;
	}

	// @ts-expect-error @step decorates methods that return a Promise, generic ones too
	@step()
	plainGeneric<T>(value: T): T {
		return value;
	}
}

// a decorated generic method keeps its type parameters
export const chosen: Promise<"card"> = new Checkout().choose("card");
export const echoed: Promise<number> = new Checkout().echo<number>(1);
// @ts-expect-error the constraint still holds
new Checkout().choose("cash");
