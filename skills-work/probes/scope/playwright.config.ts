import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	fullyParallel: true,
	reporter: "line",
	webServer: {
		command: "node ../../../skills/pomwright-teach/assets/practice-app/server.mjs --port 4178",
		url: "http://localhost:4178",
		reuseExistingServer: false,
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
