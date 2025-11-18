// playwright.base.ts
import type { PlaywrightTestConfig } from "@playwright/test";

// this is only a *type* import → erased at runtime → does NOT trigger the double-load
// everything below is plain data the subprojects can spread in

export const baseConfig: PlaywrightTestConfig = {
	// things you currently have in both configs:
	globalTimeout: 60_000 * 5,
	timeout: 60_000,
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
		video: "retry-with-video",
		screenshot: {
			mode: "only-on-failure",
			fullPage: true,
			omitBackground: false,
		},
		trace: "on-all-retries",
		testIdAttribute: "data-testid",
	},
};
