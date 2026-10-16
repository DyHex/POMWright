---
title: Registration
description: "What add(path) returns: the ten locator methods with Playwright's arguments, then filter, nth and describe; the forms after { reuse }."
---

`add(path)` returns a registration: the ten locator methods, one of which registers the path. After it come the steps
Playwright chains after a locator, `filter`, `nth` and `describe`, applied every time the path is resolved, in the order
chained. The registration is used in one statement and not kept, so POMWright does not export its type; TypeScript
offers the steps only after a locator method.

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.list" | "main.list.item">;
// ---cut---
registry.add("main").locator("main");
registry.add("main.list").locator("ul.orders");
registry.add("main.list.item").getByRole("listitem").filter({ hasText: "Open" }).nth(0);
// main.list.item: locator('main').locator('ul.orders').getByRole('listitem').filter({ hasText: 'Open' }).first()
```

The chains on this page are shown without the description, which is the path unless `describe` sets one. Guides:
[registering locators](/POMWright/docs/registering-locators/), [filters and indices](/POMWright/docs/filters-and-indices/),
[reusing locators](/POMWright/docs/reusing-locators/).

---

## Locator methods

Each takes the arguments of the Playwright method it is named after and returns the registration, for `filter`, `nth`
and `describe`. Each throws at the call, naming the method and the path, when its first argument is missing (from
JavaScript) or is an empty string where Playwright cannot use one, when the path already has a locator, and, from
JavaScript, when the path breaks the path rules:

```text
getByRole requires a role value for "main.button@save".
A locator schema with the path "main" already exists.
A locator definition for "main" has already been provided; only one locator type can be set for a registration.
LocatorSchemaPath string cannot contain consecutive dots: main..list
```

The second message goes on with the existing and the attempted locator; the third is a second locator method on one
registration.

### frameLocator()

Registers a frame segment. With a selector, the segment is the `<iframe>` element, `locator(selector)` with any steps,
and the paths below it resolve inside the frame through
[`contentFrame()`](https://playwright.dev/docs/api/class-locator#locator-content-frame); as the last segment of a path
it resolves to the element. Without a selector it is Playwright's any-frame
[`page.frameLocator()`](https://playwright.dev/docs/api/class-page#page-frame-locator): the paths below it resolve in
whichever single frame holds them. See [frames](/POMWright/docs/frames/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<
  "shell" | "shell.frame@payment" | "shell.frame@payment.button@pay" | "consent" | "consent.button@accept"
>;
// ---cut---
registry.add("shell").locator("div.shell");
registry.add("shell.frame@payment").frameLocator("iframe#payment");
registry.add("shell.frame@payment.button@pay").getByRole("button", { name: "Pay" });
// locator('div.shell').locator('iframe#payment').contentFrame().getByRole('button', { name: 'Pay' })

registry.add("consent").frameLocator();
registry.add("consent.button@accept").getByRole("button", { name: "Accept" });
// frameLocator().getByRole('button', { name: 'Accept' })
```

**Arguments**

- `selector` string *(optional)*

  The `<iframe>` element's selector. Without it, the any-frame form: it must be the first segment of its chain, takes
  no steps, cannot be resolved on its own, and returns nothing to chain.

**Returns**

- the registration, with a selector; `undefined` without one

**Throws**

```text
frameLocator requires a non-empty selector for "shell.frame".
```

An any-frame segment that is not the first segment of its chain fails [`verify()`](/POMWright/api/class-locatorregistry/#verify)
and every resolution through it:

```text
frameLocator() without a selector must be the first segment of the chain; "shell.consent" has the ancestor "shell".
```

### getByAltText()

Registers the path's locator as Playwright's
[`page.getByAltText()`](https://playwright.dev/docs/api/class-page#page-get-by-alt-text): an element, usually an image,
by its alt text.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"header.image@logo">;
// ---cut---
registry.add("header.image@logo").getByAltText("Shop logo");
// getByAltText('Shop logo')
```

**Arguments**

- `text` string | RegExp
- `options` Object *(optional)*: Playwright's options, `exact`.

An empty string is a value Playwright matches and is stored as given.

**Returns**

- the registration

### getById()

Registers a locator by the `id` attribute, which Playwright has no method for. A string matches the id exactly and
case-sensitively, as `[id="…"]`, so ids with `.`, `:`, spaces or quotes work as written; a RegExp is tested against each
element's id, with its flags. See [locating by id](/POMWright/docs/locating-by-id/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.panel@settings" | "main.button@submit">;
// ---cut---
registry.add("main.panel@settings").getById("settings.panel");
// selector: [id="settings.panel"]
registry.add("main.button@submit").getById(/^button\.submit\.[a-z0-9]{4}$/i);
// selector: internal:attr=[id=/^button\.submit\.[a-z0-9]{4}$/i]
```

**Arguments**

- `id` string | RegExp

  The id as written, without a `#`; or a pattern, unanchored unless you anchor it.

**Returns**

- the registration

**Throws**

```text
getById requires a non-empty id for "main.panel@settings".
```

### getByLabel()

Registers the path's locator as Playwright's
[`page.getByLabel()`](https://playwright.dev/docs/api/class-page#page-get-by-label): an input by its `<label>`,
`aria-labelledby` or `aria-label`.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.form.input@email">;
// ---cut---
registry.add("main.form.input@email").getByLabel("Email", { exact: true });
// getByLabel('Email', { exact: true })
```

**Arguments**

- `text` string | RegExp
- `options` Object *(optional)*: Playwright's options, `exact`.

**Returns**

- the registration

### getByPlaceholder()

Registers the path's locator as Playwright's
[`page.getByPlaceholder()`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder): an input by its
placeholder.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.input@search">;
// ---cut---
registry.add("main.input@search").getByPlaceholder("Search");
// getByPlaceholder('Search')
```

**Arguments**

- `text` string | RegExp
- `options` Object *(optional)*: Playwright's options, `exact`.

**Returns**

- the registration

### getByRole()

Registers the path's locator as Playwright's
[`page.getByRole()`](https://playwright.dev/docs/api/class-page#page-get-by-role): by ARIA role, accessible name and
state. Which strings are roles is Playwright's own type, with completion in the editor.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.button@save">;
// ---cut---
registry.add("main.button@save").getByRole("button", { name: "Save" });
// getByRole('button', { name: 'Save' })
```

**Arguments**

- `role` string

  An ARIA role; an empty one is rejected.

- `options` Object *(optional)*: Playwright's `getByRole` options, such as `name`, `exact` and `level`.

**Returns**

- the registration

**Throws**

```text
getByRole requires a non-empty role for "main.heading".
```

### getByTestId()

Registers the path's locator as Playwright's
[`page.getByTestId()`](https://playwright.dev/docs/api/class-page#page-get-by-test-id), by the attribute the project's
[`testIdAttribute`](https://playwright.dev/docs/api/class-testoptions#test-options-test-id-attribute) names.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.row@order">;
// ---cut---
registry.add("main.row@order").getByTestId("order-row");
// getByTestId('order-row')
```

**Arguments**

- `testId` string | RegExp

  An empty string is a value Playwright matches (`data-testid=""`) and is stored as given.

**Returns**

- the registration

### getByText()

Registers the path's locator as Playwright's
[`page.getByText()`](https://playwright.dev/docs/api/class-page#page-get-by-text): by the text an element contains.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.alert@error">;
// ---cut---
registry.add("main.alert@error").getByText(/failed/i);
// getByText(/failed/i)
```

**Arguments**

- `text` string | RegExp
- `options` Object *(optional)*: Playwright's options, `exact`.

An empty string is a value Playwright matches and is stored as given.

**Returns**

- the registration

### getByTitle()

Registers the path's locator as Playwright's
[`page.getByTitle()`](https://playwright.dev/docs/api/class-page#page-get-by-title): an element by its `title`
attribute.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.icon@info">;
// ---cut---
registry.add("main.icon@info").getByTitle("More information");
// getByTitle('More information')
```

**Arguments**

- `text` string | RegExp
- `options` Object *(optional)*: Playwright's options, `exact`.

**Returns**

- the registration

### locator()

Registers the path's locator as Playwright's [`page.locator()`](https://playwright.dev/docs/api/class-page#page-locator):
by a CSS or other Playwright selector.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.list">;
// ---cut---
registry.add("main.list").locator("ul.orders");
// locator('ul.orders')
```

**Arguments**

- `selector` string

  An empty selector is rejected: Playwright cannot parse it.

- `options` Object *(optional)*: Playwright's `locator` options, such as `hasText` and `has`.

**Returns**

- the registration

**Throws**

```text
locator requires a non-empty selector for "main.list".
```

---

## Steps

Available after a locator method, chained in any order and number, and applied in that order. From JavaScript, a step
before the locator method throws:

```text
filter() needs a locator strategy first for "main.list.item"; call getByRole, getByText, getByLabel, getByPlaceholder, getByAltText, getByTitle, locator, frameLocator, getByTestId or getById before it.
```

### describe()

Sets the description Playwright shows for the resolved locator in the trace viewer and the HTML report, instead of the
path, as [`locator.describe()`](https://playwright.dev/docs/api/class-locator#locator-describe) does; `""` removes it,
so the locator shows as its chain. It applies where this path is resolved, not where it is an ancestor. See
[descriptions](/POMWright/docs/descriptions/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.list.item@described">;
// ---cut---
registry.add("main.list.item@described").getByRole("listitem").describe("Order");
```

**Arguments**

- `description` string

**Returns**

- the registration

**Throws**

```text
describe requires a string for "main.footer"; pass "" to remove the description.
```

### filter()

Adds a [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter) step. `has` and `hasNot` also
take a registered path, resolved to that path's own locator, without its ancestors, because Playwright looks for it
inside each element being filtered. See [filters and indices](/POMWright/docs/filters-and-indices/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.section@orders" | "main.section@orders.heading">;
// ---cut---
registry.add("main.section@orders.heading").getByRole("heading", { name: "Orders" });
registry.add("main.section@orders").locator("section").filter({ has: "main.section@orders.heading" });
```

**Arguments**

- `filter` [FilterDefinition](/POMWright/api/types/#filterdefinition)

  Playwright's filter options, `hasText`, `hasNotText`, `has`, `hasNot` and `visible`, with a registered path allowed
  for `has` and `hasNot`.

**Returns**

- the registration

A `has` path that is not registered, or a cycle of `has` paths, fails
[`verify()`](/POMWright/api/class-locatorregistry/#verify).

### nth()

Adds an index step: `"first"` and `"last"` become Playwright's
[`first()`](https://playwright.dev/docs/api/class-locator#locator-first) and
[`last()`](https://playwright.dev/docs/api/class-locator#locator-last), and a number goes to
[`nth()`](https://playwright.dev/docs/api/class-locator#locator-nth) as given (`-1` is the last element).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.list.item@last">;
// ---cut---
registry.add("main.list.item@last").getByRole("listitem").nth("last");
// getByRole('listitem').last()
```

**Arguments**

- `index` number | "first" | "last"

**Returns**

- the registration

---

## After `{ reuse }`

`add(path, { reuse })` registers the path at once. What it returns depends on what is reused.

### A registered path

The path is a copy of the reused one: its locator, its steps and an explicit description. `filter`, `nth` and
`describe` narrow the copy, after the copied steps; there is no locator method, so the copy keeps the locator it
reused.

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.list" | "main.list.item" | "main.list.item@last">;
// ---cut---
registry.add("main").locator("main");
registry.add("main.list").locator("ul");
registry.add("main.list.item").getByRole("listitem").filter({ hasText: "Open" });
registry.add("main.list.item@last", { reuse: "main.list.item" }).nth("last").describe("Last open item");
// locator('main').locator('ul').getByRole('listitem').filter({ hasText: 'Open' }).last()
```

### A seed

The seed is registered as it is. The first call may be the seed's own locator method, which patches it as
[`update()`](/POMWright/api/class-locatorquerybuilder/#update) does: a given first argument replaces the seed's, the
options merge key by key, a `null` key deletes one, a lone `null` clears them, and no argument keeps the seed. Then
`filter`, `nth` and `describe`.

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@cancel" | "main.link@plain">;
// ---cut---
const saveButton = registry.createReusable.getByRole("button", { name: "Save", exact: true });

registry.add("main.button@cancel", { reuse: saveButton }).getByRole({ name: "Cancel" });
// getByRole('button', { name: 'Cancel', exact: true })
registry.add("main.link@plain", { reuse: saveButton }).getByRole("link", null);
// getByRole('link')
```

**Throws**

```text
The locator definition for "main.button@x" must use the "role" strategy when reusing a locator.
A locator definition for "main.button@y" was already provided from reuse; only one matching override is allowed.
```

The first for another locator method than the seed's, the second for a second call of it.
