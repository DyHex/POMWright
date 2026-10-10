import type { LocatorRegistry } from "pomwright";

/**
 * Paths for the /testids page. Every element on that page has an id that is valid HTML but awkward
 * as a CSS selector, so the registry's getById handling is exercised against real DOM.
 */
export type Paths =
	| "body"
	| "body.panel@dot"
	| "body.input@colon"
	| "body.item@first"
	| "body.p@digit"
	| "body.p@space"
	| "body.p@lf"
	| "body.p@cr"
	| "body.p@ff"
	| "body.p@literalHash"
	| "body.p@hash"
	| "body.p@idEq"
	| "body.p@quote"
	| "body.p@backslash"
	| "body.p@chain"
	| "body.p@unicode"
	| "body.generated"
	| "body.generated.button@anchored"
	| "body.generated.button@prefix"
	| "body.generated.button@second"
	| "body.generated.span@unanchored"
	| "body.any@settingsInsensitive"
	| "body.any@prefixGlobal"
	| "body.div@containsFour"
	| "body.shadow@inOpen"
	| "body.frame"
	| "body.frame.button@inner";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("body").locator("body");

	// string ids are matched verbatim and case-sensitively
	registry.add("body.panel@dot").getById("settings.panel");
	registry.add("body.input@colon").getById("form:user");
	registry.add("body.item@first").getById("items[0]");
	registry.add("body.p@digit").getById("1st");
	registry.add("body.p@space").getById("has space");
	registry.add("body.p@lf").getById("line\nfeed");
	registry.add("body.p@cr").getById("carriage\rreturn");
	registry.add("body.p@ff").getById("form\ffeed");
	registry.add("body.p@literalHash").getById("literal-hash");
	registry.add("body.p@hash").getById("#literal-hash");
	registry.add("body.p@idEq").getById("id=weird");
	registry.add("body.p@quote").getById('say"hi');
	registry.add("body.p@backslash").getById("back\\slash");
	registry.add("body.p@chain").getById("a>>b");
	registry.add("body.p@unicode").getById("résumé");

	// RegExp ids are evaluated as patterns, flags included
	registry.add("body.generated").getById("generated");
	registry.add("body.generated.button@anchored").getById(/^button\.submit\.[a-z0-9]{4}$/);
	registry.add("body.generated.button@prefix").getById(/^button\.submit\./);
	registry
		.add("body.generated.button@second")
		.getById(/^button\.submit\./)
		.nth(1);
	registry.add("body.generated.span@unanchored").getById(/btn-submit-form/);
	registry.add("body.any@settingsInsensitive").getById(/settings/i);
	registry.add("body.any@prefixGlobal").getById(/^button\.submit\./g);

	// a filter reference to a path whose terminal is a RegExp id
	registry.add("body.div@containsFour").locator("div").filter({ has: "body.generated.span@unanchored" });

	// open shadow root and iframe
	registry.add("body.shadow@inOpen").getById("in.open");
	registry.add("body.frame").frameLocator('[id="frame.ids"]');
	registry.add("body.frame.button@inner").getById("inner.button");
}
