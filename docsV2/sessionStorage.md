# SessionStorage helper (v2)

`PageObject` exposes a `sessionStorage` helper that wraps common operations on `window.sessionStorage`. Each method
records a Playwright `test.step` for reporting, and the v2 API uses options objects for configuration. When a label is
provided, step titles are prefixed as `Label.SessionStorage.method`.

## set(states, options?)

Immediately writes key/value pairs to session storage. Pass `{ reload: true }` to refresh the page and apply the new
state immediately. If `{ waitForContext: true }` is provided, the write waits for the next main-frame navigation and
validates that a usable sessionStorage context exists before executing. When no context is available and
`waitForContext` is omitted, the call throws.

```ts
await page.sessionStorage.set({ token: "abc", theme: "dark" }, { reload: true });
await page.sessionStorage.set({ onboardingComplete: true });
await page.sessionStorage.set({ token: "abc" }, { waitForContext: true });
```

You can optionally provide a label when instantiating the helper directly:

```ts
const sessionStorage = new SessionStorage(page, { label: "window" });
await sessionStorage.set({ token: "abc" });
```

Tip: You can turn it into a custom fixture rather then have it implemented in all of your POCs.

## setOnNextNavigation(states)

Queues values to be applied during the next main-frame navigation. Multiple calls merge their state. This is
"best-effort", mainly intended for use on pages that evaluate sessionStorage changes continously as opposed to once
initially on navigation/load.

```ts
await login.sessionStorage.setOnNextNavigation({ token: "abc", theme: "dark" });
await login.page.goto(login.fullUrl);
```

## get(keys?, options?)

Retrieves data from session storage immediately. When `keys` are provided, only those values are returned; otherwise
all stored keys are returned. Pass `{ waitForContext: true }` to wait for the next main-frame navigation and validate
that a usable context exists before reading. When no context is available and `waitForContext` is omitted, the call
throws.

```ts
const { theme } = await page.sessionStorage.get(["theme"]);
const data = await page.sessionStorage.get(["token"], { waitForContext: true });
```

## clear(keys?, options?)

Removes everything from session storage immediately when no keys are provided, or only the specified key/value pairs
when keys are provided. Pass `{ waitForContext: true }` to wait for the next main-frame navigation and validate that a
usable context exists before clearing. When no context is available and `waitForContext` is omitted, the call throws.

```ts
await page.sessionStorage.clear();
await page.sessionStorage.clear("token");
await page.sessionStorage.clear(["token", "theme"]);
await page.sessionStorage.clear(["token", "theme"], { waitForContext: true });
```
