import { type Frame, type Page, test } from "@playwright/test";

/**
 * Defines the SessionStorage class to manage session storage in Playwright.
 * It provides methods to set, get, and clear session storage data, and to handle data before page navigation.
 */
type SessionStorageState<T = unknown> = Record<string, T>;

type SetOptions = {
	reload?: boolean;
	waitForContext?: boolean;
};

type WaitForContextOptions = {
	waitForContext?: boolean;
};

type SessionStorageOptions = {
	label?: string;
};

export class SessionStorage {
	// Defines an object to hold states to be set in session storage, allowing any value type.
	private queuedStates: SessionStorageState = {};
	// Indicates if the session storage manipulation has been initiated.
	private isInitiated = false;

	// Initializes the class with a Playwright Page object and an optional label for step titles.
	constructor(
		private page: Page,
		private options: SessionStorageOptions = {},
	) {}

	private getStepLabel(methodName: string) {
		const prefix = this.options.label ? `${this.options.label}.` : "";
		return `${prefix}SessionStorage.${methodName}:`;
	}

	private async hasContext() {
		return await this.page.evaluate(() => {
			return typeof window !== "undefined" && window.sessionStorage !== undefined;
		});
	}

	private async waitForContextAvailability() {
		try {
			const contextExists = await this.hasContext();
			if (contextExists) {
				return;
			}
		} catch (_e) {
			// Execution context was destroyed; wait for a new one.
		}

		await new Promise<void>((resolve) => {
			const handler = async (frame: Frame) => {
				if (frame !== this.page.mainFrame()) {
					return;
				}
				try {
					const contextExists = await this.hasContext();
					if (!contextExists) {
						return;
					}
				} catch (_e) {
					return;
				}
				this.page.off("framenavigated", handler);
				resolve();
			};
			this.page.on("framenavigated", handler);
		});
	}

	private async ensureContext({ waitForContext = false }: WaitForContextOptions = {}) {
		try {
			const contextExists = await this.hasContext();
			if (contextExists) {
				return;
			}
		} catch (_e) {
			// Ignore and fall through.
		}

		if (!waitForContext) {
			throw new Error("SessionStorage context is not available.");
		}

		await this.waitForContextAvailability();
	}

	/** Writes states to session storage. Accepts an object with key-value pairs representing the states. */
	private async writeToSessionStorage<T = unknown>(states: SessionStorageState<T>) {
		await this.page.evaluate((storage) => {
			for (const [key, value] of Object.entries(storage)) {
				window.sessionStorage.setItem(key, JSON.stringify(value));
			}
		}, states);
	}

	/** Reads all states from session storage and returns them as an object. */
	private async readFromSessionStorage<T = unknown>(): Promise<SessionStorageState<T>> {
		const storage = await this.page.evaluate(() => {
			const storage: Record<string, unknown> = {};
			for (let i = 0; i < sessionStorage.length; i++) {
				const key = sessionStorage.key(i);
				if (key !== null) {
					const item = sessionStorage.getItem(key);
					try {
						storage[key] = item ? JSON.parse(item) : null;
					} catch (_e) {
						storage[key] = item;
					}
				}
			}
			return storage;
		});
		return storage as SessionStorageState<T>;
	}

	/**
	 * Sets the specified states in session storage.
	 * Optionally waits for the next main-frame navigation to establish a valid context before writing,
	 * and reloads the page after setting the data.
	 *
	 * Parameters:
	 * states: Object representing the states to set in session storage.
	 * reload: Boolean indicating whether to reload the page after setting the session storage data.
	 * waitForContext: Boolean indicating whether to wait for a main-frame navigation and a valid context.
	 */
	public async set<T = unknown>(states: SessionStorageState<T>, options: SetOptions = {}) {
		await test.step(this.getStepLabel("set"), async () => {
			await this.ensureContext({ waitForContext: options.waitForContext });
			await this.writeToSessionStorage(states);
			if (options.reload) {
				await this.page.reload();
			}
		});
	}

	/**
	 * Queues states to be set in the sessionStorage before the next navigation occurs.
	 * Handles different scenarios based on multiple calls made before the navigation occurs.
	 *
	 * 1. No Context, Single Call: Queues and sets states upon the next navigation.
	 * 2. No Context, Multiple Calls: Merges states from multiple calls and sets them upon the next navigation.
	 * 3. With Context: Still queues until the next navigation.
	 *
	 * Parameters:
	 * states: Object representing the states to queue for setting in session storage.
	 */
	public async setOnNextNavigation<T = unknown>(states: SessionStorageState<T>) {
		this.queuedStates = { ...this.queuedStates, ...states };

		const populateStorage = async () => {
			await test.step(this.getStepLabel("setOnNextNavigation"), async () => {
				await this.writeToSessionStorage(this.queuedStates);
			});
			this.queuedStates = {}; // Clear queued states
		};

		if (!this.isInitiated) {
			this.isInitiated = true;
			const handler = async (frame: Frame) => {
				if (frame !== this.page.mainFrame()) {
					return;
				}
				await populateStorage();
				this.page.off("framenavigated", handler);
				this.isInitiated = false;
			};
			this.page.on("framenavigated", handler);
		}
	}

	/**
	 * Fetches states from session storage.
	 * If specific keys are provided, fetches only those states; otherwise, fetches all states.
	 *
	 * Parameters:
	 * keys: Optional array of keys to specify which states to fetch from session storage.
	 * waitForContext: Boolean indicating whether to wait for a main-frame navigation and a valid context.
	 *
	 * Returns:
	 * Object containing the fetched states.
	 */
	public async get<T = unknown>(keys?: string[]): Promise<SessionStorageState<T>>;
	public async get<T = unknown>(
		keys: string[] | undefined,
		options: WaitForContextOptions,
	): Promise<SessionStorageState<T>>;
	public async get<T = unknown>(keys?: string[], options: WaitForContextOptions = {}): Promise<SessionStorageState<T>> {
		let result: SessionStorageState<T> = {};
		await test.step(this.getStepLabel("get"), async () => {
			await this.ensureContext(options);
			const allData = await this.readFromSessionStorage<T>();
			if (keys && keys.length > 0) {
				for (const key of keys) {
					if (Object.hasOwn(allData, key)) {
						const value = allData[key];
						if (value !== undefined) {
							result[key] = value;
						}
					}
				}
			} else {
				result = allData;
			}
		});
		return result;
	}

	/**
	 * Clears states in sessionStorage. When keys are provided, clears only those entries.
	 * Pass `waitForContext` to wait for the next main-frame navigation and validate that a usable context exists.
	 */
	public async clear(): Promise<void>;
	public async clear(options: WaitForContextOptions): Promise<void>;
	public async clear(key: string | string[]): Promise<void>;
	public async clear(key: string | string[], options: WaitForContextOptions): Promise<void>;
	public async clear(
		keyOrOptions?: string | string[] | WaitForContextOptions,
		options: WaitForContextOptions = {},
	): Promise<void> {
		const { keys, waitForContext } = (() => {
			if (Array.isArray(keyOrOptions)) {
				return { keys: keyOrOptions, waitForContext: options.waitForContext };
			}
			if (typeof keyOrOptions === "string") {
				return { keys: [keyOrOptions], waitForContext: options.waitForContext };
			}
			if (keyOrOptions) {
				return { keys: undefined, waitForContext: keyOrOptions.waitForContext };
			}
			return { keys: undefined, waitForContext: options.waitForContext };
		})();

		await test.step(this.getStepLabel("clear"), async () => {
			await this.ensureContext({ waitForContext });
			if (!keys || keys.length === 0) {
				await this.page.evaluate(() => sessionStorage.clear());
				return;
			}
			await this.page.evaluate((keysToClear) => {
				for (const key of keysToClear) {
					sessionStorage.removeItem(key);
				}
			}, keys);
		});
	}
}
