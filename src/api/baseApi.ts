import type { APIRequestContext } from "@playwright/test";
import { PlaywrightReportLogger } from "../helpers/playwrightReportLogger";

export class BaseApi {
  protected baseUrl: string;
  public apiName: string;
  protected log: PlaywrightReportLogger;
  protected request: APIRequestContext;

  constructor(
    baseUrl: string,
    apiName: string,
    context: APIRequestContext,
    pwrl: PlaywrightReportLogger,
  ) {
    this.baseUrl = baseUrl;
    this.apiName = apiName;
    this.log = pwrl.getNewChildLogger(apiName);
    this.request = context;
  }
}
