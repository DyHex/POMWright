// Compiled by tsc with experimentalDecorators (tsconfig.legacyDecorators.emit.json, run by pnpm typecheck) into
// test/.legacy-decorators, so legacyDecorators.spec.ts runs the legacy (target, key, descriptor) calls as tsc writes them.
import { step } from "pomwright";

export class LegacyWidget {
	@step
	async bare(): Promise<void> {}

	@step()
	async called(): Promise<void> {}

	@step({ box: true })
	async boxed(): Promise<void> {}

	@step("LOCATION legacy-titled-boxed", { box: true })
	async titledBoxed(): Promise<void> {}

	@step
	static async staticBare(): Promise<void> {}

	@step()
	async detached(): Promise<void> {}

	@step("LOCATION legacy-throws", { box: true })
	async throws(): Promise<void> {
		throw new Error("LOCATION legacy-throws");
	}

	// what JavaScript code can decorate: TypeScript refuses it
	// @ts-expect-error @step decorates methods that return a Promise: make the method async
	@step("LOCATION legacy-plain")
	plain(): number {
		return 42;
	}
}
