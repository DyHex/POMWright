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

Key difference: v2 `filter` and `nth` can be interleaved in any order. v1 required all filters first, then one index map at the end.

## update (schema mutation)

v1 `update` accepted a partial schema object. v2 `update` returns a sub-builder where you chain the locator method with override options.

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

v2 also adds `replace` (full replacement) and `remove` (drop a subpath from chain):

```ts
// replace the entire locator strategy for a subpath
const replaced = poc
  .getLocatorSchema("main.button@login")
  .replace()
  .getByText("Sign in")
  .getNestedLocator();

// remove a segment from the chain
const removed = poc
  .getLocatorSchema("main.button@login")
  .remove("main")
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

```ts
const btn = poc
  .getLocatorSchema("main.region@security.button@edit")
  .filter({ hasText: "Change password" })
  .describe("Change password")
  .getNestedLocator();
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
await poc.sessionStorage.clear(["token"]);                     // clears specific keys
```

## Import changes

```ts
// v1
import { BasePage, GetByMethod } from "pomwright";

// v1.5 bridge
import { BasePageV1toV2, GetByMethod } from "pomwright";

// When all schemas moved to defineLocators, remove GetByMethod import.
```

## filter has/hasNot value changes

v1 `filter.has`/`filter.hasNot` accepted `Locator` instances. v2 accepts **registry path strings** or `Locator` instances from `getLocator`/`getNestedLocator`.

```ts
// v1 (Locator instance in filter)
.addFilter("main.card", { has: someLocator })

// v2 (path string reference)
.filter("main.card", { has: "main.card.badge" })

// v2 (Locator instance from registry)
.filter("main.card", { has: poc.getNestedLocator("main.card.badge") })
```
