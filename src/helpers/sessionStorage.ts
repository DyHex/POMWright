/**
 * `SessionStorage`: Playwright's `page.sessionStorage` with batches, step titles, origin checks, per-key
 * codecs, and seeding before the app loads.
 *
 * Values are strings unless a codec is declared for the key, so without a schema the helper is exactly
 * Playwright's contract: strings in, strings out, `null` for a missing key. A helper constructed with an
 * `origin` (every page object with a string `baseUrl`) refuses to touch another origin's storage, which is
 * unreachable without leaving the current document anyway. `seed` writes at once when the page is on the
 * origin and otherwise defers to the page's seed registry, whose init script writes on the first arrival there.
 */
import { type Page, test } from "@playwright/test";
import { captureCallSite } from "./callSite";
import { originOf, type ReadTestOutcome, registryFor } from "./sessionStorageSeed";

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
	 * Turns the stored string into the value. An error it throws makes `get` fail, naming the key and the value.
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

export type SessionStorageOptions<S extends SessionStorageSchema> = {
	/** Prefix for step titles and error messages. */
	label?: string;
	/** The origin this helper belongs to: the default target of `seed`, and the only origin `set`, `get` and `clear` touch. */
	origin?: string;
	/** Codecs by key. */
	schema?: S;
};

/** The decoded type of key `K`: the codec's type when declared, otherwise `string`. */
export type Decoded<S extends SessionStorageSchema, K extends string> = K extends keyof S
	? S[K] extends Codec<infer T>
		? T
		: never
	: string;

/** A record whose every value is typed by its key's codec. */
export type EntriesFor<S extends SessionStorageSchema, E> = { [K in keyof E]: Decoded<S, K & string> };

/** A key list that cannot be the literal `[]`; computed lists, including empty ones, still pass. */
export type NonEmpty<K extends string> = readonly K[] & ([K] extends [never] ? never : unknown);

export type SeedOptions = {
	/** The origin to seed; defaults to the helper's `origin`. */
	origin?: string;
};

/** The shape `get()` returns: plain strings without a schema, otherwise declared keys decoded. */
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
	return url.host !== "" && url.pathname === "/" && url.search === "" && url.hash === "" ? url.origin : undefined;
};

/** Throws unless `value` is an origin; returns it normalised. */
const normaliseOrigin = (value: string, title: string): string => {
	const origin = describeOrigin(value);
	if (origin === undefined) {
		throw new Error(
			`${title}: origin must be an origin such as "https://app.example" or "http://localhost:9000" ` +
				`(scheme, host, optional port, no path, query or hash); received ${JSON.stringify(value)}`,
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
	const encoded: Record<string, string> = {};
	for (const [key, value] of Object.entries(entries)) {
		const codec = hasCodec(schema, key) ? schema[key] : undefined;
		if (codec === undefined) {
			if (typeof value !== "string") {
				throw new TypeError(
					`${title}: value for ${JSON.stringify(key)} is not a string and no codec is declared for it`,
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
		throw new TypeError(`${title}: value for ${JSON.stringify(key)} could not be decoded: ${raw}`, { cause: error });
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
 * The browser's refusal to touch storage on a document without an origin, such as `about:blank`: Chromium and
 * WebKit raise a `SecurityError`, Firefox says "The operation is insecure".
 */
const isNoOriginError = (error: unknown): error is Error =>
	error instanceof Error && /SecurityError|Access is denied|The operation is insecure/.test(error.message);

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
	 * @param options.schema Codecs by key, for keys that hold structured values.
	 * @throws When `origin` is not an origin: `Shop.SessionStorage.constructor: origin must be an origin such as …`
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#new-sessionstorage
	 */
	constructor(
		private readonly page: Page,
		options: SessionStorageOptions<S> = {},
	) {
		this.label = options.label;
		this.schema = options.schema ?? {};
		this.origin = options.origin === undefined ? undefined : normaliseOrigin(options.origin, this.title("constructor"));
	}

	private title(method: string): string {
		return `${this.label === undefined ? "" : `${this.label}.`}SessionStorage.${method}`;
	}

	/**
	 * Runs `body` as a step, boxed so the report shows it at the line that called the helper. Playwright takes a boxed
	 * step's location from the async stack after its first frame, so this helper is not `async` (it would be that frame)
	 * and every method awaits it rather than returning it (which cuts the stack).
	 */
	private step<T>(method: string, body: () => Promise<T>): Promise<T> {
		return test.step(`${this.title(method)}:`, body, { box: true });
	}

	/** One call into `page.sessionStorage`; the browser's refusal on a document without an origin is explained. */
	private async access<T>(method: string, call: () => Promise<T>): Promise<T> {
		try {
			return await call();
		} catch (error) {
			if (isNoOriginError(error) || (error instanceof Error && originOf(this.page.url()) === undefined)) {
				throw new Error(
					`${this.title(method)}: the page has no origin yet (${this.page.url()}); navigate to the origin first or use seed()`,
					{ cause: error },
				);
			}
			throw error;
		}
	}

	/** A helper with an origin touches only that origin's storage. */
	private assertOnOrigin(method: string): void {
		if (this.origin === undefined) {
			return;
		}
		const current = originOf(this.page.url());
		if (current !== undefined && current !== this.origin) {
			throw new Error(
				`${this.title(method)}: the page is on ${current}, not on this page object's origin ${this.origin}; ` +
					"another origin's sessionStorage is reachable only from a document on it. " +
					`Use the page object for ${current}, or a standalone SessionStorage without an origin`,
			);
		}
	}

	private async write(method: string, encoded: Record<string, string>): Promise<void> {
		for (const [key, value] of Object.entries(encoded)) {
			await this.access(method, () => this.page.sessionStorage.setItem(key, value));
		}
	}

	/**
	 * Writes one entry, or several, to the session storage of the origin the page is on: each value through its key's
	 * codec, or as the string it must be. Every value is encoded before any is written, so a bad value writes nothing.
	 *
	 * @param key The key.
	 * @param value The value: a string, or the type of the key's codec.
	 * @param entries Several keys and values, written in one call.
	 * @throws When a value for a key without a codec is not a string
	 * (`Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it`), when a key's codec
	 * throws (`… value for "user" could not be encoded`) or returns something other than a string
	 * (`… the codec for "user" returned undefined instead of a string`), when the page is on another origin than the
	 * helper's, and when the page has no origin yet
	 * (`Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()`).
	 *
	 * @example
	 * ```ts
	 * await storage.set("token", "abc");
	 * await storage.set({ token: "abc", locale: "nb" });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#set
	 */
	set<K extends string>(key: K, value: Decoded<S, K>): Promise<void>;
	set<E extends Record<string, unknown>>(entries: EntriesFor<S, E>): Promise<void>;
	async set(keyOrEntries: string | Record<string, unknown>, value?: unknown): Promise<void> {
		const entries = typeof keyOrEntries === "string" ? { [keyOrEntries]: value } : keyOrEntries;
		await this.step("set", async () => {
			this.assertOnOrigin("set");
			await this.write("set", encodeEntries(this.schema, entries, this.title("set")));
		});
	}

	/**
	 * Reads the session storage of the origin the page is on: every entry, one key, or several, each value through its
	 * key's codec. A missing key reads as `null`. A literal `[]` does not compile; a list that is empty at run time
	 * reads nothing.
	 *
	 * @param key One key: returns its value, or `null`.
	 * @param keys Several keys: returns a record with every key, `null` for each that is missing.
	 * @returns Without an argument, every entry; otherwise the value or the record.
	 * @throws When a stored value cannot be decoded by its codec
	 * (`Shop.SessionStorage.get: value for "user" could not be decoded: {not json`), when the page is on another origin
	 * than the helper's, and when the page has no origin yet.
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
		// awaited, not returned: see step()
		return await this.step("get", async () => {
			this.assertOnOrigin("get");
			const title = this.title("get");
			if (typeof keyOrKeys === "string") {
				return decodeValue(
					this.schema,
					keyOrKeys,
					await this.access("get", () => this.page.sessionStorage.getItem(keyOrKeys)),
					title,
				);
			}
			if (keyOrKeys !== undefined) {
				const pairs = await Promise.all(
					keyOrKeys.map(
						async (key) =>
							[
								key,
								decodeValue(
									this.schema,
									key,
									await this.access("get", () => this.page.sessionStorage.getItem(key)),
									title,
								),
							] as const,
					),
				);
				return Object.fromEntries(pairs);
			}
			const items = await this.access("get", () => this.page.sessionStorage.items());
			return Object.fromEntries(
				items.map((item) => [item.name, decodeValue(this.schema, item.name, item.value, title)]),
			);
		});
	}

	/**
	 * Removes entries from the session storage of the origin the page is on: every entry, one key, or several.
	 *
	 * @param key One key.
	 * @param keys Several keys. A literal `[]` does not compile; a list that is empty at run time removes nothing.
	 * @throws When the page is on another origin than the helper's, and when the page has no origin yet.
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
		await this.step("clear", async () => {
			this.assertOnOrigin("clear");
			if (keyOrKeys === undefined) {
				await this.access("clear", () => this.page.sessionStorage.clear());
				return;
			}
			for (const key of typeof keyOrKeys === "string" ? [keyOrKeys] : keyOrKeys) {
				await this.access("clear", () => this.page.sessionStorage.removeItem(key));
			}
		});
	}

	/**
	 * Stores entries for an origin before the app's next load there, so the app's first script sees them, without
	 * leaving the page the test is on; on the origin already, it writes at once. A seed that is still waiting when the
	 * page closes fails the test.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-sessionstorage/#seed
	 *
	 * @param key The key.
	 * @param value The value: a string, or the type of the key's codec.
	 * @param entries Several keys and values.
	 * @param options `{ origin }`: the origin to seed. Defaults to the helper's origin, which a page object's helper has.
	 * @throws At the call, when there is no origin (`Shop.SessionStorage.seed: an origin is required; pass { origin } or
	 * construct the helper with one`), when the browser has no Navigation API, and when the page commits a document on
	 * the origin while the seed is being registered; later, failing the test with the line of this call in the stack,
	 * when the browser refuses the write (the storage quota) or when the page closes before the seed was applied.
	 *
	 * @example
	 * ```ts
	 * await loginPage.sessionStorage.seed({ token: "eyJ…" });
	 * await loginPage.navigation.goto(); // the app's first script already sees the token
	 * ```
	 */
	seed<K extends string>(key: K, value: Decoded<S, K>, options?: SeedOptions): Promise<void>;
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
		await this.step("seed", async () => {
			const title = this.title("seed");
			const requested = options?.origin;
			const origin = requested === undefined ? this.origin : normaliseOrigin(requested, title);
			if (origin === undefined) {
				throw new Error(`${title}: an origin is required; pass { origin } or construct the helper with one`);
			}
			const encoded = encodeEntries(this.schema, entries, title);
			if (originOf(this.page.url()) === origin) {
				await this.write("seed", encoded);
				return;
			}
			await registryFor(this.page, readTestOutcome).add(origin, encoded, title, site);
		});
	}
}
