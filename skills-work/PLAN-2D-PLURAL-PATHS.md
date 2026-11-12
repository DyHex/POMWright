# PLAN-2D-PLURAL-PATHS: the docs' examples name paths as the skills do

Status: **executed 2026-11-12** (the maintainer's go, 2026-11-12, with Q1 and Q2 unanswered: taken as recommended,
no changeset and one short paragraph on *Locator paths*; see *Execution notes*). Widened 2026-11-12 to every naming
decision made for the skills. Follows PLAN-2C (the plural rule in the skills) and PLAN-6B steps 4 to 8 (the names).
The file keeps its name so the references to it hold.

## The maintainer's decisions

- **Plural and singular** (2026-11-10): "Everything should match the plural rule, that's what makes it a rule or at
  least a suggestion of practice": the README, the site and the doc comments name paths as the skills do.

  The rule, as the skills state it: a segment that matches several elements in its scope is plural
  (`main.list@products.cards`), one that matches one is singular (`main.list@products.card`); a segment below a plural
  one names what each of them holds (`main.list@products.cards.button@addToCart`); one of several with a path of its
  own is named by what it matches (`card@lamp` for one, `cards@lamp` for several), and one picked by index is singular
  (`item@first`). What a segment matches is read from its registration in the example, not from its name.
- **Names are a convention** (2026-11-11), which a project records in its `POMWRIGHT.md`; other conventions are not
  wrong. The site already says "the `@` is a convention, not syntax" (*Locator paths*). The skills' default, which the
  examples follow:
  - **Paths a user can relate to**, as users see and read the page.
  - **The kind says what the element does**, not its tag or role: `input` for any field, `dropdown` for a select or a
    combobox, `button`, `link`, `checkbox`, `radio`, `dialog`, `header`, `section`, `text` (a price, a total); landmarks
    and containers by the names readers know (`main`, `footer`, `navigation`, `heading`, `form`, `table`, `list`); an
    element without a role takes a plain kind (`card`, `badge`).
  - **`@which` is a judgment** that tells one of several alike apart, in a user's words, by what the element does or
    is for: `button@login` for a button that reads "Log in", not `button@submit`; `header.link@home` for the logo link
    that leads home. The path and the locator go together: `button` and `button@login` are different paths with
    different locators (`getByRole("button")`, `getByRole("button", { name: "Log in" })`). None for one found without a
    name, the only one of its kind (`main.status`), nor for rows and cards picked by their data.
  - **Sections are `section`**, named or not, whatever the tag (2026-11-11; confirmed 2026-11-12, Q4):
    `section@delivery`, found by `getByRole("region", { name: "Delivery" })` where it has an accessible name, or by
    its heading.
- **Not changed by this plan, with the reason:**
  - `main` by its role, `getByRole("main")`: done across the repository by PLAN-8 (78130ba). `internal/performance.md`
    keeps `page.locator("main")` in a chain it measured: changing it would misstate the measurement.
  - `override` on `pageActionsToPerformAfterNavigation()` and `defineLocators()`: the docs leave it out and say why
    (*Page objects*: "With the `noImplicitOverride` compiler option, the method needs the `override` keyword"); the
    skills' template has it; both are right.
  - Where a check lives: the skills' default (an `expect…` method on the page object for a part other tests are
    likely to check, a check one test makes in its spec) is a testing choice the skills and `POMWRIGHT.md` make; the
    README's example already has `expectStatus`, and its status cell is found by a test id, not by the status it
    holds, as the skills teach. The Docs pages show the API, not a testing style.
  - "Loaded" in `pageActionsToPerformAfterNavigation()`: *Page objects* already documents it.

## Scope

### Plural and singular (scanned 2026-11-11)

A scan of every quoted path whose segment is `row`, `item`, `card`, `cell`, `option`, `entry`, `product`, `order` or
`tab` (singular or plural) in the README, `website/src/content/docs/` and `src/` (tests aside), each with its
registration in the same file. The site already uses plurals where they apply (`list.items`, `table.rows`,
`main.list@orders.items`, `main.rows@cart`, `shared.list.items`, `menu.items`, `card.headings`), so this makes the
examples consistent, not a wholesale rename.

**Plural (a bare segment registered for every element):**

- README: `main.table@orders.row` (`getByRole("row")`), with `.button@cancel` and `.cell@status` below it, in the
  example, the chain renderings and the prose; `test/tests/docs/docsChains.spec.ts`'s README test follows.
- *Registering locators*: `list.item` (`getByRole("listitem")`).

**Singular, unchanged (the registration narrows to one):**

- `@first`, `@last`, `@third`, `@lastOpen`, `@total` paths everywhere (`nth`, or a filter to one row).
- *API → LocatorQueryBuilder* and *Queries*: `main.list.item` registered `locator("li").nth(0)`; *API →
  RegistrationBuilder*: `main.list.item` registered with `.nth(0)`; *Filters and indices*: `list.item` registered with
  `.nth(0)`; *Upgrading from 2.x*: `list.item` with `.nth(0)`; *API → LocatorRegistry*: `main.list.item@open` with
  `.nth(0)`; *Queries*: `main.product@lamp` (`getByRole("article", { name: "Desk lamp" })`).

**Read in context at execution** (plural only if the example's page has several that match):

- *Filters and indices*: `main.section@orders.item@open` and `section@orders.item@open` (a `hasText: "Open"` filter),
  `list.item@withBadge`, `@withBadgeInCard`, `@withBadgeLocator` (a `has` filter), `card` (`locator(".card")`).
- *Registering locators*: `list.item@open` (a `has` filter).
- *API → RegistrationBuilder*, *API → errors*, `src/locators/locatorRegistrationBuilder.ts`: `main.row@order`
  (`getByTestId("order-row")`).
- *Reusing locators*: `card` (`locator("article")`).
- Paths with no registration on their page, named in prose, a message or a query: `main.list.item` (*Locator paths*,
  *Registering locators*, *Reusing locators*, *Upgrading from 2.x*, *API → errors*), `shell.list.item`,
  `list.item@open`, `main.list.item@null` (*API → errors*, *API → LocatorQueryBuilder*), `main.items` (*Locator
  paths*), `card` (*Test steps*), and the doc comments of `src/locators/locatorQueryBuilder.ts` (`main.list.item`, 15
  times, in query examples that filter it to one). In a query example the registered path is the repeated element,
  picked by the query, so it is plural (`registry.getLocatorSchema("main.list.items").filter({ hasText: "#1042" })`),
  unless the page registers it narrowed to one.

### Names (scanned 2026-11-12)

A scan of the README, `website/src/content/docs/` and the doc comments in `src/` (tests aside) for kinds named by role
or tag (`textbox`, `searchbox`, `combobox`, `spinbutton`, `select`, `banner`, `contentinfo`, `region`, `paragraph`) and
for a `@which` that names an implementation rather than what a user reads (`@submit`, `@logo`, `@primary`,
`@secondary`, `@btn`). Role names inside a registration (`getByRole("banner")` for `header`, `getByRole("contentinfo")`
for `footer`) stay: they are the locator, not the name.

**Renamed:**

- *Locating by id*: `paragraph@hash` and `paragraph@intro` become `text@hash` and `text@intro` (2 each).
- *Test steps* (`api/step.md`): `main.button@submit`, a button that reads "Log in", becomes `main.button@login` (3),
  with the step title its example shows, read in context.
- *Locator modules*: `header.link@logo`, the link named "Shop" that leads home, becomes `header.link@home` (2), as the
  skills' template names it.
- *Locator paths*: `region@subscriptions` (18), `region@subscription` (14), `region@billing` (4) and
  `region@subscriptionsArchive` (1) become `section@…` (Q4). The same example already names its
  outer region `main.section@order` (`getByRole("region", { name: "Order" })`), so today it names one role two ways;
  its strict-chains message and chain renderings are re-read from a probe, and the plural rule applies at the same
  time.

**Unchanged, read in context:**

- *Descriptions*: `main.button@submit` (8), a button that reads "Submit": the user's words.
- *API → RegistrationBuilder* and the doc comment at `src/locators/locatorRegistrationBuilder.ts` (`getById`):
  `main.button@submit`, found by an id that says `submit` and shown with no name; renamed only if its page names the
  button otherwise.
- `header.image@logo` (*API → RegistrationBuilder*, `locatorRegistrationBuilder.ts`), found by the alt text "Shop
  logo": what a user sees.
- The 79 `section@` paths and the 34 `input@` paths already follow the convention; no `textbox@`, `combobox@`,
  `select@` or `banner` path is in the docs.

**Read in context at execution:** every other `@which` on a page (an example's names, not only these words) against
the decision above, and a segment whose `@which` repeats the page's own name without telling anything apart. A name
that is a judgment either way stays.

### Registrations (scanned 2026-11-12; Q3: yes)

A blank line between each `add` call, as the skills' `POMWRIGHT.md` default (*Registrations*, the maintainer on the
map-site reference, 2026-11-11). 95 places where two `add` calls sit on adjacent lines: *Locator modules* 16, *API →
LocatorUpdateBuilder* 11, *API → RegistrationBuilder* 9, *Filters and indices* 8, *Queries* 7, *Resolving locators* 7,
*Frames* 7, *API → LocatorRegistry* 6, and others; the README and the doc comments are read for the same.

### The skills, in the same change

The skills stay the source of the convention; where this plan's wording and theirs differ, they are aligned in the
same commit. Found by matrix 3 (2026-11-12):

- The template `POMWRIGHT.md` and `guides/choosing-locators-and-paths.md` say "none for the only one of its kind",
  which judges read as a ban on `main.table@cart` found by `getByRole("table", { name: "Cart" })`; the guide's own
  table example names it so. Worded as above: none for one found without a name.

### Everywhere a path changes

Each renamed path changes everywhere its example shows it: the type, the registration, the query, the rendering, a
message on the page (*API → errors*, an API page's **Throws**), the doc comment of the same member, and
`docsChains.spec.ts`. A message a page quotes is a message the code throws for that path: a renamed path is re-read
from a probe, not edited by hand (`website/AGENTS.md`).

Not changed: tests that are not documentation (`src/**/*.test.ts`, `test/tests/**` other than the docs chain spec),
unless one copies a documented example.

## Execution

1. Read `website/AGENTS.md`, `src/AGENTS.md` and `skills/AGENTS.md`. For every path in *Read in context* (plural
   and names), read its page's example (the HTML fixture or the description) and decide; list the decisions in the
   execution notes.
2. Rename in the README, the pages and the doc comments, page by page, plural and names together, with the docs chain
   spec and any message re-read from a probe; the blank lines between registrations if Q3 says so; the convention's
   paragraph if Q2 says so.
3. The skills' wording (*The skills, in the same change*); `pnpm lint:skills`.
4. Checks: `pnpm lint`, `pnpm lint:guide`, `node scripts/check-doc-snippets.mjs`, `node
   scripts/check-api-coverage.mjs`, `node scripts/check-error-messages.mjs`, `pnpm docs:build`, `pnpm test:unit`, and
   `pnpm pack-test tests/docs/docsChains.spec.ts --reporter=line` on the three browsers, and the skills' chain spec; the
   private-name grep.
5. One commit, or two if the names and the plurals read better apart (the maintainer's call at execution).

## Questions for the maintainer

Answered 2026-11-12: **Q3** yes, a blank line between registrations in every example with two or more `add` calls;
**Q4** `section@…` for a region, named or not, whatever its tag: the consent is `section@cookieConsent`, as the
convention says. Q1 and Q2 are open.

The questions as asked:

- **Q1. Changeset.** The README and the doc comments ship in the package, but nothing a consumer's code does changes.
  `docs/versioning.md` names no rule for an example-only change. Recommended: no changeset; the alternative is a patch
  changeset "Examples name repeated elements in the plural".
- **Q2. State the convention on the site?** The site says "the `@` is a convention, not syntax" (*Locator paths*) and
  states no naming convention. Recommended: one short paragraph there, the convention as a suggestion a project may
  replace in its `POMWRIGHT.md`: `kind@which`, the kind by what the element does, `@which` in a user's words where the
  locator picks by a name, plural for several, singular for one; linking the Skills tab's `pomwright` page once
  PLAN-7 has built it. The alternative is examples only.
- **Q3. A blank line between registrations in the docs' examples?** Recommended: yes, every example with two or more
  `add` calls, so the docs read like the code the skills write; the alternative is the skills' default only, with the
  docs' examples kept compact.
- **Q4. Sections and regions.** The decision of 2026-11-11 names a section `section@…`, named or not. On 2026-11-12 the
  maintainer said the map-site reference's cookie consent, a `div` with `role="region"`, "is not a section, so region
  is correct". To a user, and to `getByRole`, a `<section>` with a name and a `div` with `role="region"` and a name are
  the same thing (role `region`), so a rule by the tag would contradict "the kind by what it does, not its tag or
  role". Probed 2026-11-12, Playwright 1.64, Chromium, Firefox and WebKit, on a hand-built page (a stand-in: it could
  hide how a real page builds its tree; the role rule is the browsers' own): `getByRole("region")` finds both, by
  their names, and the ARIA snapshot shows both as `region "…"`; a `<section>` with no name is no region at all. Recommended: `section@…` for both, the consent `section@cookieConsent`; the alternative is `region@…` for
  every element whose role is `region`, and `section@…` only for one found by its heading. The answer decides
  *Locator paths*' 37 renames and the skills' wording.

## Execution notes (2026-11-12)

- **Q1, Q2** unanswered at the go; taken as recommended: no changeset (PLAN-8, 78130ba, an example-only change across
  the repository, had none), and the convention as one paragraph on *Locator paths* after "the `@` is a convention,
  not syntax", with no link yet: PLAN-7 links the Skills tab's `pomwright` page from it once the page exists.
- **Plurals, decided in context.** Plural: the README's `main.table@orders.row` (`getByRole("row")`, 11, and the
  README test of `docsChains.spec.ts`); `main.row@order` (`getByTestId("order-row")`, a test id on every order row)
  as `main.rows@order` on *API → RegistrationBuilder*, *API → errors* and its doc comment (3); *Locator paths*'
  `main.list.item` registered `getByRole("listitem")` in its note, and `` `${base}.list.item` ``. Singular, kept:
  every `main.list.item` registered `.nth(0)` (*Queries*, *API → LocatorQueryBuilder*, *API → RegistrationBuilder*,
  *Upgrading from 2.x*, and `locatorQueryBuilder.ts`'s 15, which mirror the API page); *Registering locators*'
  `list.item`, which its example narrows with `nth(0)` (the scan read it as plural); `section@orders.item@open`, one
  open order on *Filters and indices*' page. Kept as judgments either way, with no page that decides: `list.item@open`,
  the `@withBadge…` items, `card` (*Filters and indices*, *Reusing locators*), `shell.list.item` and
  `main.list.item@null` in messages. Not paths: *Test steps*' `"card"` (a payment method).
- **Names.** As planned, with one change: *Locator paths*' rename example renamed `main.list` to `main.items`, which
  under the plural rule would make `main.items.items`; it now renames `main.list` to `main.list@orders`. Its prose
  says "section" for the Subscriptions and Billing sections. *Test steps* (`api/step.md`) keeps the method `submit()`
  and the step title `LoginPage.submit`, which *Test steps* and *Organizing a project* show for their own examples.
  Every other `@which` read: none names an implementation.
- **Blank lines (Q3):** 152 places, by a script over the `ts` blocks of the README and the pages, the example app
  (`website/snippets/`) and the doc comments' `@example` blocks (the plan's 95 counted the pages' adjacent lines
  only); the skills had none to add.
- **Messages re-read from a probe** (the packed build, Chromium, 2026-11-12): the strict-chains messages for
  `main.section@order.section@subscriptions…` and `main.list.items`, `getByTestId requires a testId value for
  "main.rows@order".`, and the compile error for `skip("main.section@order.section@subscriptions")` (tsc).
- **The skills:** the `@which` rule reads "what the locator picks it by; none for one found without a name" in the
  template, `project-decisions.md`, `choosing-locators-and-paths.md` (with `table@orders` as the named only table),
  `SKILL.md` rule 4, `paths-and-registry.md`, map-site's `from-snapshot-to-paths.md` and `skills/AGENTS.md`.
