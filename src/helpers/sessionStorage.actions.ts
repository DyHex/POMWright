import { type Page, test } from "@playwright/test";

/**
 * The SessionStorage class provides methods for setting and getting session storage data in Playwright.
 *
 * @class
 * @property {Page} page - The Playwright page object.
 */
export class SessionStorage {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private queuedStates: { [key: string]: any } = {};
	private isInitiated = false;

	constructor(
		private page: Page,
		private pocName: string,
	) {}

	/**
	 * Writes states to the sessionStorage. Private utility function.
	 *
	 * @param states An object representing the states (key/value pairs) to set.
	 */

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private async writeToSessionStorage(states: { [key: string]: any }) {
		await this.page.evaluate((storage) => {
			for (const [key, value] of Object.entries(storage)) {
				window.sessionStorage.setItem(key, JSON.stringify(value));
			}
		}, states);
	}

	/**
	 * Reads all states from the sessionStorage. Private utility function.
	 *
	 * @returns An object containing all states from the sessionStorage.
	 */
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
	 * Sets the specified states in the sessionStorage.
	 *
	 * @param states An object representing the states (key/value pairs) to set in sessionStorage.
	 * @param reload If true, reloads the page after setting the sessionStorage data.
	 *
	 * Usage:
	 * await set({ user: 'John Doe', token: 'abc123' }, true);
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
	 * This handles multiple scenarios:
	 *
	 * 1. No Context, Single Call: Queues and sets states upon the next navigation.
	 * 2. No Context, Multiple Calls: Merges states from multiple calls and sets them upon the next navigation.
	 * 3. With Context: Directly sets states in sessionStorage if the context already exists.
	 *
	 * @param states An object representing the states (key/value pairs) to set.
	 *
	 * Usage:
	 * await setOnNextNavigation({ key: 'value' });
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
	 * Fetches all or selected states from sessionStorage.
	 *
	 * @param keys Optional array of keys to fetch from sessionStorage.
	 * @returns An object containing the fetched states.
	 *
	 * Usage:
	 * 1. To fetch all states: await get();
	 * 2. To fetch selected states: await get(['key1', 'key2']);
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
	 *
	 * Usage:
	 * await clear();
	 */
	public async clear() {
		await test.step(`${this.pocName}: clear SessionStorage`, async () => {
			await this.page.evaluate(() => sessionStorage.clear());
		});
	}
}
