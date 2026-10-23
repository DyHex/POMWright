// Compile-only: @step under experimentalDecorators (tsconfig.legacyDecorators.json) and under the standard decorators
// of the harness's own tsconfig; both run in pnpm typecheck, which enforces every @ts-expect-error.
import { step } from "pomwright";

export class Checkout {
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

	// @ts-expect-error @step decorates methods that return a Promise
	@step
	notAsync(): number {
		return 1;
	}
}
