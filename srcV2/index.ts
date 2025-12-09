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
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	LocatorQueryBuilder,
	LocatorRegistrationBuilder,
	LocatorRegistry,
} from "./locators/registry";
export type {
	AltTextDefinition,
	DataCyDefinition,
	FilterDefinition,
	FilterLocatorReference,
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorOverrides,
	LocatorRegistrationConfig,
	LocatorStep,
	LocatorStepOverride,
	LocatorStrategyDefinition,
	LocatorUpdate,
	PathIndexMap,
	PlaceholderDefinition,
	PlaywrightFilterDefinition,
	ResolvedFilterDefinition,
	RoleDefinition,
	TestIdDefinition,
	TextDefinition,
	TitleDefinition,
} from "./locators/types";
export type {
	LocatorSchemaPathError,
	LocatorSchemaPathErrors,
	LocatorSchemaPathFormat,
} from "./locators/utils";
