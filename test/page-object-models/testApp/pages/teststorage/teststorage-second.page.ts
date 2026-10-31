import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { defineLocators, type Paths, storageSchema } from "./teststorage.locatorSchema";

/**
 * The same page served on the second origin, http://127.0.0.1:9000, which the same server also answers; `baseUrl` puts
 * it on another, where a spec runs the test server's app on a port of its own.
 */
export default class TestStorageSecond extends PageObject<Paths, { storage: typeof storageSchema }> {
	constructor(page: Page, options?: { label?: string; baseUrl?: string }) {
		super(page, options?.baseUrl ?? "http://127.0.0.1:9000", "/teststorage", {
			label: options?.label,
			sessionStorage: { schema: storageSchema },
		});
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return null;
	}
}
