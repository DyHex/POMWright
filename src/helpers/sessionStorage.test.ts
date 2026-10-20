import type { Page } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import { PageObject, type StorageTypeFromOptions } from "../pageObject";
import {
	type AllEntries,
	type Codec,
	decodeValue,
	encodeEntries,
	json,
	type SessionStorage,
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

	it("rejects an undeclared non-string naming the key", () => {
		for (const value of [1, true, null, undefined, { a: 1 }, ["a"]]) {
			expect(() => encodeEntries({}, { user: value }, title)).toThrow(
				`${title}: value for "user" is not a string and no codec is declared for it`,
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

	it("names the key and the raw value when the codec fails, with the cause", () => {
		expect(() => decodeValue(schema, "user", "{not json", title)).toThrow(
			`${title}: value for "user" could not be decoded: {not json`,
		);
		try {
			decodeValue(schema, "attempts", "x", title);
		} catch (error) {
			expect((error as Error).cause).toEqual(new TypeError("not a number: x"));
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
	expectTypeOf(typed.get(computed)).resolves.toEqualTypeOf<{ [x: string]: string | null }>();
	expectTypeOf(typed.get(readonlyComputed)).resolves.toEqualTypeOf<{ [x: string]: string | null }>();
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
