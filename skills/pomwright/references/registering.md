# Registering locators

How a locator is registered under a path: `add(path)`, one of ten methods with Playwright's own arguments, then any
steps. Full rules: [Registering locators](https://dyhex.github.io/POMWright/docs/registering-locators/).

## Contents

- [The ten methods](#the-ten-methods)
- [Steps: filter, nth, describe](#steps-filter-nth-describe)
- [Filtering by another registered locator](#filtering-by-another-registered-locator)
- [Ids: getById](#ids-getbyid)
- [Frames](#frames)
- [The rules a registration follows](#the-rules-a-registration-follows)

## The ten methods

`add(path)` is followed by exactly one of these, with the arguments and types of the Playwright method of the same
name. In a page object the calls are `this.add(…)` inside `defineLocators()`; in a locator module, `registry.add(…)`.
The list is in the skills' order of preference (`guides/choosing-locators-and-paths.md`): take the first that
identifies the element, narrowed by its options and `filter()` where it matches several.

| method | Playwright's | use it for |
| --- | --- | --- |
| `getByRole(role, options?)` | `page.getByRole()` | interactive elements and landmarks, regions, forms, dialogs, tables, lists, with `{ name }` |
| `getByLabel(text, options?)` | `page.getByLabel()` | form fields |
| `getByPlaceholder(text, options?)` | `page.getByPlaceholder()` | a field without a label |
| `getByText(text, options?)` | `page.getByText()` | non-interactive text |
| `getByAltText(text, options?)` | `page.getByAltText()` | images |
| `getByTitle(text, options?)` | `page.getByTitle()` | an element known only by its `title` attribute |
| `getByTestId(testId)` | `page.getByTestId()` | an element nothing user-facing identifies |
| `getById(id)` | none: POMWright's | an `id` that is the element's stable contract, where the app has no test id, see [Ids](#ids-getbyid) |
| `locator(selector, options?)` | `page.locator()` | a segment the app gives none of these: a CSS selector, as short as it can be; never XPath |
| `frameLocator(selector?)` | `locator(selector)` then `contentFrame()` | an `<iframe>` whose content the paths below it search, see [Frames](#frames) |

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.form@login" | "main.form@login.button@login">;

registry.add("main").getByRole("main");

registry.add("main.form@login").getByRole("form", { name: "Log in" });

registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
// getNestedLocator("main.form@login.button@login"):
// getByRole('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
```

`getByRole("main")` finds the `<main>` element by its landmark role, and every path below it searches
inside it only. With CSS, Playwright prints the options of `locator(selector, options)` as a step:
`locator("section.cart", { hasText: "Total" })` resolves to `locator('section.cart').filter({ hasText: 'Total' })`.

## Steps: filter, nth, describe

After the method, chain the steps Playwright chains after a locator, in any order and number. They apply every time the
path is resolved, right after its own locator and before the next segment's:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.list@orders" | "main.list@orders.item@open">;

registry.add("main.list@orders").getByRole("list", { name: "Orders" });

registry
  .add("main.list@orders.item@open")
  .getByRole("listitem")
  .filter({ hasText: "Open" })
  .describe("Open orders");
// getByRole('list', { name: 'Orders' }).getByRole('listitem').filter({ hasText: 'Open' }), described "Open orders"
```

- `filter` takes Playwright's options: `hasText`, `hasNotText`, `has`, `hasNot`, `visible`.
- `nth` takes a number (`-1` is the last), `"first"` or `"last"`. An index belongs at the end of a chain that cannot be
  made unique otherwise: a filter on what identifies the element survives changes an index does not.
- `describe` replaces the path as the locator's description in the report; `describe("")` removes it, so the locator
  prints as its chain. Every resolved locator is described by its path by default
  ([Descriptions](https://dyhex.github.io/POMWright/docs/descriptions/)).
- A step for one test goes on a query, not on the registration: see
  [Queries](https://dyhex.github.io/POMWright/docs/queries/).

## Filtering by another registered locator

`has` and `hasNot` take a registered path as well as a Playwright `Locator`. A path resolves to that path's own locator,
without its ancestors, because Playwright looks for it inside each element being filtered:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths = "main" | "main.region@orders" | "main.region@orders.heading" | "main.region@orders.item@open";
declare const registry: LocatorRegistry<Paths>;

registry.add("main").getByRole("main");

registry.add("main.region@orders").getByRole("region").filter({ has: "main.region@orders.heading" });

registry.add("main.region@orders.heading").getByRole("heading", { name: "Orders" });

registry.add("main.region@orders.item@open").getByRole("listitem").filter({ hasText: "Open" });
// getNestedLocator("main.region@orders.item@open"):
// getByRole('main').getByRole('region').filter({ has: getByRole('heading', { name: 'Orders' }) }).getByRole('listitem').filter({ hasText: 'Open' })
```

Prefer the path: it is short, it may name a path registered later in `defineLocators()`, and the page object's check
reports a path that is never registered. To filter by a locator with its ancestors, resolve it with
`getNestedLocator` before the `add` line and pass the `Locator`
([a path, a locator or a chain](https://dyhex.github.io/POMWright/docs/filters-and-indices/#a-path-a-locator-or-a-chain)).

## Ids: getById

Playwright has no `getById`: an id is a CSS selector away, `locator("#login")`, until the id holds a character CSS gives
a meaning to (`settings.panel`, `form:user`, `items[0]`, a leading digit). `getById` matches the `id` attribute
itself:

- a string matches the whole id, exactly and case-sensitively, with no `#`: `getById("settings.panel")` becomes the
  selector `[id="settings.panel"]`;
- a RegExp is tested against each element's id with its flags; anchor it (`/^order-\d+$/`) to match a whole id.

It ranks with `getByTestId`: use it when the id is the element's stable contract and nothing user-facing identifies the
element, for example a third-party widget whose ids are its documented interface. See
[Locating by id](https://dyhex.github.io/POMWright/docs/locating-by-id/).

## Frames

`frameLocator(selector)` registers the `<iframe>` element; the paths below it resolve inside the frame's document.
Register it below the segment that tells the frames apart:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths =
  | "main"
  | "main.region@payment"
  | "main.region@payment.frame"
  | "main.region@payment.frame.input@cardNumber";
declare const registry: LocatorRegistry<Paths>;

registry.add("main").getByRole("main");

registry.add("main.region@payment").getByRole("region", { name: "Payment" });

registry.add("main.region@payment.frame").frameLocator("iframe");

registry.add("main.region@payment.frame.input@cardNumber").getByLabel("Card number");
// getNestedLocator("main.region@payment.frame.input@cardNumber"):
// getByRole('main').getByRole('region', { name: 'Payment' }).locator('iframe').contentFrame().getByLabel('Card number')
```

Resolving the frame segment's own path gives the `<iframe>` element. `frameLocator()` without a selector is Playwright's
any-frame locator: first segment of a chain only, no steps. See [Frames](https://dyhex.github.io/POMWright/docs/frames/).

## The rules a registration follows

- **One method, one registration per path.** A second method on one `add(path)`, or a second `add` of a registered
  path, throws and names the path; two modules that register the same path on one registry fail the same way.
- **The first argument is required.** An empty string is rejected where Playwright cannot use it (`locator`,
  `frameLocator`, `getByRole`, `getById`) and kept where Playwright matches it (the text methods, `getByTestId`).
- **Give a registration all its steps in its `add(…)` chain.** A registration ends at the next call on the registry
  (another `add`, a resolution, a query, `verify`); a step called on it afterwards throws and names the call that ended
  it. A registry call inside a step's own arguments runs first and ends it too: resolve a `Locator` before the `add`
  line, or pass a path to `has`.
- **What is registered never changes.** The registry keeps copies of the options and filter objects you pass; to change
  a locator for one use, query it.
- **Order in `defineLocators()`**: a `has` or `hasNot` path is a reference and may be registered later; a path reused
  with `add(path, { reuse })` is copied at that call and must be registered first
  ([When locators are registered](https://dyhex.github.io/POMWright/docs/registering-locators/#when-locators-are-registered)).
- **A RegExp with the `u` or `v` flag** that holds a quote, an apostrophe or a backtick breaks the locator Playwright
  builds from it: write that character by its code (`/don\x27t save/iu`) or leave the flag out
  ([A RegExp in unicode mode](https://dyhex.github.io/POMWright/docs/registering-locators/#a-regexp-in-unicode-mode)).
