import { defineConfig } from "vitest/config";

// Unit tests for the pure helpers under src/. Discovery is limited to colocated
// *.test.ts files so the Playwright specs under test/ are never picked up, and
// tsup bundles from index.ts, so these files never reach the published package.
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		environment: "node",
	},
});
