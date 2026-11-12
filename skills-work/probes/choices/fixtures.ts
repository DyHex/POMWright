import { test as base, createRegistryWithAccessors } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";

// a fixture that hands tests the registry's accessors
type Locators<P extends string> = ReturnType<typeof createRegistryWithAccessors<P>>;

export const test = base.extend<{ products: Locators<Paths> }>({
	products: async ({ page }, use) => {
		const products = createRegistryWithAccessors<Paths>(page);
		defineLocators(products.registry);
		products.registry.verify();
		await use(products);
	},
});
