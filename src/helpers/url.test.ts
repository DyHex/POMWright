import { describe, expect, expectTypeOf, it } from "vitest";
import {
	assertBaseUrl,
	assertUrlPart,
	assertUrlPath,
	composeFullUrl,
	createUrlMatcher,
	isAbsoluteUrl,
	resolveUrl,
	type UrlMatcher,
} from "./url";

describe("assertBaseUrl", () => {
	it("accepts origins with any scheme, host, port, and an optional trailing slash", () => {
		for (const value of [
			"http://localhost:9000",
			"https://localhost:9000/",
			"https://app.example",
			"https://app.example/",
			"https://app.example:8443",
			"https://SHOP.example",
			"https://user:secret@app.example",
		]) {
			expect(() => assertBaseUrl(value, "Poc"), value).not.toThrow();
		}
	});

	it("rejects empty, scheme-less, and non-origin values, naming the label and the value", () => {
		for (const value of [
			"",
			"localhost:9000",
			"app.example",
			"/login",
			"not a url",
			"https://app.example/app",
			"https://app.example/?a=1",
			"https://app.example/#h",
			"https://app.example?",
			"https://app.example/?",
			"https://app.example#",
		]) {
			expect(() => assertBaseUrl(value, "ShopLogin"), value).toThrow(
				new RegExp(
					`^ShopLogin: baseUrl must be an origin .*received ${JSON.stringify(value).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\.$`,
				),
			);
		}
	});

	it("rejects a URL whose scheme has no origin, saying so", () => {
		for (const value of [
			"chrome-extension://abcdef/",
			"chrome-extension://abcdef",
			"app://foo/",
			"file://host/",
			"file://host",
		]) {
			expect(() => assertBaseUrl(value, "Ext"), value).toThrow(
				`Ext: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received ${JSON.stringify(value)}, whose scheme has no URL origin.`,
			);
		}
	});
});

describe("assertUrlPath", () => {
	it('accepts "" and paths that start with exactly one slash, against a string or a RegExp base', () => {
		for (const base of ["https://app.example", /^https:\/\/app\.example$/]) {
			for (const value of ["", "/", "/login", "/app/login", "/a//b", "/a\\b", "/orders?tab=1", "/orders#top", "/søk"]) {
				expect(() => assertUrlPath(value, base, "Poc"), value).not.toThrow();
			}
		}
	});

	it("rejects paths without a leading slash, protocol-relative paths, and absolute URLs", () => {
		for (const value of ["login", "?tab=1", "#section", "https://app.example/a", "//other.example/x", "//"]) {
			expect(() => assertUrlPath(value, "https://app.example", "ShopLogin"), value).toThrow(
				`ShopLogin: urlPath must be "" or start with exactly one "/"; received ${JSON.stringify(value)}.`,
			);
		}
	});

	it("rejects a path that names a host through a backslash, a tab or a line break, against either base", () => {
		const hint = 'A "/" followed by another "/" or a "\\", also with a tab or line break between them, starts a host.';
		for (const base of ["https://app.example", /^https:\/\/app\.example$/]) {
			for (const value of [
				"/\\other.example/x",
				"/\t/other.example/x",
				"/\n/other.example/x",
				"/\r\\other.example/x",
			]) {
				expect(() => assertUrlPath(value, base, "ShopLogin"), value).toThrow(
					`ShopLogin: urlPath must be a path on the page object's origin; received ${JSON.stringify(value)}, which names the host "other.example" instead. ${hint}`,
				);
			}
			expect(() => assertUrlPath("/\\", base, "ShopLogin")).toThrow(
				`ShopLogin: urlPath must be a path on the page object's origin; received "/\\\\", which names a host instead. ${hint}`,
			);
		}
	});
});

describe("isAbsoluteUrl", () => {
	it("recognizes a scheme prefix", () => {
		for (const value of ["https://app.example/x", "http://localhost:9000", "about:blank", "mailto:a@b.example"]) {
			expect(isAbsoluteUrl(value), value).toBe(true);
		}
		for (const value of ["/x", "x", "", "?tab=1", "//other.example"]) {
			expect(isAbsoluteUrl(value), value).toBe(false);
		}
	});
});

describe("resolveUrl", () => {
	it("resolves relative input against the base exactly like Playwright's use.baseURL", () => {
		for (const base of ["https://app.example", "https://app.example/"]) {
			expect(resolveUrl("/login", base)).toBe("https://app.example/login");
			expect(resolveUrl("login", base)).toBe("https://app.example/login");
			expect(resolveUrl("./login", base)).toBe("https://app.example/login");
			expect(resolveUrl("../login", base)).toBe("https://app.example/login");
			expect(resolveUrl("?tab=1", base)).toBe("https://app.example/?tab=1");
			expect(resolveUrl("#h", base)).toBe("https://app.example/#h");
			expect(resolveUrl("", base)).toBe("https://app.example/");
		}
	});

	it("passes absolute input through and keeps a port", () => {
		expect(resolveUrl("https://other.example/x", "https://app.example")).toBe("https://other.example/x");
		expect(resolveUrl("about:blank", "https://app.example")).toBe("about:blank");
		expect(resolveUrl("/testpath", "http://localhost:9000")).toBe("http://localhost:9000/testpath");
	});

	it("rethrows an unresolvable pair naming both values", () => {
		expect(() => resolveUrl("/login", "localhost:9000")).toThrow(
			'Cannot resolve "/login" against baseUrl "localhost:9000".',
		);
	});
});

describe("createUrlMatcher", () => {
	const authUrl = "https://login.identity-provider.example/authorize?client=shop";

	it("tests the base against the origin and the path against the rest, each regex as written", () => {
		const cases: [string | RegExp, string | RegExp, boolean][] = [
			[/identity-provider/, /\/authorize/, true],
			[/identity-provider/, "/authorize", false],
			[/\.example$/, /^\/authorize\?client=\w+$/, true],
			[/^https:\/\/login\./, /AUTHORIZE/i, true],
			[/authorize/, /\/authorize/, false],
			["https://login.identity-provider.example/", /\/authorize/, true],
			["https://login.identity-provider.example", "/authorize?client=shop", true],
		];
		for (const [base, path, expected] of cases) {
			expect(createUrlMatcher(base, path).test(authUrl), `${String(base)} + ${String(path)}`).toBe(expected);
		}
	});

	it("handles all four type combinations on and off the page", () => {
		const onPage = "https://shop.example/account/42";
		const offPage = "https://shop.example/logout";
		const matchers = [
			createUrlMatcher("https://shop.example", "/account/42"),
			createUrlMatcher(/^https:\/\/(shop|admin)\.example$/, "/account/42"),
			createUrlMatcher("https://shop.example/", /^\/account\/\d+$/),
			createUrlMatcher(/\.example$/i, /\/account\//),
		];
		for (const matcher of matchers) {
			expect(matcher(new URL(onPage)), String(matcher)).toBe(true);
			expect(matcher.test(onPage), String(matcher)).toBe(true);
			expect(matcher.test(offPage), String(matcher)).toBe(false);
		}
	});

	it("normalizes a string base: trailing slash, upper-case host, default port", () => {
		const url = "https://shop.example/account/42";
		expect(createUrlMatcher("https://shop.example/", "/account/42").test(url)).toBe(true);
		expect(createUrlMatcher("https://SHOP.example", "/account/42").test(url)).toBe(true);
		expect(createUrlMatcher("https://shop.example:443", "/account/42").test(url)).toBe(true);
		expect(createUrlMatcher("https://shop.example:8443", "/account/42").test(url)).toBe(false);
	});

	it('treats a "" path as the root and keeps string paths exact', () => {
		const home = createUrlMatcher("https://shop.example", "");
		expect(home.test("https://shop.example/")).toBe(true);
		expect(home.test("https://shop.example/?tab=1")).toBe(false);
		const orders = createUrlMatcher("https://shop.example", "/orders");
		expect(orders.test("https://shop.example/orders")).toBe(true);
		expect(orders.test("https://shop.example/orders?tab=1")).toBe(false);
		expect(orders.test("https://shop.example/orders#top")).toBe(false);
	});

	it('keeps an empty "?" or "#", as Playwright\'s toHaveURL does, for a string and a RegExp path alike', () => {
		for (const matcher of [
			createUrlMatcher("https://shop.example", "/orders"),
			createUrlMatcher("https://shop.example", /^\/orders$/),
		]) {
			expect(matcher.test("https://shop.example/orders"), String(matcher)).toBe(true);
			expect(matcher.test("https://shop.example/orders?"), String(matcher)).toBe(false);
			expect(matcher.test("https://shop.example/orders#"), String(matcher)).toBe(false);
		}
		const withEmptyQuery = createUrlMatcher("https://shop.example", "/search?");
		expect(withEmptyQuery.test("https://shop.example/search?")).toBe(true);
		expect(withEmptyQuery.test("https://shop.example/search")).toBe(false);
		expect(createUrlMatcher("https://shop.example", /^\/search\??$/).test("https://shop.example/search?")).toBe(true);
	});

	it('compares "|" and "%7C" in a string path as one character, as Chromium reports the first as the second', () => {
		const pipe = createUrlMatcher("https://shop.example", "/a|b");
		expect(pipe.test("https://shop.example/a|b")).toBe(true);
		expect(pipe.test("https://shop.example/a%7Cb")).toBe(true);
		expect(pipe.test("https://shop.example/a%7cb")).toBe(false);
		expect(createUrlMatcher("https://shop.example", "/a%7Cb").test("https://shop.example/a|b")).toBe(true);
		// only in the path: the query and the fragment are compared as written
		const query = createUrlMatcher("https://shop.example", "/a?q=x|y");
		expect(query.test("https://shop.example/a?q=x|y")).toBe(true);
		expect(query.test("https://shop.example/a?q=x%7Cy")).toBe(false);
		// a RegExp path sees the URL as the browser reports it
		expect(createUrlMatcher("https://shop.example", /^\/a\|b$/).test("https://shop.example/a%7Cb")).toBe(false);
	});

	it('compares "^" and "%5E" in a string path as one character, as Node 20 and 22 keep the first and browsers report the second', () => {
		const caret = createUrlMatcher("https://shop.example", "/a^b");
		expect(caret.test("https://shop.example/a^b")).toBe(true);
		expect(caret.test("https://shop.example/a%5Eb")).toBe(true);
		expect(caret.test("https://shop.example/a%5eb")).toBe(false);
		expect(createUrlMatcher("https://shop.example", "/a%5Eb").test("https://shop.example/a^b")).toBe(true);
		// only in the path: the query and the fragment are compared as written
		expect(createUrlMatcher("https://shop.example", "/a?q=x^y").test("https://shop.example/a?q=x%5Ey")).toBe(false);
	});

	it("finds the rest of a URL with credentials", () => {
		const orders = createUrlMatcher("https://shop.example", "/orders?tab=1");
		expect(orders.test("https://user:secret@shop.example/orders?tab=1")).toBe(true);
		expect(orders.test("https://user@shop.example/orders?tab=1")).toBe(true);
		expect(orders.test("https://:secret@shop.example/orders?tab=1")).toBe(true);
	});

	it("gives the same answer on repeated calls even with g or y flags", () => {
		const matcher = createUrlMatcher(/shop\.example/g, /^\/orders$/y);
		for (let i = 0; i < 3; i++) {
			expect(matcher.test("https://shop.example/orders")).toBe(true);
		}
	});

	it("exposes the parts and a readable description", () => {
		const matcher = createUrlMatcher("https://SHOP.example/", /^\/orders$/i);
		expect(matcher.base).toBe("https://SHOP.example/");
		expect(matcher.path).toEqual(/^\/orders$/i);
		expect(String(matcher)).toBe('origin "https://shop.example" + path /^\\/orders$/i');
		expect(String(createUrlMatcher(/identity-provider/, ""))).toBe('origin /identity-provider/ + path "/"');
	});
});

describe("composeFullUrl", () => {
	it("returns the resolved string for two strings and a matcher otherwise", () => {
		expect(composeFullUrl("https://app.example", "/login")).toBe("https://app.example/login");
		expect(composeFullUrl("https://app.example", "")).toBe("https://app.example/");
		for (const [base, path] of [
			["https://app.example", /\/login/],
			[/app\.example/, "/login"],
			[/app\.example/, /\/login/],
		] as [string | RegExp, string | RegExp][]) {
			const fullUrl = composeFullUrl(base, path);
			expect(typeof fullUrl).toBe("function");
			expect((fullUrl as UrlMatcher).test("https://app.example/login")).toBe(true);
		}
	});

	it('writes a "^" in the path as "%5E", as every browser reports it, and keeps "|" and the query and fragment as given', () => {
		// on Node 24 new URL writes "%5E" already; on Node 20 and 22 it keeps "^", and composeFullUrl rewrites it there
		expect(composeFullUrl("https://app.example", "/a^b?q=a^b#a^b")).toBe("https://app.example/a%5Eb?q=a^b#a^b");
		expect(composeFullUrl("https://app.example", "/a|b")).toBe("https://app.example/a|b");
		expect(createUrlMatcher("https://app.example", "/a^b").test(composeFullUrl("https://app.example", "/a^b"))).toBe(
			true,
		);
	});

	it("types the result from the argument types", () => {
		expectTypeOf(composeFullUrl("https://app.example", "/login")).toEqualTypeOf<string>();
		expectTypeOf(composeFullUrl("https://app.example", /\/login/)).toEqualTypeOf<UrlMatcher>();
		expectTypeOf(composeFullUrl(/app/, "/login")).toEqualTypeOf<UrlMatcher>();
		expectTypeOf(composeFullUrl(/app/, /login/)).toEqualTypeOf<UrlMatcher>();
	});
});

describe("string paths as the browser reports them", () => {
	const paths = ["/søk", "/a b", "/a/./b", "/a/../b", "/x?q=a b", "/x#frag ment", "/café?q=ø"];

	it("a page object's matcher accepts its own fullUrl, whatever new URL encodes or resolves", () => {
		for (const path of paths) {
			const fullUrl = composeFullUrl("https://shop.example", path);
			expect(createUrlMatcher("https://shop.example", path).test(fullUrl), path).toBe(true);
			expect(createUrlMatcher(/shop\.example/, path).test(fullUrl), `RegExp base, ${path}`).toBe(true);
		}
		expect(composeFullUrl("https://shop.example", "/søk")).toBe("https://shop.example/s%C3%B8k");
	});

	it("still tells pages apart: another path, a query or a hash is another page", () => {
		const search = createUrlMatcher("https://shop.example", "/søk");
		expect(search.test("https://shop.example/s%C3%B8k")).toBe(true);
		expect(search.test("https://shop.example/s%C3%B8k?q=1")).toBe(false);
		expect(search.test("https://shop.example/sok")).toBe(false);
	});

	it("describes a string path in the form it is compared in", () => {
		expect(String(createUrlMatcher("https://shop.example", "/søk"))).toBe(
			'origin "https://shop.example" + path "/s%C3%B8k"',
		);
		expect(createUrlMatcher("https://shop.example", "/søk").path).toBe("/søk");
	});
});

describe("assertUrlPart", () => {
	it("accepts a string or a RegExp and names anything else", () => {
		expect(() => assertUrlPart("baseUrl", "https://a.example", "Poc")).not.toThrow();
		expect(() => assertUrlPart("urlPath", /x/, "Poc")).not.toThrow();
		const cases: [unknown, string][] = [
			[undefined, "undefined"],
			[null, "null"],
			[9000, "9000"],
			[{}, "an object"],
			[["/x"], "an object"],
		];
		for (const [value, received] of cases) {
			expect(() => assertUrlPart("baseUrl", value, "Poc")).toThrowError(
				`Poc: baseUrl must be a string or a RegExp; received ${received}.`,
			);
		}
		expect(() => assertUrlPart("urlPath", undefined, "Poc")).toThrowError(
			"Poc: urlPath must be a string or a RegExp; received undefined.",
		);
	});
});
