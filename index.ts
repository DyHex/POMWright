/*
 * V1 Exports
 */

import { type AriaRoleType, GetByMethod, type LocatorSchema } from "./src/helpers/locatorSchema.interface";
export { GetByMethod, type LocatorSchema, type AriaRoleType };

import { BaseApi } from "./src/api/baseApi";
export { BaseApi };

import { BasePage, type BasePageOptions } from "./src/basePage";
export { BasePage, type BasePageOptions, type ExtractBaseUrlType, type ExtractFullUrlType, type ExtractUrlPathType };

import { GetLocatorBase, type LocatorSchemaWithoutPath } from "./src/helpers/getLocatorBase";
export { GetLocatorBase, type LocatorSchemaWithoutPath };

import { BasePageV1toV2 } from "./src/basePageV1toV2";
export { BasePageV1toV2 };

/*
 * V2 Exports
 */

import { createRegistryWithAccessors, type LocatorRegistry } from "./srcV2/locators";
export { createRegistryWithAccessors, type LocatorRegistry };

import {
	type ExtractBaseUrlType,
	type ExtractFullUrlType,
	type ExtractUrlPathType,
	PageObject,
	type UrlTypeOptions,
} from "./srcV2/pageObject";
export { PageObject, type UrlTypeOptions };

import { test } from "./srcV2/fixture/base.fixtures";
export { test };

import { step } from "./srcV2/helpers/stepDecorator";
export { step };

import { SessionStorage } from "./srcV2/helpers/sessionStorage";
export { SessionStorage };

import { type LogEntry, type LogLevel, PlaywrightReportLogger } from "./srcV2/helpers/playwrightReportLogger";
export { type LogEntry, type LogLevel, PlaywrightReportLogger };
