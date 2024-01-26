import { mergeTests } from "@playwright/test";
import { test as saucedemoTest } from "../page-object-models/saucedemo/fixtures/saucedemo.fixtures";

export const test = mergeTests(saucedemoTest);
