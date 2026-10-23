/**
 * Deferred seeding of `sessionStorage` for an origin the page is not on.
 *
 * `SessionStorage.seed()` hands the entries to one registry per page. The registry adds a Playwright init script for
 * each pending origin. The script runs in every new document of the page and stores the entries only in the main frame,
 * on the origin, on the first arrival there, before the document's first script. When the main frame commits on the
 * origin, the registry disposes of the script. Calls for one origin take turns with every other session storage call
 * for it on the page, in the order they were made, so overlapping calls merge as awaited ones do. Navigations are never intercepted. Nothing is registered on a
 * page that never seeds, and everything is removed once the last seed has been applied and its document has had the
 * chance to report a write the browser refused.
 */
import type { ConsoleMessage, Frame } from "@playwright/test";
import { atCallSite } from "./callSite";
import { takeTurn } from "./storageTurns";

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
	isClosed(): boolean;
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

/** The page as a `seed` call found it, and the origins its main frame has committed on since. See `snapshot()`. */
export type CallSnapshot = { origin: string | undefined; committed: Set<string>; stop(): void };

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

/** The start of the console message the init script logs when it skips a document on its origin or a write is refused. */
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
 * `navigation.activation.from` is the previous document's entry, so a value the app wrote meanwhile is kept. A document
 * on the origin's URL whose own origin is opaque (the error page a browser shows for a failed navigation, or a
 * sandboxed document) gets nothing either. Each of those two skips, and a write the browser refuses, is logged for the
 * registry's `console` listener, which fails the test when it concerns the document that took the seed out of pending.
 */
export const seedScript = ({ origin, entries, prefix }: SeedScriptArg): void => {
	if (window !== window.top || location.origin !== origin) {
		return;
	}
	if (self.origin !== origin) {
		console.debug(`${prefix}${JSON.stringify({ origin, skipped: "opaque" })}`);
		return;
	}
	if (globalThis.navigation?.activation?.from) {
		console.debug(`${prefix}${JSON.stringify({ origin, skipped: "return" })}`);
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

/** Why the document that took a seed out of pending did not write it, as `seedScript` reports it. */
export type SkipReason = "opaque" | "return";

export const notAppliedError = (applied: AppliedSeed, origin: string, reason: SkipReason): Error =>
	atCallSite(
		new Error(
			`${applied.title}: the seed for ${origin} (keys: ${describeKeys(applied.keys)}) was not applied: ` +
				(reason === "opaque"
					? `the document that arrived on ${origin} has an opaque origin (the browser's error page after a failed ` +
						"navigation, or a sandboxed document)"
					: `the browser counted the page's arrival on ${origin} as a return there (navigation.activation.from ` +
						"is set), as after a failed navigation to it"),
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
	 * previous script. The call takes its turn among the page's session storage calls for the origin (`takeTurn`), so
	 * calls that overlap merge exactly as awaited ones do; a call that fails before its script is registered leaves the
	 * pending seed as it was. An error from the page gets the title and the call site (`fromPage`). Throws
	 * when the browser lacks the Navigation API, and when the main frame commits on the origin between the call and the
	 * end of the script's registration: that document may or may not have run it.
	 *
	 * With `writeOnOrigin`, a call made while the page is on the origin writes there in its turn instead, if the page is
	 * still there; a navigation within the origin while it waits is not an arrival.
	 */
	/**
	 * The page as a `seed` call finds it: the main frame's origin, and every origin the main frame commits on from then
	 * on. `seed()` takes it synchronously at the call, before its step's body, because Playwright may await work of its
	 * own before running the body (the step overlay of `video.show.test` makes a round trip to the browser); a commit
	 * then must still count as one during the call. Stop it when the call settles.
	 */
	snapshot(): CallSnapshot {
		const committed = new Set<string>();
		const watch = (frame: Frame): void => {
			const origin = frame === this.page.mainFrame() ? originOf(frame.url()) : undefined;
			if (origin !== undefined) {
				committed.add(origin);
			}
		};
		this.page.on("framenavigated", watch);
		return {
			origin: originOf(this.page.mainFrame().url()),
			committed,
			stop: () => this.page.off("framenavigated", watch),
		};
	}

	add(
		origin: string,
		entries: Record<string, string>,
		title: string,
		site: Error,
		writeOnOrigin?: () => Promise<void>,
		atCall?: CallSnapshot,
	): Promise<void> {
		// watched from the call on, so the wait for earlier calls and the Navigation API check are covered too
		const snapshot = atCall ?? this.snapshot();
		const wasOnOrigin = writeOnOrigin !== undefined && snapshot.origin === origin;
		return takeTurn(this.page, origin, async () => {
			try {
				if (wasOnOrigin) {
					// a navigation within the origin while the call waited is not an arrival
					snapshot.committed.delete(origin);
					if (originOf(this.page.mainFrame().url()) === origin) {
						await writeOnOrigin?.();
						return;
					}
				}
				await this.register(origin, entries, title, site, () => snapshot.committed.has(origin));
			} catch (error) {
				throw this.fromPage(error, origin, entries, title, site);
			} finally {
				if (atCall === undefined) {
					snapshot.stop();
				}
			}
		});
	}

	/**
	 * An error from a call into the page while a seed registers, with the title and the call site, so it points at the
	 * `seed` line as every other `seed` failure does. Errors already titled, the registry's and the helper's, pass through.
	 */
	private fromPage(
		error: unknown,
		origin: string,
		entries: Record<string, string>,
		title: string,
		site: Error,
	): unknown {
		if (error instanceof Error && error.message.startsWith(`${title}: `)) {
			return error;
		}
		const message = this.page.isClosed()
			? `${title}: the page closed while seed() was registering the seed for ${origin} ` +
				`(keys: ${describeKeys(Object.keys(entries))}); await seed() before the test ends`
			: `${title}: ${error instanceof Error ? error.message : String(error)}`;
		return atCallSite(new Error(message, { cause: error }), site);
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

	/**
	 * Once per page: an evaluation in the current document, which works on `about:blank` too. It tests the interface,
	 * not `navigation.activation`: an app's own global `navigation` (`var navigation = …`) shadows the latter.
	 */
	private async assertNavigationApi(origin: string, title: string, site: Error): Promise<void> {
		if (this.navigationApiChecked) {
			return;
		}
		const probe = () =>
			this.page.evaluate(() => ({
				supported: typeof NavigationActivation === "function" && "from" in NavigationActivation.prototype,
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
		let report: { origin?: unknown; error?: unknown; skipped?: unknown };
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
		// thrown from a page listener: fails the test at once
		if (report.skipped === "opaque" || report.skipped === "return") {
			throw notAppliedError(applied, origin, report.skipped);
		}
		throw writeFailedError(applied, origin, String(report.error));
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
