import { test as base, createRegistryWithAccessors } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";
import { testData } from "./test-data";

type Accessors<P extends string> = ReturnType<typeof createRegistryWithAccessors<P>>;

export const test = base.extend<{ products: Accessors<Paths>; testData: typeof testData }>({
	products: async ({ page }, use) => {
		const products = createRegistryWithAccessors<Paths>(page);
		defineLocators(products.registry);
		products.registry.verify();
		await use(products);
	},
	testData,
});
