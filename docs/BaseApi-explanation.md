# BaseApi

The `BaseApi` class offers a minimal foundation for writing API helpers in POMWright.  It wraps Playwright's `APIRequestContext` and integrates with the shared [`PlaywrightReportLogger`](./PlaywrightReportLogger-explanation.md).

## Constructor

```ts
constructor(baseUrl: string, apiName: string, context: APIRequestContext, pwrl: PlaywrightReportLogger)
```

* `baseUrl` – root address used to build request URLs.
* `apiName` – human‑readable identifier; also used as a logging prefix.
* `context` – Playwright [`APIRequestContext`](https://playwright.dev/docs/api/class-apirequestcontext).
* `pwrl` – logger instance supplied by the test fixtures.  A child logger is created for the API class.

The class stores these values on the instance and exposes the `request` and `log` properties for use in subclasses.

## Example

```ts
import type { APIRequestContext } from "@playwright/test";
import { BaseApi, type PlaywrightReportLogger } from "pomwright";

class MyApi extends BaseApi {
  constructor(baseUrl: string, context: APIRequestContext, pwrl: PlaywrightReportLogger) {
    super(baseUrl, MyApi.name, context, pwrl);
  }

  v1 = {
    users: {
      id: {
        get: async (id: string, status: number = 200) => {
          const response = await this.request.get(`/api/users/${id}`);
          expect(response.status(), "should have status code: 200").toBe(status);
          const body = await response.json();
          return body;
        },
        //...etc.
      }
    },
    products: {
      //...etc.
    }
  }
}
```

Then in a test you'd do:
```ts
test("some test", { tag: ["@api", "@user"] }, async ({ myApi }) => {
  // Create user

  const existingUser = await myApi.v1.users.id.get(userId); // 200 (default) user found
  
  // Delete user

  const deletedUser = await myApi.v1.users.id.get(userId, 204); // 204 user not found successfully

})
```

`BaseApi` does not dictate how requests are made; you are free to add domain‑specific methods using the provided `request` context and logger.
