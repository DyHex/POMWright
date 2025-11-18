export {
	type BasePageOptions,
	BasePageV2,
	type ExtractBaseUrlType,
	type ExtractFullUrlType,
	type ExtractUrlPathType,
} from "./basePage";
export { test } from "./fixture/base.fixtures";
export { type LogEntry, type LogLevel, PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
export {
	LocatorQueryBuilder,
	LocatorRegistrationBuilder,
	LocatorRegistry,
} from "./locators/registry";
export type {
	AltTextDefinition,
	DataCyDefinition,
	FilterDefinition,
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorRegistrationConfig,
	LocatorStrategyDefinition,
	PathIndexMap,
	PlaceholderDefinition,
	RoleDefinition,
	TestIdDefinition,
	TextDefinition,
	TitleDefinition,
} from "./locators/types";
export type { LocatorChainPaths } from "./locators/utils";
