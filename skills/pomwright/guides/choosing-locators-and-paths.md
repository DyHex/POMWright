# Choosing locators and paths

How to pick the locator for an element and the path it lives at. Every other guide applies this one. The methods
themselves are in `references/registering.md`; the path rules in `references/paths-and-registry.md`.

## Contents

- [The locator: the order of preference](#the-locator-the-order-of-preference)
- [The segments: how much context](#the-segments-how-much-context)
- [The names: kind@which](#the-names-kindwhich)
- [Several matches, and one among them](#several-matches-and-one-among-them)
- [Worked example](#worked-example)
- [Worked example: a table](#worked-example-a-table)

## The locator: the order of preference

For each element a test acts on or checks, take the first of these that identifies it in its scope. They are
Playwright's locators, each used for what playwright.dev's [Locators](https://playwright.dev/docs/locators) page says it
is for, in the order Testing Library gives its queries
([Priority](https://testing-library.com/docs/queries/about#priority)): what a user sees first, then the contracts a
user does not see, then the page's structure.

1. **`getByRole(role, { name })`**: buttons, links, checkboxes, text boxes, tabs, menu items, and the containers a user
   sees as one thing: `main`, `navigation`, `region` (a section with a name), `form`, `dialog`, `table`, `list`. Pass the
   accessible name; `exact: true` when one name is part of another ("Save" and "Save draft").
2. **`getByLabel(text)`**: a form field with a label.
3. **`getByPlaceholder(text)`**: a field without a label.
4. **`getByText(text)`**: non-interactive text: a message, a status, a price.
5. **`getByAltText(text)`**: an image.
6. **`getByTitle(text)`**: an element known only by its `title`, which screen readers do not always read and sighted
   users do not see by default.
7. **`getByTestId(id)`**, when nothing a user sees identifies the element.
8. POMWright's **`getById(id)`**, for an id that is the element's stable contract, where the app has no test id.
9. **`locator(css)`**, last, for a segment the app gives none of these, written as short as it can be.

When the locator matches several elements in its scope, narrow it before moving down the list, first by the method's
own options. Each is for a situation; the installed declarations list them all:

- `getByRole`: `name`, with `exact` or a RegExp; `description`, for elements with one name told apart by their
  accessible description (a "Delete" button for each product); `level`, for a heading's level (`level: 1`, the page's
  title); `checked`, `pressed`, `selected`, `expanded` and `disabled`, for the element in a state: the selected tab, the
  expanded menu button, the checked option (`disabled` is inherited from a disabled `fieldset` or an `aria-disabled`
  ancestor); `includeHidden: true`, which also matches an element ARIA hides, such as a closed dialog with the `hidden`
  attribute, for a test that reads it while it is hidden.
- `getByLabel`, `getByPlaceholder`, `getByText`, `getByAltText`, `getByTitle`: `exact`, or a RegExp.
- `locator(css, options)`: `hasText`, `hasNotText`, `has` and `hasNot`, as `filter()` takes them.

Then by `filter()`: `hasText` and `hasNotText` by the text inside, `has` and `hasNot` by an element inside (a locator
or a registered path), `visible`. `hasText` matches part of the text, ignoring case: `hasText: "Lamp"` matches the
"Lamp" card and the "Desk lamp" card. To pick one item by a name, filter by the element inside that carries it, with
its exact name: a product card is `getByRole("listitem")` that `has` the heading `{ name: "Lamp", exact: true }`, a
cart row is `getByRole("row")` that `has` the cell `{ name: "Lamp", exact: true }`. Not `getByText` on the heading,
which finds the heading. `nth` is the last resort ([Several matches](#several-matches-and-one-among-them)).

A state option matches only while the element is in that state: a path with `pressed: false` matches nothing once the
toggle is pressed. Use one to find whichever element is in the state (the selected tab); to check the state of an
element, find it by its name and assert the state (`toBeChecked()`, `toBeDisabled()`).

XPath is not used. It does not reach into shadow DOM, where CSS and the `getBy` methods do; an absolute XPath in a path
matches nothing, since each segment is searched inside the one before it; and what it is used for has a Playwright
form: text by `getByText` or `filter({ hasText })`, a parent by `filter({ has })`, a position by `nth`.

A name that varies (a count, a user's name) is a RegExp in the registration (`{ name: /^Orders \(\d+\)$/ }`) or the exact
value in a query for one use. When the app lacks a role or a label a user would need, the missing accessibility is
worth reporting to its developers; meanwhile a test id is better than a long CSS path.

## The segments: how much context

A path's segments are the containers a user would name, from the outside in: a landmark (`main`, `header`,
`navigation`), a region, a form, a dialog, a table or list, an item in it. Register only as many as make the chain unique
on the page, and none of the layout elements between them. Too many segments fail on changes a user never notices;
too few find a similar element elsewhere. A segment the chain does not need may stay unregistered, as a name that
groups paths.

## The names: kind@which

- A segment names the element's kind and which one: `form@login`, `button@save`, `dialog@consent`,
  `region@payment`, `link@help`. The kind is the role (`button`, `link`, `dialog`, `region`, `heading`, `cell`), or for an
  element without one the plain kind (`card`, `badge`).
- `which` is what the element means to a user, in camelCase: `button@addToCart`, not `button@primary` or
  `button@btn3`.
- A segment that is the only one of its kind where it stands needs no `@which`: `main`, `header`,
  `main.table@orders.caption`.
- Plural or singular by what the segment's registration matches in its scope: several cards in the list,
  `main.list@products.cards`; one, `main.list@products.card`. A segment below a plural one names what each of them
  holds: `main.list@products.cards.button@addToCart`, one button per card. A query that later picks one of the matches
  leaves the path plural: `getByRole("cell")` in a row is `rows.cells`, whichever cell a query narrows it to.
- One of several gets a path of its own only when many tests use it: a filter or `nth` on a path that reuses the plural
  one, named by what it matches (`main.list@products.card@lamp` for one lamp, `main.list@products.cards@lamp` for
  several); otherwise a query picks it where it is used.
- Shared parts get one form across the project: every dialog `dialog@<name>`, every page's heading `main.heading`.
- Write paths in full; compose them from a `const` array only for an element repeated for several known values.

## Several matches, and one among them

Register the repeated element once and pick one in a query, by what identifies it: a row by the exact name of the cell
that names it (its row header, or one of its cells: [a table](#worked-example-a-table)), a card by its heading's exact
name (`has`), or by a text no other item contains (`hasText`, with `hasNotText` to leave out a similar one)
(`references/resolving-and-queries.md`). An index is the last resort, for a chain that cannot be made unique
otherwise.

## Worked example

A checkout page: a header with a cart link; in `main`, a "Delivery" form with labeled fields and a "Continue" button;
an order summary region whose total has no label; a cookie dialog.

| element | path | registration |
| --- | --- | --- |
| the header | `header` | `getByRole("banner")` |
| its cart link | `header.link@cart` | `getByRole("link", { name: "Cart" })` |
| main content | `main` | `locator("main")` |
| the delivery form | `main.form@delivery` | `getByRole("form", { name: "Delivery" })` |
| its postcode field | `main.form@delivery.input@postcode` | `getByLabel("Postcode")` |
| its continue button | `main.form@delivery.button@continue` | `getByRole("button", { name: "Continue" })` |
| the summary | `main.region@summary` | `getByRole("region", { name: "Order summary" })` |
| its total | `main.region@summary.text@total` | `getByTestId("order-total")` |
| the cookie dialog | `dialog@consent` | `getByRole("dialog", { name: "Cookies" })` |
| its accept button | `dialog@consent.button@accept` | `getByRole("button", { name: "Accept all" })` |

The total uses a test id because the summary shows it as a bare number with no label of its own; everything else is
found the way a user finds it. The dialog is not under `main`: it sits at the page's top level.

## Worked example: a table

A cart: a table named "Cart" whose rows hold a product's name, its quantity and a "Remove" button, in plain cells, with
no row header; "Lamp" and "Desk lamp" can both be in it.

| element | path | registration |
| --- | --- | --- |
| the table | `main.table@cart` | `getByRole("table", { name: "Cart" })` |
| its rows | `main.table@cart.rows` | `getByRole("row")` |
| each row's cells | `main.table@cart.rows.cells` | `getByRole("cell")` |
| each row's quantity | `main.table@cart.rows.cell@quantity` | `getByRole("cell").nth(1)` |
| each row's remove button | `main.table@cart.rows.button@remove` | `getByRole("button", { name: "Remove" })` |

A row is picked by the cell that names it: a query narrows `rows.cells` to the cell with the product's exact name
(`update().getByRole({ name: "Lamp", exact: true })`) and filters the rows by it with `has`, as `SKILL.md`'s orders
example does with its row header. The path stays `cells`, since its registration matches every cell. Where the table
has row headers, the row's header is `rows.rowheader`, one per row. The quantity is what tests check, so its text
cannot find it: a test id where the app has one, otherwise its column, `nth(1)`, singular since it matches one cell per
row; here the index is how a user reads the table, by its columns.
