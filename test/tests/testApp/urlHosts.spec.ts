import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { PageObject } from "pomwright";

// A string baseUrl in a form that new URL normalizes: the page object's fullUrl is the normalized URL, which is the URL
// every browser reports for that page. The test server answers the forms under every name that reaches it: localhost
// and 127.0.0.1 in their other spellings, IPv6 (the server listens on every address), and names under .localhost, which
// every browser sends to the machine itself without asking the system's resolver. A URL with credentials keeps them in
// page.url(), which waitForURL and the navigation methods read, and in document.URL; the page's location.href, which
// toHaveURL compares, has none.
//
// The forms that need port 80 or 443, or TLS, are fulfilled by page.route instead, a stand-in for a server at
// shop.example, since a server there needs root or a certificate. The browser keeps or drops the port in its URL parser,
// before any request, so the stand-in could hide only what a real server adds (a redirect, a refused connection), which
// the served forms meet for real.

class HostPage extends PageObject<"body"> {
	constructor(page: Page, baseUrl: string, urlPath: string) {
		super(page, baseUrl, urlPath, { label: "HostPage" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
}

type HostForm = { form: string; baseUrl: string; origin: string; documentOrigin?: string };

const SERVED: HostForm[] = [
	{ form: "an upper-case host", baseUrl: "http://LOCALHOST:9000", origin: "http://localhost:9000" },
	{ form: "an upper-case scheme", baseUrl: "HTTP://localhost:9000", origin: "http://localhost:9000" },
	{ form: "a port with leading zeros", baseUrl: "http://localhost:09000", origin: "http://localhost:9000" },
	{
		form: "an internationalized host",
		baseUrl: "http://bücher.localhost:9000",
		origin: "http://xn--bcher-kva.localhost:9000",
	},
	{
		form: "an upper-case internationalized host",
		baseUrl: "http://BÜCHER.localhost:9000",
		origin: "http://xn--bcher-kva.localhost:9000",
	},
	{
		form: "a punycode host",
		baseUrl: "http://xn--bcher-kva.localhost:9000",
		origin: "http://xn--bcher-kva.localhost:9000",
	},
	{ form: "a full-width host", baseUrl: "http://ｓｈｏｐ.localhost:9000", origin: "http://shop.localhost:9000" },
	{ form: "a Cyrillic host", baseUrl: "http://шоп.localhost:9000", origin: "http://xn--n1acz.localhost:9000" },
	{ form: "a host with ß", baseUrl: "http://faß.localhost:9000", origin: "http://xn--fa-hia.localhost:9000" },
	{ form: "a host with a trailing dot", baseUrl: "http://shop.localhost.:9000", origin: "http://shop.localhost.:9000" },
	{ form: "an IPv6 host", baseUrl: "http://[::1]:9000", origin: "http://[::1]:9000" },
	{ form: "an expanded IPv6 host", baseUrl: "http://[0:0:0:0:0:0:0:1]:9000", origin: "http://[::1]:9000" },
	{
		form: "an IPv4-mapped IPv6 host",
		baseUrl: "http://[::FFFF:127.0.0.1]:9000",
		origin: "http://[::ffff:7f00:1]:9000",
	},
	{ form: "a shortened IPv4 host", baseUrl: "http://127.1:9000", origin: "http://127.0.0.1:9000" },
	{ form: "a hexadecimal IPv4 host", baseUrl: "http://0x7f.0.0.1:9000", origin: "http://127.0.0.1:9000" },
	{ form: "a decimal IPv4 host", baseUrl: "http://2130706433:9000", origin: "http://127.0.0.1:9000" },
	{
		form: "a user and a password",
		baseUrl: "http://user:pass@localhost:9000",
		origin: "http://user:pass@localhost:9000",
		documentOrigin: "http://localhost:9000",
	},
	{
		form: "credentials with an escape and an @",
		baseUrl: "http://us%20er:p@ss@localhost:9000",
		origin: "http://us%20er:p%40ss@localhost:9000",
		documentOrigin: "http://localhost:9000",
	},
	{
		form: "a password without a user",
		baseUrl: "http://:pass@localhost:9000",
		origin: "http://:pass@localhost:9000",
		documentOrigin: "http://localhost:9000",
	},
	{
		form: "a user without a password",
		baseUrl: "http://user@localhost:9000",
		origin: "http://user@localhost:9000",
		documentOrigin: "http://localhost:9000",
	},
];

const ROUTED: HostForm[] = [
	{ form: "http's default port", baseUrl: "http://shop.example:80", origin: "http://shop.example" },
	{ form: "https's default port", baseUrl: "https://shop.example:443", origin: "https://shop.example" },
	{ form: "a default port with leading zeros", baseUrl: "https://shop.example:00443", origin: "https://shop.example" },
	{ form: "another port", baseUrl: "https://shop.example:8443", origin: "https://shop.example:8443" },
];

const cases = [
	...SERVED.map((host) => ({ ...host, path: "/testnav", elsewhere: "/testids", routed: false })),
	...ROUTED.map((host) => ({ ...host, path: "/x", elsewhere: "/elsewhere", routed: true })),
];

for (const { form, baseUrl, origin, documentOrigin = origin, path, elsewhere, routed } of cases) {
	test(`${form}: ${baseUrl} is this page as the browser reports it`, async ({ page }) => {
		if (routed) {
			await page.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: "<p>host</p>" }));
		}
		const fullUrl = `${origin}${path}`;
		const documentUrl = `${documentOrigin}${path}`;
		const hostPage = new HostPage(page, baseUrl, path);
		expect(hostPage.fullUrl).toBe(fullUrl);

		// reached by the form as written
		await page.goto(`${baseUrl}${path}`);
		expect(page.url()).toBe(fullUrl);
		await hostPage.navigation.expectThisPage();

		// reached through goto()
		await page.goto("about:blank");
		await hostPage.navigation.goto();
		expect(page.url()).toBe(fullUrl);
		await hostPage.navigation.expectThisPage();
		await page.waitForURL(hostPage.fullUrl);
		// toHaveURL compares location.href, which has no credentials; document.URL keeps them, as page.url() does
		expect(await page.evaluate(() => [location.href, document.URL])).toEqual([documentUrl, fullUrl]);
		await expect(page).toHaveURL(documentUrl);
		if (documentUrl !== fullUrl) {
			await expect(page).not.toHaveURL(hostPage.fullUrl);
		}

		// expectAnotherPage() is this page's negation, on the same URL
		await expect(hostPage.navigation.expectAnotherPage({ timeout: 250 })).rejects.toThrow(
			`HostPage: expected to have left ${JSON.stringify(fullUrl)}; found ${JSON.stringify(fullUrl)}`,
		);
		await page.goto(`${origin}${elsewhere}`);
		await hostPage.navigation.expectAnotherPage();
	});
}
