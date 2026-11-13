import type { LocatorRegistry } from "pomwright";
import type { Paths as CommonPaths } from "../common/page-components/common.locators";

export type Paths =
	| CommonPaths
	| "main.heading"
	| "main.form@newsletter"
	| "main.form@newsletter.input@email"
	| "main.form@newsletter.button@subscribe"
	| "main.form@newsletter.text@confirmation";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("main.heading").getByRole("heading", { level: 1 });

	registry.add("main.form@newsletter").getByRole("form", { name: "Newsletter" });

	registry.add("main.form@newsletter.input@email").getByLabel("Email");

	registry.add("main.form@newsletter.button@subscribe").getByRole("button", { name: "Subscribe" });

	registry.add("main.form@newsletter.text@confirmation").getByText("Thanks for subscribing");
}
