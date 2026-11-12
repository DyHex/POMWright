import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	webServer: {
		command: "node ../../skills/pomwright-teach/assets/practice-app/server.mjs --port 4173",
		url: "http://localhost:4173",
		reuseExistingServer: false,
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
