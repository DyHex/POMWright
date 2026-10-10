import type { Page } from "@playwright/test";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths, storageSchema } from "./teststorage.locatorSchema";

/** The /teststorage page on the first origin, with the "user" key declared as JSON. */
export default class TestStorage extends TestApp<Paths, { storage: typeof storageSchema }> {
	constructor(page: Page, options?: { label?: string }) {
		super(page, "/teststorage", { label: options?.label, sessionStorage: { schema: storageSchema } });
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return null;
	}
}
