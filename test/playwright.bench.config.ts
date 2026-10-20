import { defineConfig } from "@playwright/test";

// The page object fixture benchmark of `pnpm bench` (scripts/benchmark.mjs), never part of a test run: one worker, so
// nothing else runs beside a measurement, and every case repeated for a median.
export default defineConfig({
	testDir: "./benchmarks",
	workers: 1,
	repeatEach: 5,
	reporter: "line",
	timeout: 5 * 60_000,
	projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
