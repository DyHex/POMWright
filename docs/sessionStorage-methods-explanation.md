# SessionStorage helper

Every `BasePage` exposes a `sessionStorage` property that wraps common operations on `window.sessionStorage`.  The helper records each action as a Playwright `test.step` for better reporting.

## set(states, reload)

Writes key/value pairs to session storage.  Passing `true` for `reload` refreshes the page to apply the new state immediately.

```ts
await page.sessionStorage.set({ token: "abc", theme: "dark" }, true);
```

## setOnNextNavigation(states)

Queues values that are written just before the next navigation event.  Multiple calls merge their state.

```ts
await login.sessionStorage.setOnNextNavigation({ token: "abc" });
await login.page.goto(login.fullUrl); // queued values are applied before navigation completes
```

## get(keys?)

Retrieves data from session storage.  When `keys` are provided only those values are returned; otherwise all stored keys are returned.

```ts
const { theme } = await page.sessionStorage.get(["theme"]);
```

## clear()

Removes everything from session storage:

```ts
await page.sessionStorage.clear();
```

These helpers are especially useful when tests need to prime application state without going through the UI.
