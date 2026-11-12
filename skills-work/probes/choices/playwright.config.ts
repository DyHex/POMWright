import { defineConfig, devices } from "@playwright/test";
import { env } from "./env";

const withBaseUrl = { baseURL: env.shopUrl };

export default defineConfig({
	testDir: ".",
	fullyParallel: true,
	reporter: [["line"], ["./step-reporter.ts"]],
	webServer: {
		command: "node ../../skills/pomwright-teach/assets/practice-app/server.mjs --port 4174",
		url: "http://localhost:4174",
		reuseExistingServer: false,
	},
	projects: [
		{ name: "chromium", testIgnore: /control/, use: { ...devices["Desktop Chrome"], ...withBaseUrl } },
		{ name: "firefox", testIgnore: /control/, use: { ...devices["Desktop Firefox"], ...withBaseUrl } },
		{ name: "webkit", testIgnore: /control/, use: { ...devices["Desktop Safari"], ...withBaseUrl } },
		{ name: "no-baseurl", testMatch: /control/, use: { ...devices["Desktop Chrome"] } },
	],
});
