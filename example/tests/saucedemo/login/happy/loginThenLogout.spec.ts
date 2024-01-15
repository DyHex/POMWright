import { test } from "../../../../fixtures/all.fixtures";
import { expect } from "@playwright/test";

test("standard user should be able to login and logout", async ({ sdHome, sdInventory }) => {
  await sdHome.page.goto(sdHome.fullUrl);

  await sdHome.fillLoginForm(sdHome.getTestData().user.standard);

  await sdInventory.page.waitForURL(sdInventory.fullUrl);

  await sdInventory.logout();

  await sdHome.page.waitForURL(sdHome.fullUrl);
  
});

/**
 * Open ./playwright-report/index.html to view the logs for this test.
 */
test("log-level set to 'debug' so we can view logs for evaluation of locator nesting", async ({ sdHome, sdInventory, log }) => {
  log.setLogLevel("debug"); // sets log-level to debug for this test

  await sdHome.page.goto(sdHome.fullUrl);

  await sdHome.fillLoginForm(sdHome.getTestData().user.standard);

  await sdInventory.page.waitForURL(sdInventory.fullUrl);

  await sdInventory.logout();

  await sdHome.page.waitForURL(sdHome.fullUrl);
  
});