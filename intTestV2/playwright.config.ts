import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { baseConfig } from "../playwright.base";

dotenv.config({ override: false, quiet: true });

export default defineConfig({
	...baseConfig,
	testDir: "./tests",

	webServer: process.env.CI
		? [
				{
					command: "pnpm start",
					url: "http://localhost:8080/",
					timeout: 5 * 60_000,
					reuseExistingServer: false,
					ignoreHTTPSErrors: false,
				},
			]
		: [
				{
					command: "pnpm start",
					url: "http://localhost:8080/",
					timeout: 5 * 60_000,
					reuseExistingServer: true,
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
