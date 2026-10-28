import { defineConfig, devices } from "@playwright/test";
import { baseConfig } from "../playwright.base";

// The test server's own check (test-server/): no page it serves loads anything from another host. Run once, on
// chromium, by test-server-check.sh, which pack-test.sh calls outside CI and CI runs in a job of its own; what a page
// requests depends on no browser, Playwright version or Node line, and a failure here is not a harness failure.
export default defineConfig({
	...baseConfig,
	testDir: "./test-server",
	outputDir: "./test-results/test-server",
	reporter: process.env.CI
		? [
				["html", { open: "never", outputFolder: "playwright-report/test-server" }],
				["github", { printSteps: false }],
			]
		: [["list", { printSteps: true }]],
	webServer: {
		command: "pnpm start",
		url: "http://localhost:9000/",
		timeout: 5 * 60_000,
		reuseExistingServer: !process.env.CI,
	},
	projects: [
		{
			name: "chromium",
			// the messages name each page and URL; screenshots, videos and traces of some 25 pages add nothing
			use: { ...(baseConfig.use ?? {}), ...devices["Desktop Chrome"], screenshot: "off", video: "off", trace: "off" },
		},
	],
});
