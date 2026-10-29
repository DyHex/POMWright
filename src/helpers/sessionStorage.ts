/**
 * `SessionStorage`: Playwright's `page.sessionStorage` with batches, step titles, origin checks, per-key
 * codecs, and seeding before the app loads.
 *
 * Values are strings unless a codec is declared for the key, so without a schema the helper is exactly
 * Playwright's contract: strings in, strings out, `null` for a missing key. A helper constructed with an
 * `origin` (every page object with a string `baseUrl`) refuses to touch another origin's storage, which is
 * unreachable without leaving the current document anyway. `seed` goes through the page's seed registry,
 * which writes at once when the page is on the origin and otherwise adds an init script that writes on the
 * first arrival there. Calls for one origin take turns on the page (`storageTurns.ts`), in call order.
 */
import { type Page, test } from "@playwright/test";
import { callerLocation, captureCallSite, type StepLocation, siteLocation } from "./callSite";
import { describeKeys, originOf, type ReadTestOutcome, registryFor } from "./sessionStorageSeed";
import { PAGE_WIDE, takeTurn } from "./storageTurns";

/**
 * How a session storage key's value is stored as a string and read back: `stringify` on the way in, `parse` on the way
 * out. Declare one per key in a schema; `json<T>()` is the one POMWright ships.
 *
 * @example
 * ```ts
 * const number = (): Codec<number> => ({ parse: (raw) => Number(raw), stringify: (value) => String(value) });
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#codec
 */
export type Codec<T> = {
	/**
	 * Turns the stored string into the value. An error it throws makes `get` fail, naming the key, the error and the stored value.
	 *
	 * @param raw The string as stored.
	 * @returns The value.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#parse
	 */
	parse(raw: string): T;
	/**
	 * Turns the value into the string to store. It must return a string.
	 *
	 * @param value The value given to `set` or `seed`.
	 * @returns The string to store.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#stringify
	 */
	stringify(value: T): string;
};

/**
 * The JSON codec: `JSON.stringify` in, `JSON.parse` out. `T` types the key; the parsed value is not checked against
 * it, exactly as `JSON.parse(…) as T`. For a string key that an app reads as JSON, `json<string>()` stores the quotes.
 *
 * @returns A codec.
 *
 * @example
 * ```ts
 * const storage = new SessionStorage(page, { schema: { user: json<{ name: string }>() } });
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#json
 */
export const json = <T>(): Codec<T> => ({
	parse: (raw) => JSON.parse(raw) as T,
	stringify: (value) => JSON.stringify(value),
});

/**
 * Codecs by key: the `schema` option of `SessionStorage` and of a page object's `sessionStorage` option. A key that is
 * not declared holds a string.
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#sessionstorageschema
 */
export type SessionStorageSchema = Record<string, Codec<unknown>>;

/**
 * The options of `new SessionStorage(page, options)`: a label, the origin the helper belongs to, and its schema.
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#sessionstorageoptions
 */
export type SessionStorageOptions<S extends SessionStorageSchema> = {
	/** Prefix for step titles and error messages. */
	label?: string;
	/** The origin this helper belongs to: the default target of `seed`, and the only origin `set`, `get` and `clear` touch. */
	origin?: string;
	/** Codecs by key. */
	schema?: S;
};

/** The type of any declared key's value: the union of the schema's codecs' types (`never` without codecs). */
type AnyDecoded<S extends SessionStorageSchema> = { [P in keyof S]: S[P] extends Codec<infer T> ? T : never }[keyof S];

/** The type of one literal key's value: its codec's type when it is declared, otherwise `string`. */
type DecodedLiteral<S extends SessionStorageSchema, K> = K extends keyof S
	? S[K] extends Codec<infer T>
		? T
		: never
	: string;

/**
 * The type of key `K`'s value under schema `S`, for each member of `K`: a literal key's codec's type when the key is
 * declared, otherwise `string`. A key whose type is not a literal (`string`, a branded string, or a pattern such as
 * `` `user:${string}` ``) may be any declared key it matches, so its value is a string or one of those codecs' types:
 * any declared codec's for `string` and a branded string, the codecs of the declared keys the pattern matches for a
 * pattern. Pass the literal, or type the key as the schema's keys (`keyof typeof schema`), for one codec's type. `get`
 * returns it, with `null`, and `set` and `seed` take it.
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#decoded
 */
export type Decoded<S extends SessionStorageSchema, K extends string> = string extends K
	? string | AnyDecoded<S>
	: K extends unknown
		? K extends object
			? // a branded string (string & {…}) may be any key
				string | AnyDecoded<S>
			: // biome-ignore lint/complexity/noBannedTypes: {} fits Record<K, unknown> only when K is a pattern, not a literal
				{} extends Record<K, unknown>
				? string | DecodedLiteral<S, Extract<keyof S, K>>
				: DecodedLiteral<S, K>
		: never;

/**
 * `K`, but not a place TypeScript infers `K` from, so `set(key, value)` takes the key's type from the key alone; inferred
 * from the value too, `K` could widen to `string` and accept any value. TypeScript's own `NoInfer` needs 5.4.
 */
type KeyOnly<K> = [K][K extends unknown ? 0 : never];

/** A record whose every value is typed by its key's codec. */
export type EntriesFor<S extends SessionStorageSchema, E> = { [K in keyof E]: Decoded<S, K & string> };

/** A key list that cannot be the literal `[]`; computed lists, including empty ones, still pass. */
export type NonEmpty<K extends string> = readonly K[] & ([K] extends [never] ? never : unknown);

/**
 * The options of `seed`: the origin to seed, when it is not the helper's.
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#seedoptions
 */
export type SeedOptions = {
	/** The origin to seed; defaults to the helper's `origin`. */
	origin?: string;
};

/**
 * What `get()` returns: every entry, as plain strings without a schema, otherwise with the declared keys decoded.
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#allentries
 */
export type AllEntries<S extends SessionStorageSchema> = [keyof S] extends [never]
	? Record<string, string>
	: { [K in keyof S]?: Decoded<S, K & string> } & Record<string, string | Decoded<S, keyof S & string>>;

const describeOrigin = (value: string): string | undefined => {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return undefined;
	}
	// a scheme such as chrome-extension: or file: has a host but no origin in the URL standard ("null"), which no page
	// URL would ever be compared equal to
	return url.host !== "" && url.pathname === "/" && url.search === "" && url.hash === "" && url.origin !== "null"
		? url.origin
		: undefined;
};

/**
 * Where the page went, for a navigation message: the origin and path of its URL, without the query and fragment, which
 * may hold a redirect's tokens; a URL without an origin whole, as `guarded` compares it.
 */
const destinationOf = (url: string): string => {
	if (originOf(url) === undefined) {
		return url;
	}
	const { origin, pathname } = new URL(url);
	return `${origin}${pathname}`;
};

/** Throws unless `value` is an origin; returns it normalized. */
const normaliseOrigin = (value: string, title: string): string => {
	const origin = describeOrigin(value);
	if (origin === undefined) {
		let why = "";
		try {
			const url = new URL(value);
			why = url.host !== "" && url.origin === "null" ? ", whose scheme has no URL origin" : "";
		} catch {
			// not a URL at all: the rule says enough
		}
		throw new Error(
			`${title}: origin must be an origin such as "https://app.example" or "http://localhost:9000" ` +
				`(scheme, host, optional port, no path, query or hash); received ${JSON.stringify(value)}${why}`,
		);
	}
	return origin;
};

const hasCodec = (schema: SessionStorageSchema, key: string): boolean => Object.hasOwn(schema, key);

/** Encodes every entry for storage: declared keys through their codec, undeclared keys as the strings they must be. */
export const encodeEntries = (
	schema: SessionStorageSchema,
	entries: Record<string, unknown>,
	title: string,
): Record<string, string> => {
	// no prototype: assigning "__proto__" on a plain object would set its prototype instead of storing the key
	const encoded: Record<string, string> = Object.create(null);
	for (const [key, value] of Object.entries(entries)) {
		const codec = hasCodec(schema, key) ? schema[key] : undefined;
		if (codec === undefined) {
			if (typeof value !== "string") {
				throw new TypeError(
					`${title}: value for ${JSON.stringify(key)} is not a string and no codec is declared for it; declare one in ` +
						"the schema (a page object's sessionStorage.schema option)",
				);
			}
			encoded[key] = value;
			continue;
		}
		let raw: unknown;
		try {
			raw = codec.stringify(value);
		} catch (error) {
			throw new TypeError(`${title}: value for ${JSON.stringify(key)} could not be encoded`, { cause: error });
		}
		if (typeof raw !== "string") {
			throw new TypeError(`${title}: the codec for ${JSON.stringify(key)} returned ${typeof raw} instead of a string`);
		}
		encoded[key] = raw;
	}
	return encoded;
};

/** Decodes one stored value: `null` stays `null`, a declared key goes through its codec, anything else is the string as stored. */
export const decodeValue = (schema: SessionStorageSchema, key: string, raw: string | null, title: string): unknown => {
	if (raw === null) {
		return null;
	}
	const codec = hasCodec(schema, key) ? schema[key] : undefined;
	if (codec === undefined) {
		return raw;
	}
	try {
		return codec.parse(raw);
	} catch (error) {
		// the reason first, then the whole value last and quoted, so an empty or whitespace value is visible
		const reason =
			error instanceof Error ? (error.message ? `${error.name}: ${error.message}` : error.name) : String(error);
		const length = `${raw.length} character${raw.length === 1 ? "" : "s"}`;
		throw new TypeError(
			`${title}: value for ${JSON.stringify(key)} could not be decoded (${reason}); stored value, ${length}: ${JSON.stringify(raw)}`,
			{ cause: error },
		);
	}
};

const readTestOutcome: ReadTestOutcome = () => {
	try {
		const info = test.info();
		return { status: info.status ?? "unknown", errors: info.errors };
	} catch {
		return undefined;
	}
};

/**
 * Playwright's `page.sessionStorage` with batches, report steps, an origin check, per-key codecs and `seed`. Values are
 * strings unless the schema declares a codec for the key. Every page object has one, `sessionStorage`.
 *
 * @example
 * ```ts
 * const storage = new SessionStorage(page, { label: "Shop", origin: "https://shop.example" });
 * await storage.seed({ token: "abc" });
 * await page.goto("https://shop.example/");
 * const token = await storage.get("token"); // "abc"
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/
 */
export class SessionStorage<S extends SessionStorageSchema = Record<never, never>> {
	private readonly label: string | undefined;
	private readonly origin: string | undefined;
	private readonly schema: SessionStorageSchema;

	/**
	 * Creates a helper for a page. A page object creates its own, with its label, the origin of its string `baseUrl`
	 * and its schema.
	 *
	 * @param page The page whose session storage the helper reads and writes.
	 * @param options Optional settings.
	 * @param options.label The prefix of step titles and error messages: `Shop` gives `Shop.SessionStorage.set:`.
	 * @param options.origin The origin the helper belongs to: the default origin of `seed`, and the only one `set`,
	 * `get` and `clear` touch. Without it the helper works on whatever origin the page is on.
	 * @param options.schema Codecs by key, for keys that hold structured values. Required when the helper's schema type
	 * is given explicitly (`new SessionStorage<typeof schema>(page, { schema })`), with a codec for every declared key;
	 * without a type argument, the type is taken from it.
	 * @throws When `origin` is not an origin: `Shop.SessionStorage.constructor: origin must be an origin such as …`
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#new-sessionstorage
	 */
	constructor(
		private readonly page: Page,
		// with declared keys, the schema value is required and holds a codec for every one of them
		...[options = {}]: [keyof S] extends [never]
			? [options?: SessionStorageOptions<S>]
			: [options: SessionStorageOptions<S> & { schema: Required<S> }]
	) {
		this.label = options.label;
		this.schema = options.schema ?? {};
		this.origin = options.origin === undefined ? undefined : normaliseOrigin(options.origin, this.title("constructor"));
	}

	private title(method: string): string {
		return `${this.label === undefined ? "" : `${this.label}.`}SessionStorage.${method}`;
	}

	/**
	 * Runs `body` as a step, boxed and placed at `location`, the line that called the method (`callerLocation` says why it
	 * is passed). A boxed error's stack is still Playwright's: the async stack after its first frame, so this helper is
	 * not `async` (it would be that frame) and every method awaits it rather than returning it (which cuts the stack).
	 */
	private step<T>(method: string, location: StepLocation | undefined, body: () => Promise<T>): Promise<T> {
		return test.step(`${this.title(method)}:`, body, { box: true, location });
	}

	/**
	 * One call into `page.sessionStorage`, its failure labeled; a page without an origin and a document with an opaque
	 * origin are explained.
	 */
	private async access<T>(method: string, call: () => Promise<T>): Promise<T> {
		try {
			return await call();
		} catch (error) {
			const url = this.page.url();
			// the browsers word the refusal differently, so the document tells it apart: document.domain is "" exactly when
			// its origin is opaque, as on a new page's about:blank, and no global of the page replaces it, as a page's own
			// `var origin` replaces self.origin; a closed page cannot answer, and its error is Playwright's
			const domain = await this.page.evaluate(() => document.domain).catch(() => undefined);
			if (originOf(url) === undefined && domain === "") {
				const instead = method === "seed" ? "" : " or use seed()";
				throw new Error(
					`${this.title(method)}: the page has no origin yet (${url}); navigate to the origin first${instead}`,
					{
						cause: error,
					},
				);
			}
			// an error page and a sandboxed document both have an opaque origin at the origin's URL, and nothing guaranteed
			// tells them apart
			if (originOf(url) !== undefined && domain === "") {
				throw new Error(
					`${this.title(method)}: the document at ${url} cannot use sessionStorage: its origin is opaque (the ` +
						"browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: " +
						"sandbox without allow-same-origin)",
					{ cause: error },
				);
			}
			throw new Error(`${this.title(method)}: ${error instanceof Error ? error.message : String(error)}`, {
				cause: error,
			});
		}
	}

	/**
	 * One storage call, checked against a navigation: the page's URL is read before and after it (a field Playwright's
	 * client keeps current, so no round trip), and when its origin moved, or the call failed because the document went
	 * away, the call fails with `navigated(from, to)`, whether or not it threw; `to` is where the page is when the
	 * message is made (`destinationOf`). A call in flight when the page leaves may have acted on the new document: it is
	 * detected, not prevented. A URL without an origin (an `about:blank` popup) is compared whole.
	 */
	private async guarded<T>(
		method: string,
		call: () => Promise<T>,
		navigated: (from: string, to: string, cause: unknown) => Error,
	): Promise<T> {
		const before = this.page.url();
		const from = originOf(before);
		const moved = () => {
			const after = this.page.url();
			return from === undefined ? after !== before : originOf(after) !== from;
		};
		let result: T;
		try {
			result = await this.access(method, call);
		} catch (error) {
			const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
			const destroyed = cause instanceof Error && /Execution context was destroyed/.test(cause.message);
			if (destroyed || moved()) {
				throw navigated(from ?? before, destinationOf(this.page.url()), cause);
			}
			throw error;
		}
		if (moved()) {
			throw navigated(from ?? before, destinationOf(this.page.url()), undefined);
		}
		return result;
	}

	/** The failure of a single call the page left: what it was doing, and what it may have done to the new document. */
	private navigatedDuring(method: string, doing: string, consequence: string) {
		return (from: string, to: string, cause: unknown) =>
			new Error(
				`${this.title(method)}: the page navigated to ${to} while ${method}() was ${doing} ${from}; ${consequence}`,
				cause === undefined ? undefined : { cause },
			);
	}

	/**
	 * One storage call per key, in order: Playwright has no batch call, so a navigation can stop the batch partway. The
	 * failure then says so, names the keys already done, which stay, and the key in flight, which may have reached the
	 * new document.
	 */
	private async eachKey(
		method: string,
		keys: readonly string[],
		[doing, done]: readonly [doing: string, done: string],
		call: (key: string) => Promise<void>,
	): Promise<void> {
		for (const [index, key] of keys.entries()) {
			await this.guarded(
				method,
				() => call(key),
				(from, to, cause) => {
					const finished = keys.slice(0, index);
					return new Error(
						`${this.title(method)}: the page navigated to ${to} while ${method}() was ${doing} ${from}; ` +
							`${finished.length} of ${keys.length} ${keys.length === 1 ? "key was" : "keys were"} ${done}` +
							(finished.length > 0 ? ` (${describeKeys(finished)})` : "") +
							`; ${JSON.stringify(key)} was being ${done} and may have reached the new document`,
						cause === undefined ? undefined : { cause },
					);
				},
			);
		}
	}

	/**
	 * A helper with an origin touches only that origin's storage. Synchronous, from the page's URL, so a call joins its
	 * turn at once; `assertInheritedOrigin` adds the case of a URL without an origin, inside the turn.
	 */
	private assertOnOrigin(method: string, current = originOf(this.page.url())): void {
		if (this.origin === undefined || current === undefined || current === this.origin) {
			return;
		}
		const url = this.page.url();
		throw new Error(
			`${this.title(method)}: the page ${originOf(url) === undefined ? `(${url}) ` : ""}is on ${current}, not on this ` +
				`page object's origin ${this.origin}; another origin's sessionStorage is reachable only from a document on ` +
				`it. Use the page object for ${current}, or a standalone SessionStorage without an origin`,
		);
	}

	/**
	 * The page's URL has no origin (`about:blank`), but its document may have inherited one, as a popup from
	 * `window.open()` does: then the document is asked, and the origin check applies to that.
	 */
	private async assertInheritedOrigin(method: string): Promise<void> {
		if (this.origin === undefined || originOf(this.page.url()) !== undefined) {
			return;
		}
		const inherited = await this.page.evaluate(() => self.origin).catch(() => "null");
		this.assertOnOrigin(method, inherited === "null" ? undefined : inherited);
	}

	/**
	 * Runs `task` in its turn among the page's session storage calls for the origin this call touches: the helper's, or
	 * the one the page is on; on a page whose URL has no origin, a page-wide turn, since the origin its document may have
	 * inherited cannot be read synchronously. The origin is checked again when the turn starts, since the page may have
	 * left while the call waited.
	 */
	private inTurn<T>(method: string, task: () => Promise<T>): Promise<T> {
		const onPage = originOf(this.page.url());
		return takeTurn(this.page, onPage === undefined ? PAGE_WIDE : (this.origin ?? onPage), async () => {
			this.assertOnOrigin(method);
			await this.assertInheritedOrigin(method);
			return await task();
		});
	}

	private async write(method: string, encoded: Record<string, string>): Promise<void> {
		await this.eachKey(method, Object.keys(encoded), ["writing to", "written"], (key) =>
			this.page.sessionStorage.setItem(key, encoded[key] as string),
		);
	}

	/**
	 * Writes one entry, or several, to the session storage of the origin the page is on: each value through its key's
	 * codec, or as the string it must be. Every value is encoded before any is written, so a bad value writes nothing.
	 * Calls for one origin act in the order they were made, also when they overlap, across every helper on the page.
	 *
	 * @param key The key.
	 * @param value The value: a string, or the type of the key's codec.
	 * @param entries Several keys and values, written in one call.
	 * @throws When a value for a key without a codec is not a string
	 * (`Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)`), when a key's codec
	 * throws (`… value for "user" could not be encoded`) or returns something other than a string
	 * (`… the codec for "user" returned undefined instead of a string`), when the page is on another origin than the
	 * helper's, when the page has no origin yet
	 * (`Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()`),
	 * when the document's origin is opaque, as the browser's error page after a failed navigation and a sandboxed
	 * document have
	 * (`Shop.SessionStorage.set: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (…)`),
	 * and when the page leaves the origin during the batch, which is written one key at a time and stops there; the key in
	 * flight may have reached the new document
	 * (`Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document`).
	 *
	 * @example
	 * ```ts
	 * await storage.set("token", "abc");
	 * await storage.set({ token: "abc", locale: "nb" });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#set
	 */
	set<K extends string>(key: K, value: Decoded<S, KeyOnly<K>>): Promise<void>;
	set<E extends Record<string, unknown>>(entries: EntriesFor<S, E>): Promise<void>;
	async set(keyOrEntries: string | Record<string, unknown>, value?: unknown): Promise<void> {
		const location = callerLocation(SessionStorage.prototype.set);
		const entries = typeof keyOrEntries === "string" ? { [keyOrEntries]: value } : keyOrEntries;
		await this.step("set", location, async () => {
			this.assertOnOrigin("set");
			const encoded = encodeEntries(this.schema, entries, this.title("set"));
			await this.inTurn("set", () => this.write("set", encoded));
		});
	}

	/**
	 * Reads the session storage of the origin the page is on: every entry, one key, or several, each value through its
	 * key's codec. A missing key reads as `null`. A literal `[]` does not compile; a list that is empty at run time
	 * reads nothing. In a `Promise.all`, it reads what an earlier `set` for the origin wrote.
	 *
	 * @param key One key: returns its value, or `null`.
	 * @param keys Several keys: returns a record with every key, `null` for each that is missing.
	 * @returns Without an argument, every entry; otherwise the value or the record.
	 * @throws When a stored value cannot be decoded by its codec
	 * (`Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)); stored value, 9 characters: "{not json"`), when the page is on another origin
	 * than the helper's, when the page has no origin yet, when the document's origin is opaque, as for `set`
	 * (`Shop.SessionStorage.get: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (…)`),
	 * and when the page leaves the origin during the read, rather than return what it may have read from the new document
	 * (`Shop.SessionStorage.get: the page navigated to https://login.example/ while get() was reading "token" from https://shop.example; it may have read the new document`).
	 *
	 * @example
	 * ```ts
	 * const token = await storage.get("token"); // "abc", or null
	 * const entries = await storage.get(["token", "locale"]); // { token: "abc", locale: null }
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#get
	 */
	get(): Promise<AllEntries<S>>;
	get<K extends string>(key: K): Promise<Decoded<S, K> | null>;
	get<K extends string>(keys: NonEmpty<K>): Promise<{ [P in K]: Decoded<S, P> | null }>;
	async get(keyOrKeys?: string | readonly string[]): Promise<unknown> {
		const location = callerLocation(SessionStorage.prototype.get);
		// awaited, not returned: see step()
		return await this.step("get", location, async () => {
			this.assertOnOrigin("get");
			return await this.inTurn("get", () => this.read(keyOrKeys));
		});
	}

	/** What `get` reads, in its turn: one key, several, or every entry, each through its key's codec. */
	private async read(keyOrKeys: string | readonly string[] | undefined): Promise<unknown> {
		const title = this.title("get");
		// a read the page left may have come from the new document: it fails instead of returning that
		const readKey = (key: string) =>
			this.guarded(
				"get",
				() => this.page.sessionStorage.getItem(key),
				this.navigatedDuring("get", `reading ${JSON.stringify(key)} from`, "it may have read the new document"),
			);
		if (typeof keyOrKeys === "string") {
			return decodeValue(this.schema, keyOrKeys, await readKey(keyOrKeys), title);
		}
		if (keyOrKeys !== undefined) {
			// in parallel; the first that fails rejects the whole read
			const pairs = await Promise.all(
				keyOrKeys.map(async (key) => [key, decodeValue(this.schema, key, await readKey(key), title)] as const),
			);
			return Object.fromEntries(pairs);
		}
		const items = await this.guarded(
			"get",
			() => this.page.sessionStorage.items(),
			this.navigatedDuring("get", "reading every entry from", "it may have read the new document"),
		);
		return Object.fromEntries(items.map((item) => [item.name, decodeValue(this.schema, item.name, item.value, title)]));
	}

	/**
	 * Removes entries from the session storage of the origin the page is on: every entry, one key, or several. Calls for
	 * one origin act in the order they were made, also when they overlap.
	 *
	 * @param key One key.
	 * @param keys Several keys. A literal `[]` does not compile; a list that is empty at run time removes nothing.
	 * @throws When the page is on another origin than the helper's, when the page has no origin yet, when the document's
	 * origin is opaque, as for `set`
	 * (`Shop.SessionStorage.clear: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (…)`),
	 * and when the page leaves the origin during the call; the keys named as removed are gone, and the one in flight may
	 * have reached the new document
	 * (`Shop.SessionStorage.clear: the page navigated to https://shop.example/home while clear() was removing keys from https://shop.example; 1 of 3 keys were removed ("token"); "locale" was being removed and may have reached the new document`).
	 *
	 * @example
	 * ```ts
	 * await storage.clear("token");
	 * await storage.clear(); // everything
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#clear
	 */
	clear(): Promise<void>;
	clear(key: string): Promise<void>;
	clear<K extends string>(keys: NonEmpty<K>): Promise<void>;
	async clear(keyOrKeys?: string | readonly string[]): Promise<void> {
		const location = callerLocation(SessionStorage.prototype.clear);
		await this.step("clear", location, async () => {
			this.assertOnOrigin("clear");
			await this.inTurn("clear", async () => {
				if (keyOrKeys === undefined) {
					await this.guarded(
						"clear",
						() => this.page.sessionStorage.clear(),
						this.navigatedDuring("clear", "removing every entry from", "it may have reached the new document"),
					);
					return;
				}
				await this.eachKey(
					"clear",
					typeof keyOrKeys === "string" ? [keyOrKeys] : keyOrKeys,
					["removing keys from", "removed"],
					(key) => this.page.sessionStorage.removeItem(key),
				);
			});
		});
	}

	/**
	 * Stores entries for an origin before the app's next load there, so the app's first script sees them, without
	 * leaving the page the test is on; on the origin already, it writes at once, also on an `about:blank` popup whose
	 * document inherited it. A seed that is still waiting when the
	 * page closes fails the test. Calls for one origin merge in the order they were made, later values winning per key,
	 * also when they overlap, on the origin or before the hop. Await it before the action that starts the hop. Entries
	 * that are empty at run time (`seed({})`) do nothing.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#seed
	 *
	 * @param key The key.
	 * @param value The value: a string, or the type of the key's codec.
	 * @param entries Several keys and values.
	 * @param options `{ origin }`: the origin to seed. Defaults to the helper's origin, which a page object's helper has.
	 * @throws At the call, when there is no origin (`Shop.SessionStorage.seed: an origin is required; pass { origin } or
	 * construct the helper with one`), when a value cannot be encoded, as for `set`
	 * (`… value for "orderId" is not a string and no codec is declared for it; …`, `… could not be encoded`,
	 * `… the codec for "orderId" returned undefined instead of a string`), when the browser has no Navigation API, when the page commits a document on the
	 * origin while the seed is being registered, when the page closes before it is registered (`… the page closed
	 * while seed() was registering the seed for https://pay.example (keys: "orderId"); await seed() before the test ends`),
	 * and, on the origin already, when the document's origin is opaque or the page leaves it during the write, as for
	 * `set` (`… the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (…)`, `… the
	 * page navigated to https://shop.example/home while seed() was writing to https://shop.example; …`);
	 * later, failing the test with the line of this call in the stack, when the browser refuses the write (the storage
	 * quota), when the document that arrives on the origin does not take the seed (after a navigation there that failed:
	 * `… was not applied: the document that arrived on https://pay.example has an opaque origin …`), or when the page
	 * closes before the seed was applied.
	 *
	 * @example
	 * ```ts
	 * await loginPage.sessionStorage.seed({ token: "eyJ…" });
	 * await loginPage.navigation.goto(); // the app's first script already sees the token
	 * ```
	 */
	seed<K extends string>(key: K, value: Decoded<S, KeyOnly<K>>, options?: SeedOptions): Promise<void>;
	seed<E extends Record<string, unknown>>(entries: EntriesFor<S, E>, options?: SeedOptions): Promise<void>;
	async seed(
		keyOrEntries: string | Record<string, unknown>,
		valueOrOptions?: unknown,
		maybeOptions?: SeedOptions,
	): Promise<void> {
		const site = captureCallSite(SessionStorage.prototype.seed);
		const [entries, options] =
			typeof keyOrEntries === "string"
				? [{ [keyOrEntries]: valueOrOptions }, maybeOptions]
				: [keyOrEntries, valueOrOptions as SeedOptions | undefined];
		// the page as the call finds it, before the step: Playwright may await work of its own before the body runs
		const registry = registryFor(this.page, readTestOutcome);
		const atCall = registry.snapshot();
		try {
			await this.step("seed", siteLocation(site), async () => {
				const title = this.title("seed");
				const requested = options?.origin;
				const origin = requested === undefined ? this.origin : normaliseOrigin(requested, title);
				if (origin === undefined) {
					throw new Error(`${title}: an origin is required; pass { origin } or construct the helper with one`);
				}
				const encoded = encodeEntries(this.schema, entries, title);
				if (Object.keys(encoded).length === 0) {
					// nothing to store, as get([]) and clear([]) read and remove nothing; a seed without keys would only wait
					return;
				}
				// on the origin, the registry writes at once in the call's turn; on a page whose URL has none, it writes when
				// the document inherited the origin, as set() does there; elsewhere it registers the seed
				const writeOnOrigin = async () => {
					if (atCall.origin === undefined) {
						const inherited = await this.page.evaluate(() => self.origin).catch(() => "null");
						if (inherited !== origin) {
							return false;
						}
					}
					await this.write("seed", encoded);
					return true;
				};
				await registry.add(origin, encoded, title, site, writeOnOrigin, atCall);
			});
		} finally {
			atCall.stop();
		}
	}
}
