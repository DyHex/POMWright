import {
	BasePage,
	type BasePageOptions,
	type ExtractBaseUrlType,
	type ExtractFullUrlType,
	type ExtractUrlPathType,
} from "./src/basePage";
export { BasePage, type BasePageOptions, type ExtractBaseUrlType, type ExtractFullUrlType, type ExtractUrlPathType };

import { test } from "./src/fixture/base.fixtures";
export { test };

import { PlaywrightReportLogger } from "./src/helpers/playwrightReportLogger";
export { PlaywrightReportLogger };

import { type AriaRoleType, GetByMethod, type LocatorSchema } from "./src/helpers/locatorSchema.interface";
export { GetByMethod, type LocatorSchema, type AriaRoleType };

import { GetLocatorBase } from "./src/helpers/getLocatorBase";
export { GetLocatorBase };

import { BaseApi } from "./src/api/baseApi";
export { BaseApi };
