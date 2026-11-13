import { shop } from "./shop.test-data";

/** Every test's data, by app, page and case: testData.<app>.<page>.<case>. Read-only, so no test changes another's. */
export const testData = { shop } as const;
