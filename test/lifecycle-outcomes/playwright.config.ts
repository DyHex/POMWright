import { defineConfig, devices } from "@playwright/test";

// The run that tests/pageObject/lifecycle.outcomes.spec.ts starts and reads: Playwright's defaults, one project per
// browser, no web server (the page objects never navigate). Never run by pack-test.sh directly: its tests fail on
// purpose.
export default defineConfig({
	testDir: ".",
	// a test.only left in its specs would run some places alone, as the harness forbids in CI too
	forbidOnly: !!process.env.CI,
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
