import { defineConfig, devices } from "@playwright/test";

// No baseURL: page code takes its origins from env.ts, as POMWRIGHT.md records. A project that opts in sets
// `baseURL: env.shopUrl` in `use`, so Playwright's relative URLs reach the same origin as its page objects.
export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: "html",
	use: { trace: "on-first-retry" },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
