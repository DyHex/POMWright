import type { APIRequestContext } from "@playwright/test";
import { warnDeprecationOncePerTest } from "../helpers/deprecationWarnings";
import type { PlaywrightReportLogger } from "../helpers/playwrightReportLogger";

/**
 * @deprecated BaseApi will be removed in v2, see docs/v1-to-v2-migration
 * Please use your own API base class implementation and do not rely on this class.
 */
export class BaseApi {
	protected baseUrl: string;
	public apiName: string;
	protected log: PlaywrightReportLogger;
	protected request: APIRequestContext;

	constructor(baseUrl: string, apiName: string, context: APIRequestContext, pwrl: PlaywrightReportLogger) {
		this.baseUrl = baseUrl;
		this.apiName = apiName;
		this.log = pwrl.getNewChildLogger(apiName);
		this.request = context;

		const classDeprecationMessage =
			"[POMWright] BaseApi is depricated and will be removed in 2.0.0 with no replacement. If you need a base API " +
			"class, you can use the v1 pomwright/src/api/baseApi.ts implementation for reference to implement your own.";
		warnDeprecationOncePerTest(`${this.constructor.name}-class-deprecation`, classDeprecationMessage, this.log);
	}
}
