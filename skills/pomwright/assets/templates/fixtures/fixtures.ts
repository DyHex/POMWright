import { mergeTests } from "@playwright/test";
import { test as shop } from "./shop.fixtures";
import { test as testData } from "./test-data.fixtures";

export { expect } from "@playwright/test";

/** The test every spec imports: POMWright's test (with its log fixture), the page objects and the test data. */
export const test = mergeTests(shop, testData);
