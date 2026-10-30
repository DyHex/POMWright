// The shared options of test/playwright.config.ts and test/playwright.test-server.config.ts, as plain data they spread
// in; the steps, lifecycle-outcomes and bench configs do not build on it and set their own. The file sits at the root,
// outside test/, so its one import of @playwright/test is a type import, erased at run time: a value import would load
// the root's copy of Playwright beside test/'s, which Playwright refuses ("Requiring @playwright/test second time").
import type { PlaywrightTestConfig } from "@playwright/test";

export const baseConfig: PlaywrightTestConfig = {
	// a cap for a run that hangs, with room for a slow machine: at 5 minutes, a run on one worker stopped two thirds in
	globalTimeout: 60_000 * 15,
	timeout: 60_000,
	expect: {
		timeout: 5_000,
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	// CI retries a failure once to record a trace and a video, then fails the run anyway (failOnFlakyTests).
	retries: process.env.CI ? 1 : 0,
	failOnFlakyTests: !!process.env.CI,
	// two branches on purpose: CI's is half its runner's 4 threads, 2 workers; the local one is to be tuned to the
	// maintainer's machine, so the branches stay apart even while they are equal
	workers: process.env.CI ? "50%" : "50%",
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
