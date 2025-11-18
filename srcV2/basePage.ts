import { type Page, type Selectors, selectors, type TestInfo } from "@playwright/test";
import { SessionStorage } from "../src/helpers/sessionStorage.actions";
import { createCypressIdEngine } from "../src/utils/selectorEngines";
import type { PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
import type { LocatorQueryBuilder } from "./locators/registry";
import { LocatorRegistry } from "./locators/registry";
import type { LocatorChainPaths } from "./locators/utils";

export type BasePageOptions = {
	urlOptions?: {
		baseUrlType?: string | RegExp;
		urlPathType?: string | RegExp;
	};
};

export type ExtractBaseUrlType<T extends BasePageOptions> = T["urlOptions"] extends { baseUrlType: RegExp }
	? RegExp
	: string;
export type ExtractUrlPathType<T extends BasePageOptions> = T["urlOptions"] extends { urlPathType: RegExp }
	? RegExp
	: string;
export type ExtractFullUrlType<T extends BasePageOptions> = T["urlOptions"] extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? RegExp
	: string;

let selectorEngineRegistered = false;

export abstract class BasePageV2<
	LocatorSchemaPathType extends string,
	Options extends BasePageOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> {
	readonly page: Page;
	readonly testInfo: TestInfo;
	readonly selector: Selectors;
	readonly baseUrl: ExtractBaseUrlType<Options>;
	readonly urlPath: ExtractUrlPathType<Options>;
	readonly fullUrl: ExtractFullUrlType<Options>;
	readonly pocName: string;
	readonly sessionStorage: SessionStorage;
	protected readonly log: PlaywrightReportLogger;
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;

	protected constructor(
		page: Page,
		testInfo: TestInfo,
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
		pocName: string,
		playwrightReportLogger: PlaywrightReportLogger,
	) {
		this.page = page;
		this.testInfo = testInfo;
		this.selector = selectors;
		this.baseUrl = baseUrl;
		this.urlPath = urlPath;
		this.fullUrl = this.composeFullUrl(baseUrl, urlPath);
		this.pocName = pocName;
		this.log = playwrightReportLogger.getNewChildLogger(pocName);
		this.locatorRegistry = new LocatorRegistry<LocatorSchemaPathType>(
			page,
			this.log.getNewChildLogger("LocatorRegistry"),
		);
		this.sessionStorage = new SessionStorage(page, pocName);

		this.defineLocators();

		if (!selectorEngineRegistered) {
			selectors.register("data-cy", createCypressIdEngine);
			selectorEngineRegistered = true;
		}
	}

	protected abstract defineLocators(): void;

	public locator<Path extends LocatorSchemaPathType>(path: Path) {
		return this.locatorRegistry.getLocatorChain(path);
	}

	public async getLocator<Path extends LocatorSchemaPathType>(path: Path) {
		return this.locatorRegistry.getLocator(path);
	}

	public nestedLocator<Path extends LocatorSchemaPathType>(
		path: Path,
		overrides?: Record<LocatorChainPaths<LocatorSchemaPathType, Path>, number | "first" | "last" | null | undefined>,
	) {
		return this.locatorRegistry.getNestedLocator(
			path,
			overrides as Record<string, number | "first" | "last" | null | undefined>,
		);
	}

	public query<Path extends LocatorSchemaPathType>(path: Path): LocatorQueryBuilder<LocatorSchemaPathType, Path> {
		return this.locatorRegistry.query(path);
	}

	private composeFullUrl(
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
	): ExtractFullUrlType<Options> {
		const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

		if (typeof baseUrl === "string" && typeof urlPath === "string") {
			return `${baseUrl}${urlPath}` as ExtractFullUrlType<Options>;
		}
		if (typeof baseUrl === "string" && urlPath instanceof RegExp) {
			return new RegExp(`^${escapeRegex(baseUrl)}${urlPath.source}`) as ExtractFullUrlType<Options>;
		}
		if (baseUrl instanceof RegExp && typeof urlPath === "string") {
			return new RegExp(`${baseUrl.source}${escapeRegex(urlPath)}$`) as ExtractFullUrlType<Options>;
		}
		if (baseUrl instanceof RegExp && urlPath instanceof RegExp) {
			return new RegExp(`${baseUrl.source}${urlPath.source}`) as ExtractFullUrlType<Options>;
		}
		throw new Error("Invalid baseUrl or urlPath types. Expected string or RegExp.");
	}
}
