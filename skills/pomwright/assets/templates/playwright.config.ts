import { defineConfig, devices } from "@playwright/test";
import { env } from "./env";

// baseURL is the shop's origin, the value its page objects use, so Playwright's relative URLs (page.goto("/cart"),
// expect(page).toHaveURL("/cart"), the request fixture) reach the shop too. Page objects need none: with several apps,
// keep it for one of them or leave it out.
export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: "html",
	use: { baseURL: env.shopUrl, trace: "on-first-retry" },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
