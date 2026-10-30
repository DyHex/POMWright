import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { PageObject } from "pomwright";

// A string baseUrl in a form that new URL normalizes: the page object's fullUrl is the normalized URL, which is the URL
// every browser reports for that page. Every request is fulfilled by page.route, a stand-in for a server at each host,
// so no host, DNS or IPv6 listener is needed: the browser normalizes the URL before the request, so the URL it reports
// is its own, but the stand-in could hide what a real host adds (a redirect, a refused connection, a host the network
// resolves otherwise). The test server's two hosts, localhost and 127.0.0.1, are navigated for real by testApp/'s
// other specs. A URL with credentials keeps them in page.url(), which waitForURL and the navigation methods read; the
// document's URL, which toHaveURL compares, has none.

class HostPage extends PageObject<"body"> {
	constructor(page: Page, baseUrl: string) {
		super(page, baseUrl, "/x", { label: "HostPage" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
}

const HOSTS: { form: string; baseUrl: string; fullUrl: string; documentUrl?: string }[] = [
	{ form: "an upper-case host", baseUrl: "http://LOCALHOST:9000", fullUrl: "http://localhost:9000/x" },
	{ form: "an upper-case scheme", baseUrl: "HTTP://localhost:9000", fullUrl: "http://localhost:9000/x" },
	{ form: "http's default port", baseUrl: "http://shop.example:80", fullUrl: "http://shop.example/x" },
	{ form: "https's default port", baseUrl: "https://shop.example:443", fullUrl: "https://shop.example/x" },
	{
		form: "a default port with leading zeros",
		baseUrl: "https://shop.example:00443",
		fullUrl: "https://shop.example/x",
	},
	{ form: "another port", baseUrl: "https://shop.example:8443", fullUrl: "https://shop.example:8443/x" },
	{ form: "an internationalized host", baseUrl: "https://bücher.example", fullUrl: "https://xn--bcher-kva.example/x" },
	{
		form: "an upper-case internationalized host",
		baseUrl: "https://BÜCHER.example",
		fullUrl: "https://xn--bcher-kva.example/x",
	},
	{ form: "a punycode host", baseUrl: "https://xn--bcher-kva.example", fullUrl: "https://xn--bcher-kva.example/x" },
	{ form: "a full-width host", baseUrl: "https://ｓｈｏｐ.example", fullUrl: "https://shop.example/x" },
	{ form: "a Cyrillic host", baseUrl: "https://шоп.example", fullUrl: "https://xn--n1acz.example/x" },
	{ form: "a host with ß", baseUrl: "https://faß.example", fullUrl: "https://xn--fa-hia.example/x" },
	{ form: "a host with a trailing dot", baseUrl: "https://shop.example.", fullUrl: "https://shop.example./x" },
	{ form: "an IPv6 host", baseUrl: "http://[::1]:9000", fullUrl: "http://[::1]:9000/x" },
	{ form: "an expanded IPv6 host", baseUrl: "http://[0:0:0:0:0:0:0:1]:9000", fullUrl: "http://[::1]:9000/x" },
	{
		form: "an IPv4-mapped IPv6 host",
		baseUrl: "http://[::FFFF:127.0.0.1]:9000",
		fullUrl: "http://[::ffff:7f00:1]:9000/x",
	},
	{ form: "a shortened IPv4 host", baseUrl: "http://127.1:9000", fullUrl: "http://127.0.0.1:9000/x" },
	{ form: "a hexadecimal IPv4 host", baseUrl: "http://0x7f.0.0.1:9000", fullUrl: "http://127.0.0.1:9000/x" },
	{ form: "a decimal IPv4 host", baseUrl: "http://2130706433:9000", fullUrl: "http://127.0.0.1:9000/x" },
	{
		form: "a user and a password",
		baseUrl: "http://user:pass@shop.example",
		fullUrl: "http://user:pass@shop.example/x",
		documentUrl: "http://shop.example/x",
	},
	{
		form: "credentials with an escape and an @",
		baseUrl: "http://us%20er:p@ss@shop.example",
		fullUrl: "http://us%20er:p%40ss@shop.example/x",
		documentUrl: "http://shop.example/x",
	},
	{
		form: "a password without a user",
		baseUrl: "http://:pass@shop.example",
		fullUrl: "http://:pass@shop.example/x",
		documentUrl: "http://shop.example/x",
	},
	{
		form: "a user without a password",
		baseUrl: "http://user@shop.example",
		fullUrl: "http://user@shop.example/x",
		documentUrl: "http://shop.example/x",
	},
];

for (const { form, baseUrl, fullUrl, documentUrl = fullUrl } of HOSTS) {
	test(`${form}: ${baseUrl} is this page as the browser reports it`, async ({ page }) => {
		await page.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: "<p>host</p>" }));
		const hostPage = new HostPage(page, baseUrl);
		expect(hostPage.fullUrl).toBe(fullUrl);

		// reached by the form as written
		await page.goto(`${baseUrl}/x`);
		expect(page.url()).toBe(fullUrl);
		await hostPage.navigation.expectThisPage();

		// reached through goto()
		await page.goto("about:blank");
		await hostPage.navigation.goto();
		expect(page.url()).toBe(fullUrl);
		await hostPage.navigation.expectThisPage();
		await page.waitForURL(hostPage.fullUrl);
		await expect(page).toHaveURL(documentUrl);
		if (documentUrl !== fullUrl) {
			await expect(page).not.toHaveURL(hostPage.fullUrl);
		}

		// expectAnotherPage() is this page's negation, on the same URL
		await expect(hostPage.navigation.expectAnotherPage({ timeout: 250 })).rejects.toThrow(
			`HostPage: expected to have left ${JSON.stringify(fullUrl)}; found ${JSON.stringify(fullUrl)}`,
		);
		await page.goto(fullUrl.replace(/\/x$/, "/elsewhere"));
		await hostPage.navigation.expectAnotherPage();
	});
}
