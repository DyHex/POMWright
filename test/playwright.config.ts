import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { baseConfig } from "../playwright.base";

dotenv.config({ override: false, quiet: true });

export default defineConfig({
	...baseConfig,
	testDir: "./tests",

	// never reused, locally too: a server left running by a run that ended without stopping it serves the server.js
	// it started with; a run then fails at once, saying port 9000 is taken
	webServer: [
		{
			command: "pnpm start",
			url: "http://localhost:9000/",
			timeout: 5 * 60_000,
			reuseExistingServer: false,
			ignoreHTTPSErrors: false,
		},
	],

	projects: [
		{
			name: "chromium",
			use: {
				...(baseConfig.use ?? {}),
				...devices["Desktop Chrome"],
			},
		},
		{
			name: "firefox",
			use: {
				...(baseConfig.use ?? {}),
				...devices["Desktop Firefox"],
			},
		},
		{
			name: "webkit",
			use: {
				...(baseConfig.use ?? {}),
				...devices["Desktop Safari"],
			},
		},
	],
});
