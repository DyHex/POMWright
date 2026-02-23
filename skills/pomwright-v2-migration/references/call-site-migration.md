# Call-Site Migration: v1 -> v2 accessor syntax

## getLocator / getNestedLocator (async -> sync)

v1 returns `Promise<Locator>`. v2 returns `Locator` synchronously. Remove `await`.

```ts
// v1
const btn = await poc.getLocator("navbar.button@login");
await btn.click();

const nested = await poc.getNestedLocator("navbar.button@logout");
await nested.click();

// v2
await poc.getLocator("navbar.button@login").click();
await poc.getNestedLocator("navbar.button@logout").click();
```

## getNestedLocator with index maps -> getLocatorSchema + nth

v1 accepted an optional index map object as second argument. v2 does not; use `getLocatorSchema` with `.nth()` instead.

```ts
// v1
const submit = await poc.getNestedLocator("main.form.button@submit", {
  "main.form": 0,
});

// v2
const submit = poc
  .getLocatorSchema("main.form.button@submit")
  .nth("main.form", 0)
  .getNestedLocator();
```

Multiple indices:

```ts
// v1
const item = await poc.getNestedLocator("main.list.item.detail", {
  "main.list": 0,
  "main.list.item": 2,
});

// v2
const item = poc
  .getLocatorSchema("main.list.item.detail")
  .nth("main.list", 0)
  .nth("main.list.item", 2)
  .getNestedLocator();
```

v2 also supports named index positions:

```ts
const first = poc
  .getLocatorSchema("main.list.item")
  .nth("first")              // omitted subPath defaults to terminal path
  .getNestedLocator();

const last = poc
  .getLocatorSchema("main.list.item")
  .nth("last")
  .getNestedLocator();
```

## addFilter -> filter

v1 `addFilter` on `getLocatorSchema()` becomes v2 `filter`. Method name and argument shape changed.

```ts
// v1
const filtered = await poc
  .getLocatorSchema("main.list.item")
  .addFilter("main.list", { hasText: "list" })
  .addFilter("main.list.item", { hasText: "Row" })
  .getNestedLocator({ "main.list": 0, "main.list.item": -1 });

// v2
const filtered = poc
  .getLocatorSchema("main.list.item")
  .filter("main.list", { hasText: "list" })
  .nth("main.list", 0)
  .filter({ hasText: "Row" })   // omitted subPath defaults to terminal path
  .nth(-1)                       // omitted subPath defaults to terminal path
  .getNestedLocator();
```

Key differences:
- `addFilter` renamed to `filter`
- v2 `filter` and `nth` can be interleaved in any order
- v1 required all filters first, then one index map at the end
- Omitting `subPath` on `filter`/`nth` defaults to the terminal path (the path supplied to `getLocatorSchema`)

## clearSteps

v2 adds `clearSteps()` to remove all runtime steps (filter + nth) from a query builder:

```ts
const schema = poc.getLocatorSchema("main.list.item")
  .filter({ hasText: "Active" })
  .nth(0);

// Clear all steps and start fresh
const reset = schema.clearSteps().filter({ hasText: "Inactive" }).getNestedLocator();

// Clear steps for a specific subPath only
const partial = schema.clearSteps("main.list").getNestedLocator();
```

## update (schema mutation)

v1 `update` accepted a partial schema object. v2 `update` returns a sub-builder where you chain the locator method with override options (PATCH-style merge).

```ts
// v1
const patched = await poc
  .getLocatorSchema("main.button@login")
  .update("main.button@login", { roleOptions: { name: "Sign in" } })
  .getNestedLocator();

// v2
const patched = poc
  .getLocatorSchema("main.button@login")
  .update()                       // defaults to terminal path
  .getByRole({ name: "Sign in" }) // PATCH-style: only override options
  .getNestedLocator();
```

With explicit subPath:

```ts
// v2
const patched = poc
  .getLocatorSchema("main.form.button@login")
  .update("main.form")
  .locator(".login-form-v2")      // override selector for the form segment
  .getNestedLocator();
```

## replace (full replacement)

v2 adds `replace` for POST-style full replacement of a locator strategy:

```ts
// v2 only
const replaced = poc
  .getLocatorSchema("main.button@login")
  .replace()
  .getByText("Sign in")          // entirely replaces the role strategy with text
  .getNestedLocator();

// With subPath
const replaced = poc
  .getLocatorSchema("main.form.button@login")
  .replace("main.form")
  .getByRole("region", { name: "Login" })
  .getNestedLocator();
```

## remove (drop segment from chain)

v2 adds `remove` to soft-delete a segment from the locator chain:

```ts
// v2 only
const removed = poc
  .getLocatorSchema("main.form.button@login")
  .remove("main")                // skips "main" when building the chain
  .getNestedLocator();
```

Without subPath, `remove()` targets the terminal segment. Resolving immediately will throw unless the terminal definition is replaced/updated before resolve:

```ts
// Throws: terminal path was removed
expect(() =>
  poc.getLocatorSchema("main.form.button@login").remove().getNestedLocator()
).toThrow(/No locator schema registered/);

// Repair terminal path before resolve
const repaired = poc
  .getLocatorSchema("main.form.button@login")
  .remove()
  .replace("main.form.button@login")
  .getByRole("button", { name: "Sign in" })
  .getNestedLocator();
```

## getLocatorSchema().getLocator() / .getNestedLocator()

v1 terminal resolution was async. v2 is sync.

```ts
// v1
const loc = await poc.getLocatorSchema("main.button@login").getLocator();
const nested = await poc.getLocatorSchema("main.button@login").getNestedLocator();

// v2
const loc = poc.getLocatorSchema("main.button@login").getLocator();
const nested = poc.getLocatorSchema("main.button@login").getNestedLocator();
```

## describe (v2 only, no v1 equivalent)

Adds a descriptive label to the locator at runtime:

```ts
const btn = poc
  .getLocatorSchema("main.region@security.button@edit")
  .filter({ hasText: "Change password" })
  .describe("Change password")
  .getNestedLocator();
```

## filter has/hasNot value changes

v1 `filter.has`/`filter.hasNot` accepted `Locator` instances. v2 accepts **registry path strings** or `Locator` instances from `getLocator`/`getNestedLocator`.

```ts
// v1 (Locator instance in filter)
.addFilter("main.card", { has: someLocator })

// v2 (path string reference - preferred)
.filter("main.card", { has: "main.card.badge" })

// v2 (Locator instance from registry - also valid)
.filter("main.card", { has: poc.getNestedLocator("main.card.badge") })
```

## SessionStorage signature changes

```ts
// v1
await poc.sessionStorage.set({ token: "abc" }, true);          // boolean reload
await poc.sessionStorage.get(["token"]);
await poc.sessionStorage.clear();

// v2
await poc.sessionStorage.set({ token: "abc" }, { reload: true });
await poc.sessionStorage.get(["token"], { waitForContext: true });
await poc.sessionStorage.clear();                              // clears all
await poc.sessionStorage.clear("token");                       // clears specific key
await poc.sessionStorage.clear(["token", "theme"]);            // clears specific keys
```

Key changes:
- Boolean `reload` parameter -> `{ reload: true }` options object
- New `{ waitForContext: true }` option on `get` and `clear` for handling navigation boundaries
- `clear` now supports clearing specific keys (string or string array)

## Import changes

```ts
// v1
import { BasePage, GetByMethod } from "pomwright";

// v1.5 bridge
import { BasePageV1toV2, GetByMethod } from "pomwright";

// v2
import { PageObject } from "pomwright";
// GetByMethod is no longer needed - remove the import
```
