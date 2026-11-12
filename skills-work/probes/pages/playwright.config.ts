import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	fullyParallel: true,
	reporter: "line",
	webServer: {
		command: "node ../../evals/fixture/practice-app/server.mjs --port 4179",
		url: "http://localhost:4179",
		reuseExistingServer: false,
	},
	use: { baseURL: "http://localhost:4179" },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
