import type { LocatorRegistry } from "pomwright";

export type Paths =
	| "sectionA"
	| "sectionA.frame"
	| "sectionA.frame.toggle"
	| "sectionB"
	| "sectionB.frame"
	| "sectionB.frame.toggle"
	| "sectionB.frame.innerFrame"
	| "sectionB.frame.innerFrame.toggle"
	// steps on the iframe element: the second iframe, the last visible one, the last one (hidden)
	| "iframes@second"
	| "iframes@second.toggle"
	| "iframes@lastVisible"
	| "iframes@lastVisible.toggle"
	| "iframes@last"
	| "iframes@last.toggle"
	| "iframe@hidden"
	| "section@hidden"
	// Playwright's any-frame locator: descendants resolve in whichever single frame holds them
	| "anyFrame"
	| "anyFrame.toggleC"
	| "anyFrame.button"
	| "anyFrame.title";

export function defineLocators(locators: LocatorRegistry<Paths>) {
	locators.add("sectionA").locator("#sectionA");
	locators.add("sectionA.frame").frameLocator("#iframeA");
	locators.add("sectionA.frame.toggle").getByTestId("toggle-a");

	locators.add("sectionB").locator("#sectionB");
	locators.add("sectionB.frame").frameLocator("#iframeB");
	locators.add("sectionB.frame.toggle").getByTestId("toggle-b");

	locators.add("sectionB.frame.innerFrame").frameLocator("#iframeC");
	locators.add("sectionB.frame.innerFrame.toggle").getByTestId("toggle-c");

	locators.add("iframes@second").frameLocator("iframe").nth(1);
	locators.add("iframes@second.toggle").getByRole("button");
	locators.add("iframes@lastVisible").frameLocator("iframe").filter({ visible: true }).nth("last");
	locators.add("iframes@lastVisible.toggle").getByRole("button");
	locators.add("iframes@last").frameLocator("iframe").nth("last");
	locators.add("iframes@last.toggle").getByRole("button");
	locators.add("iframe@hidden").frameLocator("#iframeHidden");
	locators.add("section@hidden").locator("section").filter({ has: "iframe@hidden" });

	locators.add("anyFrame").frameLocator();
	locators.add("anyFrame.toggleC").getByTestId("toggle-c");
	locators.add("anyFrame.button").getByRole("button");
	locators.add("anyFrame.title").getByRole("heading", { name: "Iframe playground" });
}
