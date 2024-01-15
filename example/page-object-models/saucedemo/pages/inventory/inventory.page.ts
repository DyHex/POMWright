import test, { type Page, type TestInfo } from "@playwright/test";
import { POMWrightLogger } from "pomwright";
import Saucedemo from "../../common/base-page/saucedemo.page";
import { type LocatorSchemaPath, initLocatorSchemas } from "./inventory.locatorSchema";



export default class Inventory extends Saucedemo<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: POMWrightLogger) {
    super(page, testInfo, "/inventory.html", Inventory.name, pwrl);
  }

  protected initLocatorSchemas() {
    initLocatorSchemas(this.locators);
  }

  async logout() {
    await test.step(`${this.pocName}: Logout user from inventory page`, async () => {
      const burgerMenyBtn = await this.getNestedLocator("common.headerMenu.button.burger");
      await burgerMenyBtn.click();

      const logoutLink = await this.getNestedLocator("common.sidebar.menu.link.logout");
      await logoutLink.click();
    });
  }

  // add your helper methods here...
}