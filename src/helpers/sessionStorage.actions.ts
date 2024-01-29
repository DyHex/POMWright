import { type Page, test } from "@playwright/test";

/**
 * Defines the SessionStorage class to manage session storage in Playwright.
 * It provides methods to set, get, and clear session storage data, and to handle data before page navigation.
 */
export class SessionStorage {
	// Defines an object to hold states to be set in session storage, allowing any value type.
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private queuedStates: { [key: string]: any } = {};
	// Indicates if the session storage manipulation has been initiated.
	private isInitiated = false;

	// Initializes the class with a Playwright Page object and a name for the Page Object Class.
	constructor(
		private page: Page,
		private pocName: string,
	) {}

	/** Writes states to session storage. Accepts an object with key-value pairs representing the states. */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private async writeToSessionStorage(states: { [key: string]: any }) {
		await this.page.evaluate((storage) => {
			for (const [key, value] of Object.entries(storage)) {
				window.sessionStorage.setItem(key, JSON.stringify(value));
			}
		}, states);
	}

	/** Reads all states from session storage and returns them as an object. */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private async readFromSessionStorage(): Promise<{ [key: string]: any }> {
		return await this.page.evaluate(() => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const storage: { [key: string]: any } = {};
			for (let i = 0; i < sessionStorage.length; i++) {
				const key = sessionStorage.key(i);
				if (key !== null) {
					const item = sessionStorage.getItem(key);
					try {
						storage[key] = item ? JSON.parse(item) : null;
					} catch (e) {
						storage[key] = item;
					}
				}
			}
			return storage;
		});
	}

	/**
	 * Sets the specified states in session storage.
	 * Optionally reloads the page after setting the data to ensure the new session storage state is active.
	 *
	 * Parameters:
	 * states: Object representing the states to set in session storage.
	 * reload: Boolean indicating whether to reload the page after setting the session storage data.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public async set(states: { [key: string]: any }, reload: boolean) {
		await test.step(`${this.pocName}: setSessionStorage`, async () => {
			await this.writeToSessionStorage(states);
			if (reload) {
				await this.page.reload();
			}
		});
	}

	/**
	 * Queues states to be set in the sessionStorage before the next navigation occurs.
	 * Handles different scenarios based on whether the context exists or multiple calls are made.
	 *
	 * 1. No Context, Single Call: Queues and sets states upon the next navigation.
	 * 2. No Context, Multiple Calls: Merges states from multiple calls and sets them upon the next navigation.
	 * 3. With Context: Directly sets states in sessionStorage if the context already exists.
	 *
	 * Parameters:
	 * states: Object representing the states to queue for setting in session storage.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public async setOnNextNavigation(states: { [key: string]: any }) {
		this.queuedStates = { ...this.queuedStates, ...states };

		const populateStorage = async () => {
			await test.step(`${this.pocName}: setSessionStorageBeforeNavigation`, async () => {
				await this.writeToSessionStorage(this.queuedStates);
			});
			this.queuedStates = {}; // Clear queued states
		};

		let contextExists = false;

		try {
			contextExists = await this.page.evaluate(() => {
				return typeof window !== "undefined" && window.sessionStorage !== undefined;
			});
		} catch (e) {
			// Execution context was destroyed; navigate event likely occurred
			contextExists = false;
		}

		if (contextExists) {
			await populateStorage();
			return;
		}

		if (!this.isInitiated) {
			this.isInitiated = true;
			this.page.once("framenavigated", async () => {
				await populateStorage();
			});
		}
	}

	/**
	 * Fetches states from session storage.
	 * If specific keys are provided, fetches only those states; otherwise, fetches all states.
	 *
	 * Parameters:
	 * keys: Optional array of keys to specify which states to fetch from session storage.
	 *
	 * Returns:
	 * Object containing the fetched states.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public async get(keys?: string[]): Promise<{ [key: string]: any }> {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let result: { [key: string]: any } = {};
		await test.step(`${this.pocName}: getSessionStorage`, async () => {
			const allData = await this.readFromSessionStorage();
			if (keys && keys.length > 0) {
				for (const key of keys) {
					if (Object.prototype.hasOwnProperty.call(allData, key)) {
						result[key] = allData[key];
					}
				}
			} else {
				result = allData;
			}
		});
		return result;
	}

	/**
	 * Clears all states in sessionStorage.
	 */
	public async clear() {
		await test.step(`${this.pocName}: clear SessionStorage`, async () => {
			await this.page.evaluate(() => sessionStorage.clear());
		});
	}
}
