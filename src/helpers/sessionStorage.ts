/**
 * `SessionStorage`: Playwright's `page.sessionStorage` with batches, step titles, origin checks, per-key
 * codecs, and seeding before the app loads.
 *
 * Values are strings unless a codec is declared for the key, so without a schema the helper is exactly
 * Playwright's contract: strings in, strings out, `null` for a missing key. A helper constructed with an
 * `origin` (every page object with a string `baseUrl`) refuses to touch another origin's storage, which is
 * unreachable without leaving the current document anyway. `seed` writes at once when the page is on the
 * origin and otherwise defers to the page's seed registry, see ./sessionStorageSeed.ts.
 *
 * See release-3.0.0/PLAN-1.5-SESSION-STORAGE.md.
 */
import { type Page, test } from "@playwright/test";
import {
	captureCallSite,
	existingRegistryFor,
	originOf,
	type ReadTestOutcome,
	registryFor,
} from "./sessionStorageSeed";

/** How a key's value is stored as a string and read back. `json<T>()` ships; anything else is yours. */
export type Codec<T> = {
	parse(raw: string): T;
	stringify(value: T): string;
};

/** The JSON codec. `T` is a phantom type: the parsed value is not validated against it. */
export const json = <T>(): Codec<T> => ({
	parse: (raw) => JSON.parse(raw) as T,
	stringify: (value) => JSON.stringify(value),
});

/** Codecs by key. A key that is not declared is a string. */
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

/** Playwright's error for a storage operation on a document without an origin, such as `about:blank`. */
const isNoOriginError = (error: unknown): error is Error =>
	error instanceof Error && /SecurityError|Access is denied/.test(error.message);

export class SessionStorage<S extends SessionStorageSchema = Record<never, never>> {
	private readonly label: string | undefined;
	private readonly origin: string | undefined;
	private readonly schema: SessionStorageSchema;

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

	/** Runs `body` as a step; a recorded seed failure is thrown first, and a no-origin error is explained. */
	private async step<T>(method: string, body: () => Promise<T>): Promise<T> {
		return test.step(`${this.title(method)}:`, async () => {
			existingRegistryFor(this.page)?.throwIfFailed();
			try {
				return await body();
			} catch (error) {
				if (isNoOriginError(error)) {
					throw new Error(
						`${this.title(method)}: the page has no origin yet (${this.page.url()}); navigate to the origin first or use seed()`,
						{ cause: error },
					);
				}
				throw error;
			}
		});
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

	private async write(encoded: Record<string, string>): Promise<void> {
		for (const [key, value] of Object.entries(encoded)) {
			await this.page.sessionStorage.setItem(key, value);
		}
	}

	/** Writes one entry, or a record of entries, through `page.sessionStorage.setItem`. */
	set<K extends string>(key: K, value: Decoded<S, K>): Promise<void>;
	set<E extends Record<string, unknown>>(entries: EntriesFor<S, E>): Promise<void>;
	async set(keyOrEntries: string | Record<string, unknown>, value?: unknown): Promise<void> {
		const entries = typeof keyOrEntries === "string" ? { [keyOrEntries]: value } : keyOrEntries;
		await this.step("set", async () => {
			this.assertOnOrigin("set");
			await this.write(encodeEntries(this.schema, entries, this.title("set")));
		});
	}

	/** Reads every present entry, one key (`null` when absent), or a list of keys (`null` for each absent one). */
	get(): Promise<AllEntries<S>>;
	get<K extends string>(key: K): Promise<Decoded<S, K> | null>;
	get<K extends string>(keys: NonEmpty<K>): Promise<{ [P in K]: Decoded<S, P> | null }>;
	async get(keyOrKeys?: string | readonly string[]): Promise<unknown> {
		return this.step("get", async () => {
			this.assertOnOrigin("get");
			const title = this.title("get");
			if (typeof keyOrKeys === "string") {
				return decodeValue(this.schema, keyOrKeys, await this.page.sessionStorage.getItem(keyOrKeys), title);
			}
			if (keyOrKeys !== undefined) {
				const pairs = await Promise.all(
					keyOrKeys.map(
						async (key) =>
							[key, decodeValue(this.schema, key, await this.page.sessionStorage.getItem(key), title)] as const,
					),
				);
				return Object.fromEntries(pairs);
			}
			const items = await this.page.sessionStorage.items();
			return Object.fromEntries(
				items.map((item) => [item.name, decodeValue(this.schema, item.name, item.value, title)]),
			);
		});
	}

	/** Removes everything, one key, or a list of keys. */
	clear(): Promise<void>;
	clear(key: string): Promise<void>;
	clear<K extends string>(keys: NonEmpty<K>): Promise<void>;
	async clear(keyOrKeys?: string | readonly string[]): Promise<void> {
		await this.step("clear", async () => {
			this.assertOnOrigin("clear");
			if (keyOrKeys === undefined) {
				await this.page.sessionStorage.clear();
				return;
			}
			for (const key of typeof keyOrKeys === "string" ? [keyOrKeys] : keyOrKeys) {
				await this.page.sessionStorage.removeItem(key);
			}
		});
	}

	/**
	 * Makes sure the origin's `sessionStorage` holds the entries before the app's next load there, without
	 * leaving the current page. On the origin already: writes at once. Elsewhere: the entries become pending
	 * and the next main-frame navigation that reaches the origin applies them before the app's first script.
	 */
	seed<K extends string>(key: K, value: Decoded<S, K>, options?: SeedOptions): Promise<void>;
	seed<E extends Record<string, unknown>>(entries: EntriesFor<S, E>, options?: SeedOptions): Promise<void>;
	async seed(
		keyOrEntries: string | Record<string, unknown>,
		valueOrOptions?: unknown,
		maybeOptions?: SeedOptions,
	): Promise<void> {
		const site = captureCallSite();
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
				await this.write(encoded);
				return;
			}
			await registryFor(this.page, readTestOutcome).add(origin, encoded, title, site);
		});
	}
}
