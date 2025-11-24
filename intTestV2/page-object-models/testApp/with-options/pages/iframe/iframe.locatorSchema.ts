import type { LocatorRegistry } from "pomwright";

export type LocatorSchemaPath =
	| "sectionA"
	| "sectionA.frame"
	| "sectionA.frame.toggle"
	| "sectionB"
	| "sectionB.frame"
	| "sectionB.frame.toggle"
	| "sectionB.frame.innerFrame"
	| "sectionB.frame.innerFrame.toggle";

export function initLocatorSchemas(locators: LocatorRegistry<LocatorSchemaPath>) {
	locators.add("sectionA").locator("#sectionA");
	locators.add("sectionA.frame").frameLocator("#iframeA");
	locators.add("sectionA.frame.toggle").getByTestId("toggle-a");

	locators.add("sectionB").locator("#sectionB");
	locators.add("sectionB.frame").frameLocator("#iframeB");
	locators.add("sectionB.frame.toggle").getByTestId("toggle-b");

	locators.add("sectionB.frame.innerFrame").frameLocator("#iframeC");
	locators.add("sectionB.frame.innerFrame.toggle").getByTestId("toggle-c");
}
