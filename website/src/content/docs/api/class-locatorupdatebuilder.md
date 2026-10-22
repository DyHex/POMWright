---
title: LocatorUpdateBuilder
description: "What a query's update() and replace() return: the ten locator methods, as a JSON Merge Patch of the registered locator or a new locator of any strategy."
---

A query's [`update(subPath?)`](/POMWright/api/class-locatorquerybuilder/#update) and
[`replace(subPath?)`](/POMWright/api/class-locatorquerybuilder/#replace) return a `LocatorUpdateBuilder`: the ten
locator methods, each of which changes the segment's locator in that query and returns the query. The registry never
changes, and the segment keeps its steps and description.

- **`update`** keeps the registered strategy. Call the method of that strategy with a patch in
  [JSON Merge Patch](https://www.rfc-editor.org/rfc/rfc7386) form: a given first argument replaces the registered one,
  the options merge key by key, a `null` key deletes one, a lone `null` deletes them all, and an omitted or `undefined`
  value, the first argument included, keeps what is registered. Another strategy's method throws and names `replace`.
- **`replace`** installs a locator of any strategy, with the arguments of Playwright's own method: the first argument
  required, Playwright's options.

See [patching a definition](/POMWright/docs/queries/#patching-a-definition-update) and
[a new definition](/POMWright/docs/queries/#a-new-definition-replace).

The examples on this page use this registry, and print each chain without its description:

```ts title="checkout.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.button@pay"
  | "main.text@total"
  | "main.input@email"
  | "main.input@search"
  | "main.image@card"
  | "main.icon@help"
  | "main.list@items"
  | "main.frame@payment"
  | "main.frame@payment.button@confirm"
  | "main.rows@cart"
  | "main.panel@summary";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.button@pay").getByRole("button", { name: "Pay", exact: true });
  registry.add("main.text@total").getByText("Total", { exact: true });
  registry.add("main.input@email").getByLabel("Email");
  registry.add("main.input@search").getByPlaceholder("Search");
  registry.add("main.image@card").getByAltText("Card logo");
  registry.add("main.icon@help").getByTitle("Help");
  registry.add("main.list@items").locator("ul", { hasText: "Items" });
  registry.add("main.frame@payment").frameLocator("iframe#payment");
  registry.add("main.frame@payment.button@confirm").getByRole("button", { name: "Confirm" });
  registry.add("main.rows@cart").getByTestId("cart-row");
  registry.add("main.panel@summary").getById("summary");
}
```

Guide: [queries](/POMWright/docs/queries/).

---

## Methods

Every method returns the [query](/POMWright/api/class-locatorquerybuilder/), to chain more changes or resolve it.
Every method throws, in `update` mode, for a segment registered with another strategy, and in `replace` mode, from
JavaScript, when the first argument is missing:

```text
update("main.button@pay") cannot change the strategy from "role" to "text"; use replace("main.button@pay").getByText(…) instead.
getByRole requires a role value for "main.button@pay".
```

An empty string is rejected in both modes where Playwright cannot use one, as at registration:
`locator requires a non-empty selector for "main.list@items".`

### frameLocator()

Changes the segment to a frame segment: with a selector, the `<iframe>` element whose descendants resolve inside the
frame. In `update` mode an omitted selector keeps the registered one. In `replace` mode an omitted selector installs
Playwright's any-frame `frameLocator()`, which must be the first segment of its chain, so its ancestors are
[skipped](/POMWright/api/class-locatorquerybuilder/#skip) or unregistered.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry
  .getLocatorSchema("main.frame@payment.button@confirm")
  .update("main.frame@payment")
  .frameLocator("iframe#card")
  .getNestedLocator();
// locator('main').locator('iframe#card').contentFrame().getByRole('button', { name: 'Confirm' })

registry
  .getLocatorSchema("main.frame@payment.button@confirm")
  .skip("main")
  .replace("main.frame@payment")
  .frameLocator()
  .getNestedLocator();
// frameLocator().getByRole('button', { name: 'Confirm' })
```

**Arguments**

- `selector` string *(optional in `update`, and in `replace` for the any-frame form)*

**Throws**

In `replace` mode without a selector, on the query's own path or on a segment that has steps in the query:

```text
replace() cannot apply to "main.frame@payment": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.
replace() cannot apply to "main.frame@payment": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("main.frame@payment") first.
```

### getByAltText()

Changes the segment to Playwright's [`getByAltText()`](https://playwright.dev/docs/api/class-page#page-get-by-alt-text).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.image@card").update().getByAltText(/logo/i).getNestedLocator();
// locator('main').getByAltText(/logo/i)
registry.getLocatorSchema("main.image@card").replace().getByAltText("Visa").getNestedLocator();
// locator('main').getByAltText('Visa')
```

**Arguments**

- `text` string | RegExp *(optional in `update`)*
- `options` Object *(optional)*: `exact`; in `update` mode a patch, where `null` deletes.

### getById()

Changes the segment to an `id` locator: a string matches the `id` attribute exactly, a RegExp is tested against each
element's id with its flags. See [`getById()`](/POMWright/api/class-registrationbuilder/#getbyid).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.panel@summary").update().getById(/^summary/).getNestedLocator();
// selector: internal:attr=[id=/^summary/]
registry.getLocatorSchema("main.panel@summary").replace().getById("order-summary").getNestedLocator();
// selector: [id="order-summary"]
```

**Arguments**

- `id` string | RegExp *(optional in `update`)*

  An empty string is rejected: `getById requires a non-empty id for "main.panel@summary".`

### getByLabel()

Changes the segment to Playwright's [`getByLabel()`](https://playwright.dev/docs/api/class-page#page-get-by-label).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.input@email").update().getByLabel("E-mail").getNestedLocator();
// locator('main').getByLabel('E-mail')
registry.getLocatorSchema("main.input@email").replace().getByLabel("Email address").getNestedLocator();
// locator('main').getByLabel('Email address')
```

**Arguments**

- `text` string | RegExp *(optional in `update`)*
- `options` Object *(optional)*: `exact`; in `update` mode a patch, where `null` deletes.

### getByPlaceholder()

Changes the segment to Playwright's
[`getByPlaceholder()`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.input@search").update().getByPlaceholder({ exact: true }).getNestedLocator();
// locator('main').getByPlaceholder('Search', { exact: true })
registry.getLocatorSchema("main.input@search").replace().getByPlaceholder("Search products").getNestedLocator();
// locator('main').getByPlaceholder('Search products')
```

**Arguments**

- `text` string | RegExp *(optional in `update`)*
- `options` Object *(optional)*: `exact`; in `update` mode a patch, where `null` deletes.

### getByRole()

Changes the segment to Playwright's [`getByRole()`](https://playwright.dev/docs/api/class-page#page-get-by-role).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.button@pay").update().getByRole({ name: "Pay now" }).getNestedLocator();
// locator('main').getByRole('button', { name: 'Pay now', exact: true })
registry.getLocatorSchema("main.button@pay").update().getByRole({ exact: null }).getNestedLocator();
// locator('main').getByRole('button', { name: 'Pay' })
registry.getLocatorSchema("main.button@pay").update().getByRole("link", null).getNestedLocator();
// locator('main').getByRole('link')
registry.getLocatorSchema("main.button@pay").replace().getByRole("link", { name: "Pay" }).getNestedLocator();
// locator('main').getByRole('link', { name: 'Pay' })
```

**Arguments**

- `role` string *(optional in `update`)*

  An ARIA role, as Playwright's type lists them.

- `options` Object *(optional)*

  Playwright's options, such as `name`, `exact` and `level`; in `update` mode a patch, where `null` deletes.

### getByTestId()

Changes the segment to Playwright's [`getByTestId()`](https://playwright.dev/docs/api/class-page#page-get-by-test-id).
An empty string is a value Playwright matches and is kept.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.rows@cart").update().getByTestId("cart-item").getNestedLocator();
// locator('main').getByTestId('cart-item')
registry.getLocatorSchema("main.rows@cart").replace().getByTestId(/cart-/).getNestedLocator();
// locator('main').getByTestId(/cart-/)
```

**Arguments**

- `testId` string | RegExp *(optional in `update`)*

### getByText()

Changes the segment to Playwright's [`getByText()`](https://playwright.dev/docs/api/class-page#page-get-by-text).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.text@total").update().getByText({ exact: null }).getNestedLocator();
// locator('main').getByText('Total')
registry.getLocatorSchema("main.button@pay").replace().getByText("Pay", { exact: true }).getNestedLocator();
// locator('main').getByText('Pay', { exact: true })
```

**Arguments**

- `text` string | RegExp *(optional in `update`)*
- `options` Object *(optional)*: `exact`; in `update` mode a patch, where `null` deletes.

### getByTitle()

Changes the segment to Playwright's [`getByTitle()`](https://playwright.dev/docs/api/class-page#page-get-by-title).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.icon@help").update().getByTitle({ exact: true }).getNestedLocator();
// locator('main').getByTitle('Help', { exact: true })
registry.getLocatorSchema("main.icon@help").replace().getByTitle("More help").getNestedLocator();
// locator('main').getByTitle('More help')
```

**Arguments**

- `text` string | RegExp *(optional in `update`)*
- `options` Object *(optional)*: `exact`; in `update` mode a patch, where `null` deletes.

### locator()

Changes the segment to Playwright's [`locator()`](https://playwright.dev/docs/api/class-page#page-locator).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./checkout.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.getLocatorSchema("main.list@items").update().locator({ hasText: "Cart" }).getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Cart' })
registry.getLocatorSchema("main.list@items").update().locator("ol", null).getNestedLocator();
// locator('main').locator('ol')
registry.getLocatorSchema("main.list@items").replace().locator("ol.cart").getNestedLocator();
// locator('main').locator('ol.cart')
```

**Arguments**

- `selector` string *(optional in `update`)*

  An empty selector is rejected in both modes.

- `options` Object *(optional)*: Playwright's options, such as `hasText`; in `update` mode a patch, where `null`
  deletes.
