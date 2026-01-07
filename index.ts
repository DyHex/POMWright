import {
	BasePage,
	type BasePageOptions,
	type ExtractBaseUrlType,
	type ExtractFullUrlType,
	type ExtractUrlPathType,
} from "./src/basePage";
export { BasePage, type BasePageOptions, type ExtractBaseUrlType, type ExtractFullUrlType, type ExtractUrlPathType };

import { BasePageV1toV2 } from "./src/basePageV1toV2";
export { BasePageV1toV2 };

import { test } from "./src/fixture/base.fixtures";
export { test };

import { PlaywrightReportLogger } from "./src/helpers/playwrightReportLogger";
export { PlaywrightReportLogger };

import { type AriaRoleType, GetByMethod, type LocatorSchema } from "./src/helpers/locatorSchema.interface";
export { GetByMethod, type LocatorSchema, type AriaRoleType };

import { GetLocatorBase, type LocatorSchemaWithoutPath } from "./src/helpers/getLocatorBase";
export { GetLocatorBase, type LocatorSchemaWithoutPath };

import { BaseApi } from "./src/api/baseApi";
export { BaseApi };

import { createRegistryWithAccessors, type LocatorRegistry } from "./srcV2/locators";
export { createRegistryWithAccessors, type LocatorRegistry };

import { PageObject } from "./srcV2/pageObject";
export { PageObject };
