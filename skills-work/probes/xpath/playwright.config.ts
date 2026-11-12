import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	fullyParallel: true,
	reporter: "line",
	webServer: [
		{
			command: "node ../../../skills/pomwright-teach/assets/practice-app/server.mjs --port 4176",
			url: "http://localhost:4176",
			reuseExistingServer: false,
		},
		{ command: "node ../../../test/server.js", url: "http://localhost:9000/", reuseExistingServer: false },
	],
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
