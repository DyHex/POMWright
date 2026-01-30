import type { Page } from "@playwright/test";
import BaseWithOptionsV2 from "../../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./iframe.locatorSchema";

export default class IframePage extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page) {
		super(page, "/iframe");
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
