import { describe, expect, expectTypeOf, it } from "vitest";
import {
	assertBaseUrl,
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
		]) {
			expect(() => assertBaseUrl(value, "ShopLogin"), value).toThrow(
				new RegExp(
					`^ShopLogin: baseUrl must be an origin .*received ${JSON.stringify(value).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\.$`,
				),
			);
		}
	});
});

describe("assertUrlPath", () => {
	it('accepts "" and paths that start with exactly one slash', () => {
		for (const value of ["", "/", "/login", "/app/login", "/a//b", "/orders?tab=1", "/orders#top"]) {
			expect(() => assertUrlPath(value, "Poc"), value).not.toThrow();
		}
	});

	it("rejects paths without a leading slash, protocol-relative paths, and absolute URLs", () => {
		for (const value of ["login", "?tab=1", "#section", "https://app.example/a", "//other.example/x", "//"]) {
			expect(() => assertUrlPath(value, "ShopLogin"), value).toThrow(
				`ShopLogin: urlPath must be "" or start with exactly one "/"; received ${JSON.stringify(value)}.`,
			);
		}
	});
});

describe("isAbsoluteUrl", () => {
	it("recognises a scheme prefix", () => {
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

	it("normalises a string base: trailing slash, upper-case host, default port", () => {
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

	it("types the result from the argument types", () => {
		expectTypeOf(composeFullUrl("https://app.example", "/login")).toEqualTypeOf<string>();
		expectTypeOf(composeFullUrl("https://app.example", /\/login/)).toEqualTypeOf<UrlMatcher>();
		expectTypeOf(composeFullUrl(/app/, "/login")).toEqualTypeOf<UrlMatcher>();
		expectTypeOf(composeFullUrl(/app/, /login/)).toEqualTypeOf<UrlMatcher>();
	});
});
