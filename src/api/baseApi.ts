import type { APIRequestContext } from "@playwright/test";
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
	}
}
