import { expect, type Page } from "@playwright/test";
import { step } from "pomwright";
import BaseWithOptionsV2 from "../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./testPage.locatorSchema";

export default class TestPageV2 extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page) {
		super(page, "/");
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
	}

	@step
	async stepNoArgs(): Promise<string> {
		expect(true).toBe(true);
		return "Hello, World!";
	}

	@step("Step with title")
	async stepWithTitle(): Promise<string> {
		return "Hello, World!";
	}

	@step({ box: true })
	async stepWithOptionBox(): Promise<string> {
		return "Hello, World!";
	}

	@step({ timeout: 1000 })
	async stepWithOptionTimeout(): Promise<string> {
		return "Hello, World!";
	}

	@step({
		location: {
			file: "intTestV2/page-object-models/testApp/with-options/pages/testPage.page.ts",
			line: 1,
			column: 1,
		},
	})
	async stepWithOptionLocation(): Promise<string> {
		return "Hello, World!";
	}

	@step("Step with all options", {
		box: true,
		timeout: 1000,
		location: {
			file: "intTestV2/page-object-models/testApp/with-options/pages/testPage.page.ts",
			line: 1,
			column: 1,
		},
	})
	async stepWithTitleAndAllOptions(): Promise<string> {
		return "Hello, World!";
	}

	@step("Step with advanced return type")
	async stepWithAdvancedReturnType(): Promise<
		{
			id: string;
			metadata: {
				flags: Set<"alpha" | "beta">;
				versions: Map<string, { hash: string; tags: string[] }>;
			};
			payload: Array<{ index: number; values: ReadonlyArray<{ key: string; value: number }> }>;
		} & {
			readonly status: "ready";
			readonly startedAt: Date;
		}
	> {
		return {
			id: "fixture-id",
			metadata: {
				flags: new Set(["alpha", "beta"]),
				versions: new Map([
					["v1", { hash: "abc123", tags: ["stable", "verified"] }],
					["v2", { hash: "def456", tags: ["next"] }],
				]),
			},
			payload: [
				{ index: 1, values: [{ key: "alpha", value: 10 }] },
				{ index: 2, values: [{ key: "beta", value: 20 }] },
			],
			status: "ready",
			startedAt: new Date(0),
		};
	}
}
