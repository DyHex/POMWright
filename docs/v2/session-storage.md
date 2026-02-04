# SessionStorage (v2)

## Overview

`SessionStorage` is a helper for setting, reading, and clearing `window.sessionStorage` in Playwright tests. It provides:

- Step-wrapped operations using `test.step`.
- Optional waiting for a navigation context (`waitForContext`).
- A queueing API for setting data on the next navigation.

It is available via `PageObject.sessionStorage` or direct instantiation.

---

## Constructor

```ts
import { SessionStorage } from "pomwright";

const storage = new SessionStorage(page, { label: "LoginPage" });
```

### Options

- `label?: string` – optional prefix for step titles.

Step titles are generated as:

```
<label>.SessionStorage.<method>:
```

---

## Methods

### `set(states, options?)`

Writes key/value pairs to session storage. Optionally reloads the page after writing and/or waits for a usable context.

```ts
await storage.set({ token: "abc", theme: "dark" }, { reload: true });
```

**Options**

- `reload?: boolean` – reload the page after setting values.
- `waitForContext?: boolean` – wait for a main-frame execution context if not available.

If `waitForContext` is not provided and no context exists, `set` throws.

---

### `setOnNextNavigation(states)`

Queues data for the next main-frame navigation. Multiple calls merge state until navigation occurs.

```ts
await storage.setOnNextNavigation({ theme: "dark" });
await storage.setOnNextNavigation({ token: "abc" });
```

Behavior:

- Uses a single `framenavigated` listener for the main frame.
- Flushes queued states after the next navigation.
- Clears the queue after writing.

---

### `get(keys?, options?)`

Reads session storage values.

```ts
const all = await storage.get();
const subset = await storage.get(["token", "theme"]);
```

**Options**

- `waitForContext?: boolean` – wait for a main-frame execution context if not available.

If `waitForContext` is not provided and no context exists, `get` throws.

---

### `clear(keysOrOptions?, options?)`

Clears session storage. You can clear all entries or a subset of keys.

```ts
await storage.clear();
await storage.clear(["token", "theme"]);
await storage.clear("token");
await storage.clear({ waitForContext: true });
await storage.clear(["token"], { waitForContext: true });
```

**Options**

- `waitForContext?: boolean` – wait for a main-frame execution context if not available.

---

## Using `SessionStorage` through `PageObject`

```ts
import { test, expect } from "./fixtures";

test("session storage via PageObject", async ({ loginPage }) => {
  await loginPage.navigation.gotoThisPage();
  await loginPage.sessionStorage.set({ token: "abc" }, { reload: true });
  await loginPage.sessionStorage.setOnNextNavigation({ theme: "dark" });

  const data = await loginPage.sessionStorage.get(["token", "theme"], { waitForContext: true });
  await loginPage.sessionStorage.clear(["token"], { waitForContext: true });

  expect(data.token).toBe("abc");
});
```

---

## Using `SessionStorage` as a fixture

```ts
import { test as base } from "pomwright";
import { SessionStorage } from "pomwright";

type Fixtures = { sessionStorage: SessionStorage };

export const test = base.extend<Fixtures>({
  sessionStorage: async ({ page }, use) => {
    await use(new SessionStorage(page, { label: "SessionStorage" }));
  },
});
```

---

## Context handling details

Internally, `SessionStorage` checks for a main-frame execution context by evaluating `window.sessionStorage`. If the context is missing (e.g., before initial navigation or during reloads), you can pass `waitForContext: true` to wait for `framenavigated` and re-check availability.

If you omit `waitForContext` and no context exists, the helper throws with:

```
SessionStorage context is not available.
```

---

## v1 to v2 differences

- v1 `set(states, reload: boolean)` becomes `set(states, { reload, waitForContext })`.
- v1 `get(keys?)` and `clear()` did not accept context options.
- v2 `clear` accepts optional keys and `waitForContext`.

For migration guidance, see `docs/v1-to-v2-migration`.
