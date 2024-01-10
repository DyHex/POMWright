import { BasePage } from "./src/basePage";
export { BasePage as POMWright };

import { test } from "./src/fixture/base.fixtures";
export { test as POMWrightTestFixture };

import { PlaywrightReportLogger } from "./src/helpers/playwrightReportLogger";
export { PlaywrightReportLogger as POMWrightLogger };

import { GetByMethod, type LocatorSchema, type AriaRoleType } from "./src/helpers/locatorSchema.interface";
export { GetByMethod, type LocatorSchema, type AriaRoleType };

import { GetLocatorBase } from "./src/helpers/getLocatorBase";
export { GetLocatorBase as POMWrightGetLocatorBase };

import { BaseApi } from "./src/api/baseApi";
export { BaseApi as POMWrightApi };