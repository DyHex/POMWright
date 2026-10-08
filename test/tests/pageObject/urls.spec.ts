import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

const BASE_URL_RULE =
	'baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash)';

class Probe extends PageObject<"body"> {
	constructor(page: Page, baseUrl: string, urlPath: string) {
		super(page, baseUrl, urlPath, { label: "Probe" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class RegExpPathProbe extends PageObject<"body", { urlPathType: RegExp }> {
	constructor(page: Page, baseUrl: string, urlPath: RegExp) {
		super(page, baseUrl, urlPath, { label: "RegExpPathProbe" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

test("rejects a baseUrl that is not a non-empty origin, naming the page object and the value", async ({ page }) => {
	const invalid = [
		"",
		"localhost:9000",
		"app.example",
		"https://app.example/app",
		"https://app.example/?a=1",
		"https://app.example/#h",
	];
	for (const baseUrl of invalid) {
		expect(() => new Probe(page, baseUrl, "/login"), baseUrl).toThrow(
			`Probe: ${BASE_URL_RULE}; received ${JSON.stringify(baseUrl)}.`,
		);
	}
	expect(() => new RegExpPathProbe(page, "", /^\/account\/\d+$/)).toThrow(
		`RegExpPathProbe: ${BASE_URL_RULE}; received "".`,
	);
});

test("rejects a urlPath without exactly one leading slash", async ({ page }) => {
	for (const urlPath of ["login", "?tab=1", "#section", "https://app.example/a", "//other.example/x"]) {
		expect(() => new Probe(page, "https://app.example", urlPath), urlPath).toThrow(
			`Probe: urlPath must be "" or start with exactly one "/"; received ${JSON.stringify(urlPath)}.`,
		);
	}
});

test("accepts origins with a port or a trailing slash, an empty path, and values from variables", async ({ page }) => {
	expect(new Probe(page, "http://localhost:9000/", "").fullUrl).toBe("http://localhost:9000/");
	expect(new Probe(page, "https://app.example:8443", "/x").fullUrl).toBe("https://app.example:8443/x");
	expect(new Probe(page, "https://app.example", "/orders?tab=1").fullUrl).toBe("https://app.example/orders?tab=1");

	const baseUrl: string = process.env.POMWRIGHT_PROBE_BASE ?? "http://localhost:9000";
	const urlPath: string = "/testnav";
	expect(new Probe(page, baseUrl, urlPath).fullUrl).toBe("http://localhost:9000/testnav");
	expect(typeof new RegExpPathProbe(page, baseUrl, /^\/x$/).fullUrl).toBe("function");
});
