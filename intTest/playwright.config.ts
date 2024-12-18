import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Environment variables ./.env
dotenv.config({ override: false });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: "./tests",
	globalTimeout: 60_000 * 5,
	timeout: 60_000 * 1,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 1,
	workers: process.env.CI ? "50%" : 4,
	reporter: process.env.CI
		? [
				["html", { open: "never" }],
				["github", { printSteps: false }],
			]
		: [
				["html", { open: "on-failure" }],
				["list", { printSteps: false }],
			],
	use: {
		actionTimeout: 5_000,
		navigationTimeout: 10_000,
		headless: true,
		viewport: { width: 1280, height: 720 },
		ignoreHTTPSErrors: false,
		video: "retry-with-video", // system taxing
		screenshot: { mode: "only-on-failure", fullPage: true, omitBackground: false },
		trace: "on-all-retries", // system taxing
		testIdAttribute: "data-testid", // Playwright default
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},

		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],

	webServer: process.env.CI
		? [
				{
					command: "pnpm start",
					url: "http://localhost:8080/",
					timeout: 5 * 60 * 1000,
					reuseExistingServer: false,
					ignoreHTTPSErrors: false,
					// stdout: "pipe",
					// stderr: "pipe",
				},
			]
		: [
				{
					command: "pnpm start",
					url: "http://localhost:8080/",
					timeout: 5 * 60 * 1000,
					reuseExistingServer: true,
					ignoreHTTPSErrors: false,
					// stdout: "pipe",
					// stderr: "pipe",
				},
			],
});
