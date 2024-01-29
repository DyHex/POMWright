import { test as base } from "pomwright";
import Home from "../pages/home.page";
import Inventory from "../pages/inventory/inventory.page";

type fixtures = {
	sdHome: Home;
	sdInventory: Inventory;
};

export const test = base.extend<fixtures>({
	sdHome: async ({ page, log }, use, testInfo) => {
		const sdHome = new Home(page, testInfo, log);
		await use(sdHome);
	},

	sdInventory: async ({ page, log }, use, testInfo) => {
		const sdInventory = new Inventory(page, testInfo, log);
		await use(sdInventory);
	},
});
