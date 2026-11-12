import { test as base } from "pomwright";
import { testData } from "./test-data/test-data";

export const test = base.extend<{ testData: typeof testData }>({
	testData,
});
export { expect } from "@playwright/test";
