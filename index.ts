import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "./srcV2/locators";
export {
	createRegistryWithAccessors,
	type LocatorRegistry,
	type AddAccessor,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
};

import {
	type BaseUrlTypeFromOptions,
	type FullUrlTypeFromOptions,
	PageObject,
	type UrlPathTypeFromOptions,
	type UrlTypeOptions,
} from "./srcV2/pageObject";
export {
	PageObject,
	type BaseUrlTypeFromOptions,
	type FullUrlTypeFromOptions,
	type UrlPathTypeFromOptions,
	type UrlTypeOptions,
};

import { test } from "./srcV2/fixture/base.fixtures";
export { test };

import { step } from "./srcV2/helpers/stepDecorator";
export { step };

import type { NavigationOptions } from "./srcV2/helpers/navigation";
export type { NavigationOptions };

import { SessionStorage } from "./srcV2/helpers/sessionStorage";
export { SessionStorage };

import { type LogEntry, type LogLevel, PlaywrightReportLogger } from "./srcV2/helpers/playwrightReportLogger";
export { type LogEntry, type LogLevel, PlaywrightReportLogger };
