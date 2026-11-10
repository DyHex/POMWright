import { defineConfig, devices } from "@playwright/test";

// The learning workspace's config: the exercises run against the practice shop, which this config starts.
export default defineConfig({
	testDir: "./exercises",
	reporter: [["list"], ["html", { open: "never" }]],
	webServer: {
		command: "node practice-app/server.mjs --port 4173",
		url: "http://localhost:4173",
		reuseExistingServer: true,
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
