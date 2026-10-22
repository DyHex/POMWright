import { defineConfig } from "@playwright/test";

// Where the report places a step and its error: the specs mark each probed call with `// LOCATION <id>`, and the
// reporter fails the run when a step or an error titled with that id is reported anywhere else. No browser: the
// probes use fake pages. Run by pack-test.sh after the harness, so a --reporter given to the harness cannot switch it
// off.
export default defineConfig({
	testDir: "./step-locations",
	reporter: [["line"], ["./step-locations/locationReporter.ts"]],
});
