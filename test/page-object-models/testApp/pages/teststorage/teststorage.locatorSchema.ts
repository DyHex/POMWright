import { json, type LocatorRegistry } from "pomwright";

/** What the /teststorage page stores under "user": a structured value with a declared codec. */
export type User = { name: string; age: number };

/** Codecs by key for the /teststorage page objects. Every other key is a string. */
export const storageSchema = { user: json<User>() };

/** Paths for the /teststorage page, the fixture for the SessionStorage helper. */
export type Paths =
	| "body"
	| "body.heading"
	| "body.servedBy"
	| "body.startup"
	| "body.current"
	| "body.method"
	| "body.posted"
	| "body.headers"
	| "body.controlled"
	| "body.link@toSecondOrigin"
	| "body.link@sameOrigin"
	| "body.link@redirect302"
	| "body.link@chain"
	| "body.link@popup"
	| "body.button@scriptToSecondOrigin"
	| "body.button@metaToSecondOrigin"
	| "body.button@submitToSecondOrigin"
	| "body.button@submit303"
	| "body.button@submit307"
	| "body.frame@sameOrigin"
	| "body.frame@secondOrigin";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("body").locator("body");
	registry.add("body.heading").getByRole("heading", { name: "Session storage playground" });
	registry.add("body.servedBy").getById("served-by");
	registry.add("body.startup").getById("startup");
	registry.add("body.current").getById("current");
	registry.add("body.method").getById("method");
	registry.add("body.posted").getById("posted");
	registry.add("body.headers").getById("headers");
	registry.add("body.controlled").getById("controlled");
	registry.add("body.link@toSecondOrigin").getById("to-second-origin");
	registry.add("body.link@sameOrigin").getById("same-origin");
	registry.add("body.link@redirect302").getById("redirect-302");
	registry.add("body.link@chain").getById("chain");
	registry.add("body.link@popup").getById("popup");
	registry.add("body.button@scriptToSecondOrigin").getById("script-to-second-origin");
	registry.add("body.button@metaToSecondOrigin").getById("meta-to-second-origin");
	registry.add("body.button@submitToSecondOrigin").getById("submit-to-second-origin");
	registry.add("body.button@submit303").getById("submit-303");
	registry.add("body.button@submit307").getById("submit-307");
	registry.add("body.frame@sameOrigin").getById("same-origin-frame");
	registry.add("body.frame@secondOrigin").getById("second-origin-frame");
}
