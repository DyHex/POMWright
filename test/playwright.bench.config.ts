import { defineConfig } from "@playwright/test";

// The benchmarks of `pnpm bench` (scripts/benchmark.mjs), never part of a test run. The fixture benchmark builds page
// objects in Node, on chromium only; the storage benchmark talks to each browser and needs the test server, which
// starts only when the script asks for it (POMWRIGHT_BENCH_SERVER). One worker unless the script passes more, so nothing
// else runs beside a measurement at rest; every case repeated for a median.
export default defineConfig({
	testDir: "./benchmarks",
	workers: 1,
	repeatEach: 5,
	reporter: "line",
	timeout: 10 * 60_000,
	webServer: process.env.POMWRIGHT_BENCH_SERVER
		? { command: "pnpm start", url: "http://localhost:9000/", timeout: 5 * 60_000, reuseExistingServer: false }
		: undefined,
	projects: [
		{ name: "fixture", testMatch: "pageObjectFixture.spec.ts", use: { browserName: "chromium" } },
		{ name: "storage-chromium", testMatch: "sessionStorage.spec.ts", use: { browserName: "chromium" } },
		{ name: "storage-firefox", testMatch: "sessionStorage.spec.ts", use: { browserName: "firefox" } },
		{ name: "storage-webkit", testMatch: "sessionStorage.spec.ts", use: { browserName: "webkit" } },
	],
});
