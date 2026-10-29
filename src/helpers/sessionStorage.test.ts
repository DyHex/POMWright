import type { Page } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import { PageObject, type StorageTypeFromOptions } from "../pageObject";
import {
	type AllEntries,
	type Codec,
	type Decoded,
	decodeValue,
	encodeEntries,
	json,
	SessionStorage,
	type SessionStorageSchema,
} from "./sessionStorage";

const title = "Poc.SessionStorage.set";

type VoiceCheckoutModel = { offerings: { offeringId: string }[] };
const model: VoiceCheckoutModel = { offerings: [{ offeringId: "20000063" }] };

/** A codec that is not JSON: numbers stored as decimal text. */
const number = (): Codec<number> => ({
	parse: (raw) => {
		const value = Number(raw);
		if (Number.isNaN(value)) {
			throw new TypeError(`not a number: ${raw}`);
		}
		return value;
	},
	stringify: (value) => String(value),
});

const schema = { user: json<VoiceCheckoutModel>(), attempts: number() };

describe("json", () => {
	it("round-trips objects, arrays, numbers and the empty string", () => {
		const codec = json<unknown>();
		for (const value of [model, [1, "a", null], 42, "", "abc", { nested: { deep: true } }]) {
			expect(codec.parse(codec.stringify(value))).toEqual(value);
		}
	});

	it("stores a string with its JSON quotes, which is what a JSON storage layer expects", () => {
		expect(json<string>().stringify("abc")).toBe('"abc"');
	});
});

describe("encodeEntries", () => {
	it("passes undeclared strings verbatim, including JSON text the caller produced", () => {
		const text = JSON.stringify(model);
		expect(encodeEntries({}, { token: "abc", empty: "", user: text }, title)).toEqual({
			token: "abc",
			empty: "",
			user: text,
		});
	});

	it("keeps keys that name Object.prototype members as own entries, __proto__ included", () => {
		const entries = Object.fromEntries([
			["__proto__", "p"],
			["constructor", "c"],
			["toString", "t"],
		]);
		expect(Object.entries(encodeEntries({}, entries, title))).toEqual([
			["__proto__", "p"],
			["constructor", "c"],
			["toString", "t"],
		]);
	});

	it("rejects an undeclared non-string naming the key", () => {
		for (const value of [1, true, null, undefined, { a: 1 }, ["a"]]) {
			expect(() => encodeEntries({}, { user: value }, title)).toThrow(
				`${title}: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)`,
			);
		}
	});

	it("applies the declared codec and leaves other keys as strings", () => {
		expect(encodeEntries(schema, { user: model, attempts: 3, token: "abc" }, title)).toEqual({
			user: JSON.stringify(model),
			attempts: "3",
			token: "abc",
		});
	});

	it("reports a codec that throws with the key and the cause", () => {
		const failing: SessionStorageSchema = {
			bad: {
				parse: () => null,
				stringify: () => {
					throw new Error("boom");
				},
			},
		};
		expect(() => encodeEntries(failing, { bad: 1 }, title)).toThrow(`${title}: value for "bad" could not be encoded`);
		try {
			encodeEntries(failing, { bad: 1 }, title);
		} catch (error) {
			expect((error as Error).cause).toEqual(new Error("boom"));
		}
	});

	it("rejects a codec result that is not a string", () => {
		expect(() => encodeEntries({ value: json<unknown>() }, { value: undefined }, title)).toThrow(
			`${title}: the codec for "value" returned undefined instead of a string`,
		);
	});

	it("does not treat inherited properties as codecs", () => {
		expect(() => encodeEntries({}, { toString: { a: 1 } }, title)).toThrow(/is not a string and no codec/);
	});
});

describe("decodeValue", () => {
	it("returns null for null", () => {
		expect(decodeValue(schema, "user", null, title)).toBeNull();
		expect(decodeValue({}, "token", null, title)).toBeNull();
	});

	it("returns an undeclared value as stored, even when it looks like JSON", () => {
		for (const raw of ["abc", "", "123", "true", "null", '{"a":1}', '"quoted"']) {
			expect(decodeValue({}, "key", raw, title)).toBe(raw);
		}
	});

	it("parses a declared key through its codec", () => {
		expect(decodeValue(schema, "user", JSON.stringify(model), title)).toEqual(model);
		expect(decodeValue(schema, "attempts", "3", title)).toBe(3);
	});

	it("gives the reason, the length and the whole value, quoted, when the codec fails, with the cause", () => {
		// JSON.parse's own wording differs between Node versions
		expect(() => decodeValue(schema, "user", "{not json", title)).toThrow(
			/^Poc\.SessionStorage\.set: value for "user" could not be decoded \(SyntaxError: .+\); stored value, 9 characters: "\{not json"$/,
		);
		expect(() => decodeValue(schema, "attempts", "x", title)).toThrow(
			`${title}: value for "attempts" could not be decoded (TypeError: not a number: x); stored value, 1 character: "x"`,
		);
		// an empty or whitespace value is visible
		expect(() => decodeValue(schema, "user", "", title)).toThrow(/; stored value, 0 characters: ""$/);
		expect(() => decodeValue(schema, "user", " \n", title)).toThrow(/; stored value, 2 characters: " \\n"$/);
		const silent: Codec<string> = {
			parse: () => {
				throw new RangeError();
			},
			stringify: String,
		};
		expect(() => decodeValue({ token: silent }, "token", "v", title)).toThrow(
			`${title}: value for "token" could not be decoded (RangeError); stored value, 1 character: "v"`,
		);
		try {
			decodeValue(schema, "attempts", "x", title);
		} catch (error) {
			expect((error as Error).cause).toEqual(new TypeError("not a number: x"));
		}
	});
});

describe("a batch the page leaves", () => {
	/** A page whose storage call fails with `failure` on call number `failAt`, after which the page is at `urlAfter`. */
	const pageFailingAt = (failAt: number, failure: Error, urlAfter = "http://localhost:9000/") => {
		let calls = 0;
		let url = "http://localhost:9000/teststorage";
		const fail = async () => {
			calls++;
			if (calls === failAt) {
				url = urlAfter;
				throw failure;
			}
		};
		return {
			url: () => url,
			evaluate: async () => false,
			sessionStorage: { setItem: fail, removeItem: fail },
		} as unknown as Page;
	};
	const destroyed = new Error(
		"webStorage.setItem: Execution context was destroyed, most likely because of a navigation",
	);
	const write = (page: Page, entries: Record<string, string>) =>
		(
			new SessionStorage(page, { label: "Shop" }) as unknown as {
				write(m: string, e: Record<string, string>): Promise<void>;
			}
		).write("set", entries);

	it("names the keys already written when the page navigates during the batch", async () => {
		const error = await write(pageFailingAt(3, destroyed), { a: "1", b: "2", c: "3", d: "4" }).catch((e: Error) => e);
		expect((error as Error).message).toBe(
			`Shop.SessionStorage.set: the page navigated to http://localhost:9000/ while set() was writing to http://localhost:9000; 2 of 4 keys were written ("a", "b"); "c" was being written and may have reached the new document`,
		);
		expect((error as Error).cause).toBe(destroyed);
	});

	it("says so for a lone key, and when the page has left for another origin", async () => {
		const error = await write(pageFailingAt(1, new Error("gone"), "http://127.0.0.1:9000/x"), { token: "t" }).catch(
			(e: Error) => e,
		);
		expect((error as Error).message).toBe(
			`Shop.SessionStorage.set: the page navigated to http://127.0.0.1:9000/x while set() was writing to http://localhost:9000; 0 of 1 key was written; "token" was being written and may have reached the new document`,
		);
	});

	it("quotes every key it names, so an empty key and one holding a comma read as themselves", async () => {
		const error = await write(pageFailingAt(3, destroyed), { "": "1", "a, b": "2", c: "3" }).catch((e: Error) => e);
		expect((error as Error).message).toBe(
			`Shop.SessionStorage.set: the page navigated to http://localhost:9000/ while set() was writing to http://localhost:9000; 2 of 3 keys were written ("", "a, b"); "c" was being written and may have reached the new document`,
		);
	});

	it("labels any other failure and keeps it as the cause", async () => {
		const quota = new Error("webStorage.setItem: QuotaExceededError: The quota has been exceeded.");
		const error = await write(pageFailingAt(2, quota, "http://localhost:9000/teststorage"), { a: "1", b: "2" }).catch(
			(e: Error) => e,
		);
		expect((error as Error).message).toBe(
			"Shop.SessionStorage.set: webStorage.setItem: QuotaExceededError: The quota has been exceeded.",
		);
		expect((error as Error).cause).toBe(quota);
	});

	it("names the keys already removed when clear() is interrupted", async () => {
		const helper = new SessionStorage(pageFailingAt(2, destroyed), { label: "Shop" }) as unknown as {
			eachKey(
				m: string,
				k: string[],
				words: readonly [string, string],
				call: (key: string) => Promise<void>,
			): Promise<void>;
			page: Page;
		};
		const error = await helper
			.eachKey("clear", ["token", "locale", "theme"], ["removing keys from", "removed"], (key) =>
				helper.page.sessionStorage.removeItem(key),
			)
			.catch((e: Error) => e);
		expect((error as Error).message).toBe(
			`Shop.SessionStorage.clear: the page navigated to http://localhost:9000/ while clear() was removing keys from http://localhost:9000; 1 of 3 keys were removed ("token"); "locale" was being removed and may have reached the new document`,
		);
	});
});

describe("a call the page leaves while it succeeds", () => {
	/** A page whose storage calls all succeed; the page is at `urlAfter` once call number `moveAt` has run. */
	const pageMovingAt = (moveAt: number, urlAfter: string, urlBefore = "http://localhost:9000/teststorage") => {
		let calls = 0;
		let url = urlBefore;
		const written: string[] = [];
		const answer = <T>(value: T) => {
			calls++;
			if (calls === moveAt) {
				url = urlAfter;
			}
			return Promise.resolve(value);
		};
		const page = {
			url: () => url,
			evaluate: async () => false,
			sessionStorage: {
				setItem: (key: string) => {
					written.push(key);
					return answer(undefined);
				},
				removeItem: () => answer(undefined),
				getItem: (key: string) => answer(`value of ${key}`),
				items: () => answer([{ name: "token", value: "abc" }]),
				clear: () => answer(undefined),
			},
		} as unknown as Page;
		return { page, written };
	};
	type Internals = {
		write(m: string, e: Record<string, string>): Promise<void>;
		read(keys: string | readonly string[] | undefined): Promise<unknown>;
		guarded<T>(
			m: string,
			call: () => Promise<T>,
			navigated: (from: string, to: string, cause: unknown) => Error,
		): Promise<T>;
		navigatedDuring(m: string, doing: string, consequence: string): (from: string, to: string, cause: unknown) => Error;
	};
	const internals = (page: Page) => new SessionStorage(page, { label: "Shop" }) as unknown as Internals;
	const failure = (promise: Promise<unknown>) => promise.then(() => undefined).catch((error: Error) => error);

	it("stops a batch whose page left for another origin between two calls that both resolved", async () => {
		const { page, written } = pageMovingAt(2, "http://127.0.0.1:9000/");
		const error = await failure(internals(page).write("set", { a: "1", b: "2", c: "3" }));
		expect(error?.message).toBe(
			`Shop.SessionStorage.set: the page navigated to http://127.0.0.1:9000/ while set() was writing to http://localhost:9000; 1 of 3 keys were written ("a"); "b" was being written and may have reached the new document`,
		);
		expect(error?.cause).toBeUndefined();
		expect(written).toEqual(["a", "b"]);
	});

	it("goes on after a navigation within the origin, whose storage is the same", async () => {
		const { page, written } = pageMovingAt(1, "http://localhost:9000/elsewhere");
		await internals(page).write("set", { a: "1", b: "2" });
		expect(written).toEqual(["a", "b"]);
	});

	it("fails a read that came from the new origin instead of returning its value, one key, several or all", async () => {
		const one = await failure(internals(pageMovingAt(1, "http://127.0.0.1:9000/").page).read("token"));
		expect(one?.message).toBe(
			'Shop.SessionStorage.get: the page navigated to http://127.0.0.1:9000/ while get() was reading "token" from http://localhost:9000; it may have read the new document',
		);
		const several = await failure(internals(pageMovingAt(2, "http://127.0.0.1:9000/").page).read(["a", "b", "c"]));
		expect(several?.message).toMatch(
			/^Shop\.SessionStorage\.get: the page navigated to http:\/\/127\.0\.0\.1:9000\/ while get\(\) was reading "[abc]" from http:\/\/localhost:9000; it may have read the new document$/,
		);
		const all = await failure(internals(pageMovingAt(1, "http://127.0.0.1:9000/").page).read(undefined));
		expect(all?.message).toBe(
			"Shop.SessionStorage.get: the page navigated to http://127.0.0.1:9000/ while get() was reading every entry from http://localhost:9000; it may have read the new document",
		);
	});

	it("names a single call by what it was doing", async () => {
		const { page } = pageMovingAt(1, "http://127.0.0.1:9000/");
		const helper = internals(page);
		const error = await failure(
			helper.guarded(
				"clear",
				() => page.sessionStorage.clear(),
				helper.navigatedDuring("clear", "removing every entry from", "it may have reached the new document"),
			),
		);
		expect(error?.message).toBe(
			"Shop.SessionStorage.clear: the page navigated to http://127.0.0.1:9000/ while clear() was removing every entry from http://localhost:9000; it may have reached the new document",
		);
	});

	it("compares a URL without an origin whole", async () => {
		const { page } = pageMovingAt(1, "http://localhost:9000/", "about:blank");
		const error = await failure(internals(page).write("set", { a: "1" }));
		expect(error?.message).toBe(
			`Shop.SessionStorage.set: the page navigated to http://localhost:9000/ while set() was writing to about:blank; 0 of 1 key was written; "a" was being written and may have reached the new document`,
		);
	});

	it("names where the page went by its origin and path, without the query or fragment", async () => {
		const { page } = pageMovingAt(2, "https://login.example/callback?code=secret#state");
		const error = await failure(internals(page).write("set", { a: "1", b: "2" }));
		expect(error?.message).toBe(
			`Shop.SessionStorage.set: the page navigated to https://login.example/callback while set() was writing to http://localhost:9000; 1 of 2 keys were written ("a"); "b" was being written and may have reached the new document`,
		);
	});

	it("names a destination without an origin by its whole URL", async () => {
		const { page } = pageMovingAt(1, "data:text/html,<p>left?x=1</p>");
		const error = await failure(internals(page).read("token"));
		expect(error?.message).toBe(
			'Shop.SessionStorage.get: the page navigated to data:text/html,<p>left?x=1</p> while get() was reading "token" from http://localhost:9000; it may have read the new document',
		);
	});
});

describe("a refused storage call", () => {
	const refused = new Error("webStorage.setItem: SecurityError: The operation is insecure.");
	const labeled = "webStorage.setItem: SecurityError: The operation is insecure.";
	/** A page at `url` whose document answers `domain` for document.domain, or a closed one, whose evaluation fails. */
	const accessOn = (url: string, domain: string | "closed") =>
		new SessionStorage(
			{
				url: () => url,
				evaluate: async () => {
					if (domain === "closed") {
						throw new Error("page.evaluate: Target page, context or browser has been closed");
					}
					return domain;
				},
			} as unknown as Page,
			{ label: "Shop" },
		) as unknown as { access(m: string, call: () => Promise<void>): Promise<void> };
	const fail = async () => {
		throw refused;
	};

	it("on a document whose origin is opaque says so, whatever its URL", async () => {
		await expect(accessOn("http://localhost:9000/sandboxed", "").access("set", fail)).rejects.toThrow(
			"Shop.SessionStorage.set: the document at http://localhost:9000/sandboxed cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)",
		);
	});

	it("on a page without an origin says so, without pointing seed at seed()", async () => {
		await expect(accessOn("about:blank", "").access("get", fail)).rejects.toThrow(
			"Shop.SessionStorage.get: the page has no origin yet (about:blank); navigate to the origin first or use seed()",
		);
		await expect(accessOn("about:blank", "").access("seed", fail)).rejects.toThrow(
			/^Shop\.SessionStorage\.seed: the page has no origin yet \(about:blank\); navigate to the origin first$/,
		);
	});

	it("on an about:blank popup that inherited its opener's origin labels Playwright's error", async () => {
		const error = await accessOn("about:blank", "localhost")
			.access("set", fail)
			.catch((e: Error) => e);
		expect((error as Error).message).toBe(`Shop.SessionStorage.set: ${labeled}`);
		expect((error as Error).cause).toBe(refused);
	});

	it("on a closed page labels Playwright's error, with or without a URL origin", async () => {
		for (const url of ["about:blank", "http://localhost:9000/"]) {
			await expect(accessOn(url, "closed").access("clear", fail), url).rejects.toThrow(
				`Shop.SessionStorage.clear: ${labeled}`,
			);
		}
	});

	it("otherwise labels Playwright's error", async () => {
		await expect(accessOn("http://localhost:9000/", "localhost").access("clear", fail)).rejects.toThrow(
			`Shop.SessionStorage.clear: ${labeled}`,
		);
	});
});

describe("the origin option", () => {
	// the constructor only validates; it calls nothing on the page
	const unusedPage = {} as Page;
	const rule =
		'Shop.SessionStorage.constructor: origin must be an origin such as "https://app.example" or "http://localhost:9000" ' +
		"(scheme, host, optional port, no path, query or hash); received";

	it("accepts an origin, with or without a trailing slash", () => {
		for (const origin of ["https://app.example", "http://localhost:9000/", "https://SHOP.example:8443"]) {
			expect(() => new SessionStorage(unusedPage, { label: "Shop", origin }), origin).not.toThrow();
		}
	});

	it("rejects a URL whose scheme has no origin, saying so", () => {
		for (const origin of [
			"chrome-extension://abcdef/",
			"chrome-extension://abcdef",
			"app://foo/",
			"file://host/",
			"file://host",
		]) {
			expect(() => new SessionStorage(unusedPage, { label: "Shop", origin }), origin).toThrow(
				`${rule} ${JSON.stringify(origin)}, whose scheme has no URL origin`,
			);
		}
	});

	it("rejects a value that is not an origin with the rule alone", () => {
		for (const origin of ["localhost:9000", "https://app.example/app", "not a url"]) {
			expect(() => new SessionStorage(unusedPage, { label: "Shop", origin }), origin).toThrow(
				new RegExp(`received ${JSON.stringify(origin).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`),
			);
		}
	});
});

// Type-level contract. Never called; tsc checks it through vitest's typecheck mode, where an unused
// `@ts-expect-error` is a failing test.
declare const page: Page;
declare const typed: SessionStorage<typeof schema>;
declare const plain: SessionStorage;
declare const computed: string[];
declare const readonlyComputed: readonly string[];
declare const dynamicKey: string;
declare const declaredKey: keyof typeof schema;

const voiceStorage = { voiceCheckout: json<VoiceCheckoutModel>() };

class VoicePage extends PageObject<"main.x", { storage: typeof voiceStorage }> {
	constructor() {
		super(page, "https://app.example", "/voice", { sessionStorage: { schema: voiceStorage } });
	}
	protected defineLocators() {}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class AccountPage extends PageObject<"main.x", { urlPathType: RegExp; storage: typeof voiceStorage }> {
	constructor() {
		super(page, "https://app.example", /^\/account\/\d+$/, { sessionStorage: { schema: voiceStorage } });
	}
	protected defineLocators() {}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class PlainPage extends PageObject<"main.x"> {
	constructor() {
		super(page, "https://app.example", "/plain");
	}
	protected defineLocators() {}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class WrongSchemaPage extends PageObject<"main.x", { storage: typeof voiceStorage }> {
	constructor() {
		// @ts-expect-error the schema value must match the declared storage type
		super(page, "https://app.example", "/x", { sessionStorage: { schema: { other: json<string>() } } });
	}
	protected defineLocators() {}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class ValueWithoutTypePage extends PageObject<"main.x"> {
	constructor() {
		// @ts-expect-error a schema value without its type: declare it, PageObject<Paths, { storage: typeof schema }>
		super(page, "https://app.example", "/x", { sessionStorage: { schema: voiceStorage } });
	}
	protected defineLocators() {}
}

type OptionalKey = { voiceCheckout: Codec<VoiceCheckoutModel>; token?: Codec<string> };
class OptionalKeyWithoutCodecPage extends PageObject<"main.x", { storage: OptionalKey }> {
	constructor() {
		// @ts-expect-error a declared key, optional or not, needs its codec in the value
		super(page, "https://app.example", "/x", { sessionStorage: { schema: voiceStorage } });
	}
	protected defineLocators() {}
}

class EmptySchemaPage extends PageObject<"main.x"> {
	constructor() {
		// no declared keys: an empty value is the empty schema
		super(page, "https://app.example", "/x", { sessionStorage: { schema: {} } });
	}
	protected defineLocators() {}
}

// a standalone helper: an explicit schema type needs its value; without a type argument it is taken from the value
const schemaAgreement = () => {
	// @ts-expect-error an explicit schema type without its value
	const typeWithoutValue = new SessionStorage<typeof voiceStorage>(page);
	// @ts-expect-error options without the schema
	const optionsWithoutSchema = new SessionStorage<typeof voiceStorage>(page, { label: "Voice" });
	const typeAndValue = new SessionStorage<typeof voiceStorage>(page, { schema: voiceStorage });
	const inferred = new SessionStorage(page, { schema: voiceStorage });
	expectTypeOf(inferred).toEqualTypeOf<SessionStorage<typeof voiceStorage>>();
	return [typeWithoutValue, optionsWithoutSchema, typeAndValue];
};
void [ValueWithoutTypePage, OptionalKeyWithoutCodecPage, EmptySchemaPage, schemaAgreement];

declare const voice: VoicePage;
declare const account: AccountPage;
declare const plainPage: PlainPage;

const typeContract = async () => {
	// set: key or record, typed per key
	await typed.set("token", "abc");
	await typed.set("attempts", 3);
	await typed.set({ user: model, attempts: 1, token: "abc" });
	// @ts-expect-error a declared key with the wrong type
	await typed.set("attempts", "3");
	// @ts-expect-error an undeclared key must be a string
	await typed.set({ other: { x: 1 } });
	// @ts-expect-error a declared key with the wrong shape
	await typed.set({ user: { nope: 1 } });
	// @ts-expect-error without a schema every value is a string
	await plain.set("attempts", 3);

	// get: key, list, or everything
	expectTypeOf(typed.get("user")).resolves.toEqualTypeOf<VoiceCheckoutModel | null>();
	expectTypeOf(typed.get("attempts")).resolves.toEqualTypeOf<number | null>();
	expectTypeOf(typed.get("token")).resolves.toEqualTypeOf<string | null>();
	expectTypeOf(typed.get(["token", "attempts"])).resolves.toEqualTypeOf<{
		token: string | null;
		attempts: number | null;
	}>();
	expectTypeOf(typed.get(["token", "user"] as const)).resolves.toEqualTypeOf<{
		token: string | null;
		user: VoiceCheckoutModel | null;
	}>();
	// a key typed string may be any key: a string or any declared codec's type
	expectTypeOf(typed.get(computed)).resolves.toEqualTypeOf<{
		[x: string]: string | VoiceCheckoutModel | number | null;
	}>();
	expectTypeOf(typed.get(readonlyComputed)).resolves.toEqualTypeOf<{
		[x: string]: string | VoiceCheckoutModel | number | null;
	}>();
	expectTypeOf(typed.get(dynamicKey)).resolves.toEqualTypeOf<string | VoiceCheckoutModel | number | null>();
	expectTypeOf(plain.get(dynamicKey)).resolves.toEqualTypeOf<string | null>();
	expectTypeOf(plain.get(computed)).resolves.toEqualTypeOf<{ [x: string]: string | null }>();
	expectTypeOf(typed.get(declaredKey)).resolves.toEqualTypeOf<VoiceCheckoutModel | number | null>();
	await typed.set(dynamicKey, model);
	await typed.set(dynamicKey, "abc");
	await typed.seed(dynamicKey, 3);
	// @ts-expect-error the value may be a declared codec's type, so it is not known to be a string
	(await typed.get(dynamicKey))?.toUpperCase();
	// a key typed as a pattern may be any declared key it matches
	const patternKey = "user" as `u${string}`;
	expectTypeOf(typed.get(patternKey)).resolves.toEqualTypeOf<string | VoiceCheckoutModel | null>();
	expectTypeOf(plain.get()).resolves.toEqualTypeOf<Record<string, string>>();
	expectTypeOf(typed.get()).resolves.toMatchTypeOf<{ user?: VoiceCheckoutModel; attempts?: number }>();
	expectTypeOf<AllEntries<typeof schema>["anything"]>().toEqualTypeOf<string | VoiceCheckoutModel | number>();
	// @ts-expect-error a literal empty list is rejected
	await typed.get([]);
	// @ts-expect-error same without a schema
	await plain.get([]);

	// clear: nothing, a key, or a list
	await typed.clear();
	await typed.clear("token");
	await typed.clear(["token", "user"]);
	await typed.clear(computed);
	await typed.clear(readonlyComputed);
	// @ts-expect-error a literal empty list is rejected
	await typed.clear([]);

	// seed: key or record, typed per key, with an optional origin
	await typed.seed("attempts", 3);
	await typed.seed("token", "abc", { origin: "https://b.example" });
	await typed.seed({ user: model, token: "abc" }, { origin: "https://b.example" });
	// @ts-expect-error a declared key with the wrong type
	await typed.seed("attempts", "3");

	// codecs
	const widened: Codec<unknown> = json<VoiceCheckoutModel>();
	void widened;
	expectTypeOf(json<VoiceCheckoutModel>()).toEqualTypeOf<Codec<VoiceCheckoutModel>>();

	// the schema named in the page object's options bag
	expectTypeOf(voice.sessionStorage.get("voiceCheckout")).resolves.toEqualTypeOf<VoiceCheckoutModel | null>();
	expectTypeOf(voice.sessionStorage.get("other")).resolves.toEqualTypeOf<string | null>();
	expectTypeOf(voice.urlPath).toEqualTypeOf<string>();
	expectTypeOf(account.sessionStorage.get("voiceCheckout")).resolves.toEqualTypeOf<VoiceCheckoutModel | null>();
	expectTypeOf(account.urlPath).toEqualTypeOf<RegExp>();
	expectTypeOf(plainPage.sessionStorage.get("anything")).resolves.toEqualTypeOf<string | null>();
	expectTypeOf(plainPage.sessionStorage.get()).resolves.toEqualTypeOf<Record<string, string>>();
	expectTypeOf<StorageTypeFromOptions<{ storage: typeof voiceStorage }>>().toEqualTypeOf<typeof voiceStorage>();
	expectTypeOf<StorageTypeFromOptions<{ urlPathType: RegExp }>>().toEqualTypeOf<Record<never, never>>();
	// @ts-expect-error without a schema every value is a string
	await plainPage.sessionStorage.set("n", 1);
};
void typeContract;
void WrongSchemaPage;

describe("Decoded, per member of the key's type", () => {
	type Schema = typeof schema;
	type Brand = string & { readonly __brand: "Key" };

	it("types a literal by its codec, or as a string when it has none", () => {
		expectTypeOf<Decoded<Schema, "user">>().toEqualTypeOf<VoiceCheckoutModel>();
		expectTypeOf<Decoded<Schema, "theme">>().toEqualTypeOf<string>();
		expectTypeOf<Decoded<Schema, "user" | "theme">>().toEqualTypeOf<VoiceCheckoutModel | string>();
	});

	it("types string and a branded string as any declared key", () => {
		expectTypeOf<Decoded<Schema, string>>().toEqualTypeOf<string | VoiceCheckoutModel | number>();
		expectTypeOf<Decoded<Schema, Brand>>().toEqualTypeOf<string | VoiceCheckoutModel | number>();
	});

	it("types a pattern by the declared keys it can match", () => {
		expectTypeOf<Decoded<Schema, `u${string}`>>().toEqualTypeOf<string | VoiceCheckoutModel>();
		expectTypeOf<Decoded<Schema, `form:${string}`>>().toEqualTypeOf<string>();
		expectTypeOf<Decoded<Schema, Uppercase<string>>>().toEqualTypeOf<string>();
		expectTypeOf<Decoded<Schema, "attempts" | `u${string}`>>().toEqualTypeOf<number | string | VoiceCheckoutModel>();
	});
});
