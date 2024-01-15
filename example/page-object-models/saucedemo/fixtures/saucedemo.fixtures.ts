import { POMWrightTestFixture as base } from "pomwright";
import Home from "../pages/home.page";
import Inventory from "../pages/inventory/inventory.page";

type fixtures = {
  sdHome: Home;
  sdInventory: Inventory;
}

export const test = base.extend<fixtures>({
  sdHome: async ({ page, log }, use, testInfo) => {
    const profile = new Home(page, testInfo, log);
    await use(profile);
  },

  sdInventory: async ({ page, log }, use, testInfo) => {
    const profile = new Inventory(page, testInfo, log);
    await use(profile);
  },
});