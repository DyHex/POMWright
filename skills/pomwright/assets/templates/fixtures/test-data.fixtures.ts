import { test as base } from "pomwright";
import { testData } from "../test-data/test-data";

export const test = base.extend<{ testData: typeof testData }>({
	// a value, not a function: the same read-only data for every test; test.use({ testData }) replaces it for a file
	testData,
});
