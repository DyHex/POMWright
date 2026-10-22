/**
 * Deferred seeding of `sessionStorage` for an origin the page is not on.
 *
 * `SessionStorage.seed()` hands the entries to one registry per page. The registry adds a Playwright init script for
 * each pending origin. The script runs in every new document of the page and stores the entries only in the main frame,
 * on the origin, on the first arrival there, before the document's first script. When the main frame commits on the
 * origin, the registry disposes of the script. Calls for one origin run one after the other, in the order they were
 * made, so overlapping calls merge as awaited ones do. Navigations are never intercepted. Nothing is registered on a
 * page that never seeds, and everything is removed once the last seed has been applied and its document has had the
 * chance to report a write the browser refused.
 */
import type { ConsoleMessage, Frame } from "@playwright/test";
import { atCallSite } from "./callSite";

/** Removes what `addInitScript` added. Playwright's `Disposable` satisfies it. */
export type SeedDisposable = { dispose(): Promise<void> };

/** Whether the current document has the Navigation API, and the browser's user agent for the error that says not. */
export type NavigationSupport = { supported: boolean; userAgent: string };

/** The subset of `Page` the registry uses. A real `Page` satisfies it; unit tests pass a fake. */
export interface SeedPage {
	addInitScript(script: (arg: SeedScriptArg) => void, arg: SeedScriptArg): Promise<SeedDisposable>;
	evaluate(pageFunction: () => NavigationSupport): Promise<NavigationSupport>;
	on(event: "framenavigated", listener: (frame: Frame) => void): unknown;
	on(event: "domcontentloaded", listener: () => void): unknown;
	on(event: "console", listener: (message: ConsoleMessage) => void): unknown;
	on(event: "close", listener: () => void): unknown;
	off(event: "framenavigated", listener: (frame: Frame) => void): unknown;
	off(event: "domcontentloaded", listener: () => void): unknown;
	off(event: "console", listener: (message: ConsoleMessage) => void): unknown;
	off(event: "close", listener: () => void): unknown;
	mainFrame(): Frame;
}

/** What the registry needs to know about the running test when the page closes. */
export type TestOutcome = { status: string; errors: readonly unknown[] };

/** Reads the running test's outcome; `undefined` outside a test. `SessionStorage` injects `test.info()`. */
export type ReadTestOutcome = () => TestOutcome | undefined;

/** A seed waiting for the main frame's first arrival at its origin. */
export type PendingSeed = {
	/** Encoded entries, merged across `seed` calls with later values winning per key. */
	entries: Record<string, string>;
	/** Step title of the first `seed` call for the origin, for error messages. */
	title: string;
	/** Stack frames of that `seed` call, so errors raised from listeners point at the test. */
	site: Error;
	/** Removes the init script that writes `entries`. */
	disposable: SeedDisposable;
};

/** A seed whose document has committed and may still report a write the browser refused. */
type AppliedSeed = { keys: string[]; title: string; site: Error };

/** The origin of a URL, or `undefined` for URLs without one such as `about:blank`. */
export const originOf = (url: string): string | undefined => {
	let origin: string;
	try {
		origin = new URL(url).origin;
	} catch {
		return undefined;
	}
	return origin === "null" ? undefined : origin;
};

/** The start of the console message the init script logs when the browser refuses a write. */
export const FAILURE_PREFIX = "pomwright-seed-failure:";

export type SeedScriptArg = {
	/** The origin whose documents receive the entries. */
	origin: string;
	/**
	 * The encoded entries as `[key, value]` pairs. A key is never a property name on the way to the page, where
	 * Playwright's serialisation of an argument drops an own `__proto__` key.
	 */
	entries: [key: string, value: string][];
	/** `FAILURE_PREFIX`, passed in because the script is serialised and refers to nothing outside its body. */
	prefix: string;
};

/**
 * The init script. It runs in every new document of the page while a seed for `origin` waits and writes only in the
 * main frame, on the origin, on the first arrival there: after a reload or a hop within the origin,
 * `navigation.activation.from` is the previous document's entry, so a value the app wrote meanwhile is kept. A write
 * the browser refuses is logged for the registry's `console` listener.
 */
export const seedScript = ({ origin, entries, prefix }: SeedScriptArg): void => {
	if (window !== window.top || location.origin !== origin) {
		return;
	}
	if (globalThis.navigation?.activation?.from) {
		return;
	}
	try {
		for (const [key, value] of entries) {
			sessionStorage.setItem(key, value);
		}
	} catch (error) {
		console.error(`${prefix}${JSON.stringify({ origin, error: String(error) })}`);
	}
};

const describeKeys = (keys: readonly string[]): string => keys.join(", ");

export const noNavigationApiError = (title: string, origin: string, userAgent: string, site: Error): Error =>
	atCallSite(
		new Error(
			`${title}: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at ` +
				`${origin}, and this browser has none (${userAgent}); use set() on the origin and reload instead`,
		),
		site,
	);

export const inFlightError = (title: string, origin: string, site: Error): Error =>
	atCallSite(
		new Error(
			`${title}: the page committed a document on ${origin} while seed() was registering, so the app may have ` +
				"started without the entries; await that navigation before seeding, or seed before starting it",
		),
		site,
	);

export const writeFailedError = (applied: AppliedSeed, origin: string, cause: string): Error =>
	atCallSite(
		new Error(
			`${applied.title}: could not write sessionStorage for ${origin} (keys: ${describeKeys(applied.keys)}): ` +
				`${cause}; the app loaded without the entries`,
		),
		applied.site,
	);

export const neverAppliedError = (pendings: readonly (readonly [string, PendingSeed])[]): Error => {
	const [first] = pendings;
	if (first === undefined) {
		throw new Error("neverAppliedError needs at least one pending seed");
	}
	const details = pendings
		.map(([origin, pending]) => `the seed for ${origin} (keys: ${describeKeys(Object.keys(pending.entries))})`)
		.join(" and ");
	return atCallSite(
		new Error(
			`${first[1].title}: ${details} was never applied: the page closed without navigating there; ` +
				"remove the seed call, or navigate to the origin before the test ends",
		),
		first[1].site,
	);
};

/** One per page, shared by every `SessionStorage` on it. See the module comment. */
export class SeedRegistry {
	private readonly pending = new Map<string, PendingSeed>();
	/** Applied seeds whose document may still report a refused write: until its DOMContentLoaded or the next commit. */
	private readonly confirming = new Map<string, AppliedSeed>();
	/** Per origin, the settled end of the chain of `add` calls: each call runs once the previous one has settled. */
	private readonly queues = new Map<string, Promise<void>>();
	private navigationApiChecked = false;
	private listening = false;

	constructor(
		private readonly page: SeedPage,
		private readonly readTestOutcome: ReadTestOutcome,
	) {}

	/** Origins with a pending seed, oldest first. */
	get pendingOrigins(): string[] {
		return [...this.pending.keys()];
	}

	/**
	 * Registers the init script for `origin` with the entries merged into any pending ones, then disposes of the
	 * previous script. Calls for one origin run one after the other in the order they were made, so calls that overlap
	 * merge exactly as awaited ones do; a call that fails leaves the pending seed as it was. Throws when the browser
	 * lacks the Navigation API, and when the main frame commits on the origin between the call and the end of the
	 * script's registration: that document may or may not have run it.
	 */
	add(origin: string, entries: Record<string, string>, title: string, site: Error): Promise<void> {
		// watched from the call on, so the wait for earlier calls and the Navigation API check are covered too
		let committed = false;
		const watch = (frame: Frame): void => {
			if (frame === this.page.mainFrame() && originOf(frame.url()) === origin) {
				committed = true;
			}
		};
		this.page.on("framenavigated", watch);
		const call = (this.queues.get(origin) ?? Promise.resolve())
			.then(() => this.register(origin, entries, title, site, () => committed))
			.finally(() => {
				this.page.off("framenavigated", watch);
			});
		// the next call for the origin waits for this one, whether it succeeds or fails
		const settled = call.then(
			() => undefined,
			() => undefined,
		);
		this.queues.set(origin, settled);
		settled.then(() => {
			if (this.queues.get(origin) === settled) {
				this.queues.delete(origin);
			}
		});
		return call;
	}

	/** One call's turn: read the pending seed, register the merged script, store it, dispose of the previous one. */
	private async register(
		origin: string,
		entries: Record<string, string>,
		title: string,
		site: Error,
		committed: () => boolean,
	): Promise<void> {
		await this.assertNavigationApi(origin, title, site);
		if (committed()) {
			throw inFlightError(title, origin, site);
		}
		const previous = this.pending.get(origin);
		const merged = { ...previous?.entries, ...entries };
		const disposable = await this.page.addInitScript(seedScript, {
			origin,
			entries: Object.entries(merged),
			prefix: FAILURE_PREFIX,
		});
		if (committed()) {
			await disposable.dispose();
			throw inFlightError(title, origin, site);
		}
		this.pending.set(origin, {
			entries: merged,
			title: previous?.title ?? title,
			site: previous?.site ?? site,
			disposable,
		});
		this.listen();
		await previous?.disposable.dispose();
	}

	/** Once per page: an evaluation in the current document, which works on `about:blank` too. */
	private async assertNavigationApi(origin: string, title: string, site: Error): Promise<void> {
		if (this.navigationApiChecked) {
			return;
		}
		const probe = () =>
			this.page.evaluate(() => ({
				supported: typeof globalThis.navigation?.activation === "object",
				userAgent: navigator.userAgent,
			}));
		let support: NavigationSupport;
		try {
			support = await probe();
		} catch {
			// a navigation replaced the document during the evaluation; the next one runs in its successor
			support = await probe();
		}
		if (!support.supported) {
			throw noNavigationApiError(title, origin, support.userAgent, site);
		}
		this.navigationApiChecked = true;
	}

	private listen(): void {
		if (this.listening) {
			return;
		}
		this.listening = true;
		this.page.on("framenavigated", this.onNavigated);
		this.page.on("domcontentloaded", this.onDomContentLoaded);
		this.page.on("console", this.onConsole);
		this.page.on("close", this.onClose);
	}

	private teardownIfIdle(): void {
		if (!this.listening || this.pending.size > 0 || this.confirming.size > 0) {
			return;
		}
		this.listening = false;
		this.page.off("framenavigated", this.onNavigated);
		this.page.off("domcontentloaded", this.onDomContentLoaded);
		this.page.off("console", this.onConsole);
		this.page.off("close", this.onClose);
	}

	private readonly onNavigated = (frame: Frame): void => {
		if (frame !== this.page.mainFrame()) {
			return;
		}
		// a document that could report a refused write has done so before the next commit
		this.confirming.clear();
		const origin = originOf(frame.url());
		const pending = origin === undefined ? undefined : this.pending.get(origin);
		if (origin !== undefined && pending !== undefined) {
			this.pending.delete(origin);
			this.confirming.set(origin, { keys: Object.keys(pending.entries), title: pending.title, site: pending.site });
			// the committed document has already run the script; disposing keeps it from the next one
			pending.disposable.dispose().catch(() => undefined);
		}
		this.teardownIfIdle();
	};

	private readonly onDomContentLoaded = (): void => {
		// the script runs before the document parses, so its report arrives before this event
		this.confirming.clear();
		this.teardownIfIdle();
	};

	private readonly onConsole = (message: ConsoleMessage): void => {
		const text = message.text();
		if (!text.startsWith(FAILURE_PREFIX)) {
			return;
		}
		let report: { origin?: unknown; error?: unknown };
		try {
			report = JSON.parse(text.slice(FAILURE_PREFIX.length));
		} catch {
			return;
		}
		const origin = typeof report.origin === "string" ? report.origin : undefined;
		const applied = origin === undefined ? undefined : this.confirming.get(origin);
		if (origin === undefined || applied === undefined) {
			return;
		}
		this.confirming.delete(origin);
		this.teardownIfIdle();
		throw writeFailedError(applied, origin, String(report.error)); // thrown from a page listener: fails the test at once
	};

	private readonly onClose = (): void => {
		const outcome = this.readTestOutcome();
		if (outcome === undefined || outcome.status !== "passed" || outcome.errors.length > 0) {
			return;
		}
		if (this.pending.size > 0) {
			throw neverAppliedError([...this.pending.entries()]);
		}
	};
}

const registries = new WeakMap<SeedPage, SeedRegistry>();

/** The page's registry, created on first use. */
export const registryFor = (page: SeedPage, readTestOutcome: ReadTestOutcome): SeedRegistry => {
	let registry = registries.get(page);
	if (registry === undefined) {
		registry = new SeedRegistry(page, readTestOutcome);
		registries.set(page, registry);
	}
	return registry;
};
