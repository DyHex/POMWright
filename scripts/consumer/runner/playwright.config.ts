import { defineConfig } from "@playwright/test";

// No browser project: the consumer spec uses no page.
export default defineConfig({
	testDir: ".",
	reporter: "line",
});
