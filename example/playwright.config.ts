import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Environment variables ./.env
dotenv.config({ override: false });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: "./tests",
	globalTimeout: 60_000 * 30,
	timeout: 60_000 * 2,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
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
		actionTimeout: 10_000,
		navigationTimeout: 30_000,
		headless: true,
		viewport: { width: 1280, height: 720 },
		ignoreHTTPSErrors: false,
		video: "retry-with-video", // system taxing
		screenshot: { mode: "only-on-failure", fullPage: true, omitBackground: false },
		trace: "on-all-retries", // system taxing
		testIdAttribute: "data-testid", // Playwright default
		// locale: "nb-NO",
		// baseURL: process.env.BASE_URL // we do not want to use this if we want to test multiple-domains, make an abstract class per domain extending POMWright instead
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

	// webServer: []
});
