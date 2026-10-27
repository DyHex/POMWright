---
title: LocatorQueryBuilder
description: "What getLocatorSchema(path) returns; a private copy of a path's chain to change for one use, then resolve."
---

`getLocatorSchema(path)` returns a `LocatorQueryBuilder`: a private copy of the path's chain that you change for one
use and then resolve. Its methods change this query and return it; the registry never changes.

The examples on this page use this registry:

```ts title="orders.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths = "main" | "main.list" | "main.list.item" | "main.button@save";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.list").locator("ul").filter({ hasText: "Orders" });
  registry.add("main.list.item").locator("li").nth(0);
  registry.add("main.button@save").getByRole("button", { name: "Save", exact: true });
}
```

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
const lastOpenOrder = registry
  .getLocatorSchema("main.list.item")
  .clearSteps()
  .filter({ hasText: "Open" })
  .nth("last")
  .getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').filter({ hasText: 'Open' }).last()
```

A method that takes a `subPath` works on that segment of the query's chain: the path itself or one of its registered
ancestors. Without one it works on the path itself. Guide: [queries](/POMWright/docs/queries/).

---

## Methods

### clearSteps()

Removes the `filter` and `nth` steps of a segment in this query; its definition and description stay.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").clearSteps().getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li')

registry.getLocatorSchema("main.list.item").clearSteps("main.list").getNestedLocator();
// locator('main').locator('ul').locator('li').first()
```

**Arguments**

- `subPath` string *(optional)*

  The segment. Defaults to the query's path.

**Returns**

- LocatorQueryBuilder

### describe()

Sets the description of the resolved locator for this query; `""` removes it. See
[the description](/POMWright/docs/queries/#the-description-describe).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").describe("First order").getNestedLocator();
```

**Arguments**

- `description` string

  Applies to the path itself; ancestors' descriptions never show.

**Returns**

- LocatorQueryBuilder

**Throws**

```text
describe requires a string for "main.list.item"; pass "" to remove the description.
describe() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

The second when the query's path is the any-frame `frameLocator()`, which has no element to describe; replace the path
first.

### filter()

Adds a [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter) step to a segment, after
its registered steps.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").filter({ hasText: "#1042" }).getNestedLocator();
registry.getLocatorSchema("main.list.item").filter("main.list", { hasText: "Open" }).getNestedLocator();
```

**Arguments**

- `subPath` string *(optional)*

  The segment. Defaults to the query's path.

- `filter` [FilterDefinition](/POMWright/api/types/#filterdefinition)

  Playwright's filter options. `has` and `hasNot` also take a registered path, resolved to that path's own locator, without its
  ancestors.

**Returns**

- LocatorQueryBuilder

**Throws**

On a `frameLocator()` without a selector, which has no element:

```text
filter() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

### getLocator()

Resolves the query's path alone, with its steps and description, as
[`LocatorRegistry.getLocator()`](/POMWright/api/class-locatorregistry/#getlocator) does; changes to ancestors and
skipped ancestors make no difference to it.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").nth("last").getLocator();
// locator('li').first().last()
```

**Returns**

- [Locator](https://playwright.dev/docs/api/class-locator)

### getNestedLocator()

Resolves the query's chain: every registered segment that is not skipped, first to last, each with its steps, as
[`LocatorRegistry.getNestedLocator()`](/POMWright/api/class-locatorregistry/#getnestedlocator) does.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()
```

**Returns**

- [Locator](https://playwright.dev/docs/api/class-locator)

### nth()

Adds an index step to a segment, after its registered steps: `"first"` and `"last"` become
[`first()`](https://playwright.dev/docs/api/class-locator#locator-first) and
[`last()`](https://playwright.dev/docs/api/class-locator#locator-last), a number goes to
[`nth()`](https://playwright.dev/docs/api/class-locator#locator-nth) as given (`-1` is the last element).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").clearSteps().nth(2).getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').nth(2)
```

The registered `nth(0)` stays unless cleared; see [steps](/POMWright/docs/queries/#steps-filter-nth-clearsteps).

**Arguments**

- `subPath` string *(optional)*

  The segment. Defaults to the query's path.

- `index` number | "first" | "last"

**Returns**

- LocatorQueryBuilder

**Throws**

On a `frameLocator()` without a selector, which has no element:

```text
nth() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

### replace()

Replaces a segment's definition for this query with one of any strategy, with Playwright's arguments; its steps and
description stay. Returns an [update builder](/POMWright/api/class-locatorupdatebuilder/). See
[a new definition](/POMWright/docs/queries/#a-new-definition-replace).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").replace("main.list").getByRole("list", { name: "Orders" }).getNestedLocator();
// locator('main').getByRole('list', { name: 'Orders' }).filter({ hasText: 'Orders' }).locator('li').first()
```

**Arguments**

- `subPath` string *(optional)*

  The segment. Defaults to the query's path.

**Returns**

- [LocatorUpdateBuilder](/POMWright/api/class-locatorupdatebuilder/)

**Throws**

```text
getByRole requires a role value for "main.button@save".
replace() cannot apply to "main.list": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("main.list") first.
```

The first from JavaScript, where a missing first argument is not a compile error; the second for `frameLocator()`
without a selector on a segment that has steps.

### skip()

Leaves an ancestor out of the chain when this query resolves; `unskip()` brings it back as it was. See
[leaving an ancestor out](/POMWright/docs/queries/#leaving-an-ancestor-out-skip-and-unskip).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list.item").skip("main.list").getNestedLocator();
// locator('main').locator('li').first()
```

**Arguments**

- `subPath` string

  A registered ancestor of the query's path; the path itself cannot be skipped.

**Returns**

- LocatorQueryBuilder

**Throws**

A change to a skipped segment and a second `skip` of it throw at the call, and so does skipping the query's own path
(from JavaScript). An `update()` or `replace()` builder taken before the `skip` throws when its method applies the
change:

```text
filter() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
skip() cannot skip "main.list": it is already skipped in this query.
skip() cannot skip "main.list.item": it is the path this query resolves; skip one of its ancestors.
```

### unskip()

Puts a segment left out with `skip()` back into the chain, with everything it had.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
const query = registry.getLocatorSchema("main.list.item").skip("main.list");
query.unskip("main.list").getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()
```

**Arguments**

- `subPath` string

  A segment skipped in this query.

**Returns**

- LocatorQueryBuilder

**Throws**

```text
unskip() cannot unskip "main.list": it is not skipped in this query.
```

### update()

Patches a segment's definition for this query and keeps its strategy; its steps and description stay. Returns an
[update builder](/POMWright/api/class-locatorupdatebuilder/). See
[patching a definition](/POMWright/docs/queries/#patching-a-definition-update).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./orders.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.button@save").update().getByRole({ name: "Cancel" }).getNestedLocator();
// locator('main').getByRole('button', { name: 'Cancel', exact: true })

registry.getLocatorSchema("main.button@save").update().getByRole("button", null).getNestedLocator();
// locator('main').getByRole('button')
```

**Arguments**

- `subPath` string *(optional)*

  The segment. Defaults to the query's path.

**Returns**

- [LocatorUpdateBuilder](/POMWright/api/class-locatorupdatebuilder/)

**Throws**

```text
update("main.button@save") cannot change the strategy from "role" to "locator"; use replace("main.button@save").locator(…) instead.
```

---

## Errors of every method

A `subPath` outside the query's chain, or a segment of it without a locator, throws at the call:

```text
"main.button@save" is not a valid sub-path of "main.list.item".
"main.form" is not a valid sub-path of "main.form.button@save". It is a segment of that path, but no locator schema is registered for it.
```
