// The shared options of test/playwright.config.ts, as plain data it spreads in. The file sits at the root, outside
// test/, so its one import of @playwright/test is a type import, erased at run time: a value import would load the
// root's copy of Playwright beside test/'s, which Playwright refuses ("Requiring @playwright/test second time").
import type { PlaywrightTestConfig } from "@playwright/test";

export const baseConfig: PlaywrightTestConfig = {
	globalTimeout: 60_000 * 5,
	timeout: 60_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	// CI retries a failure once to record a trace and a video, then fails the run anyway (failOnFlakyTests).
	retries: process.env.CI ? 1 : 0,
	failOnFlakyTests: !!process.env.CI,
	workers: "50%",
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
		video: "on-first-retry",
		screenshot: {
			mode: "only-on-failure",
			fullPage: true,
			omitBackground: false,
		},
		trace: "on-all-retries",
		testIdAttribute: "data-testid",
	},
};
