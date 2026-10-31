import { defineConfig } from "vitest/config";

// Unit tests for the pure helpers under src/. Discovery is limited to colocated
// *.test.ts files so the Playwright specs under test/ are never picked up, and
// tsup bundles from index.ts, so these files never reach the published package.
//
// typecheck: the same files are also type-checked with tsc on every run, so
// `expectTypeOf` assertions and `// @ts-expect-error` lines are enforced, here and in
// CI; no other tsc run covers them (`pnpm typecheck` compiles test/). Vitest labels this
// mode experimental, which is why package.json pins vitest to an exact version.
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		environment: "node",
		typecheck: {
			enabled: true,
			// *.test-d.ts files are type-checked only, never run: decorator syntax, which the runtime cannot load
			include: ["src/**/*.test.ts", "src/**/*.test-d.ts"],
			// Scoped tsconfig: the root one has no `include`, so tsc would otherwise
			// sweep dist/ and test/ (which has its own tsconfig and path aliases).
			tsconfig: "./tsconfig.vitest.json",
		},
	},
});
