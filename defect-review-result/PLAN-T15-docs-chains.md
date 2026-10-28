# Plan 31: a docs-chains spec

- **Decisions**: [DECISIONS.md](DECISIONS.md) #59 (point 3)
- **Findings**: none (test gap #15's chains part)
- **Bump**: none
- **Stop**: no
- **Depends on**: plan 27 (the shape of packed specs); after every plan that changes a page's chains (7–26, 30)

## Contract

Every rendered locator chain the documentation shows in a `text` block or a comment is rebuilt by a harness spec through
the packed package and compared, so a change to a chain fails until the spec and the page are updated together
(AGENTS.md §9: every chain a page shows is copied from a probe).

## Current behaviour

Nothing re-probes the chains pages show; they were copied from probes when written and are checked by eye since.

## Steps

1. Inventory: list every chain the site and the README show (grep `text` blocks and `// locator(…)`-style comments for
   `locator(`, `getBy`, `contentFrame`, `internal:`), with page and line, in *Execution notes*.
2. `test/tests/docs/docsChains.spec.ts` (new): one test per page (titled with the page's path), which builds each
   example's registry or page object on a blank page (`page.setContent` of an empty document; a chain renders without
   matching anything) through `pomwright`'s public API and asserts `locator.toString()` (or `${locator}`) equals the
   chain string, kept as data at the top of the test with a comment naming the page and the block. Strings that depend on
   the Playwright version (AGENTS.md §4) are pinned to the harness's Playwright; the latest-1.x CI rows run the same
   spec, so a new rendering shows there first.
3. Where a page shows a chain that hides an option (AGENTS.md §9: "where a rendered string hides an option, the stored
   record is read instead"), the spec asserts what the public API can show (`getLocatorSchema`'s chain, the DOM on a
   small fixture) and the inventory says so.
4. **Docs**: AGENTS.md §9: the chains a page shows are checked by `docsChains.spec.ts`, which changes with the page;
   AGENTS.md §4 lists the spec; *Internal → Tests and checks*.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build` if a page's chain was found stale and corrected (a stale
chain is unexpected: correct it in this plan and report it).

## Commit

```text
test: every chain the docs show is rebuilt and compared

Plan: defect-review-result/PLAN-T15-docs-chains.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Step 1, the inventory (`text` blocks and code comments of `website/src/content/docs` and the README with
  `locator('`, `getBy…(`, `contentFrame()`, `internal:` or `frameLocator()`): 102 lines in 18 pages and the README,
  plus four the pattern did not catch: `// selector: [id="order-summary"]` (*LocatorUpdateBuilder*), the strict mode
  errors of *Frames* (one line) and *Resolving locators* (four lines, Playwright's `aka` chains):
  - api/class-locatorquerybuilder.md:36 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').filter({ hasText: 'Open' }).last()`
  - api/class-locatorquerybuilder.md:59 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li')`
  - api/class-locatorquerybuilder.md:62 [ts]: `locator('main').locator('ul').locator('li').first()`
  - api/class-locatorquerybuilder.md:166 [ts]: `locator('li').first().last()`
  - api/class-locatorquerybuilder.md:187 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()`
  - api/class-locatorquerybuilder.md:210 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').nth(2)`
  - api/class-locatorquerybuilder.md:250 [ts]: `locator('main').getByRole('list', { name: 'Orders' }).filter({ hasText: 'Orders' }).locator('li').first()`
  - api/class-locatorquerybuilder.md:287 [ts]: `locator('main').locator('li').first()`
  - api/class-locatorquerybuilder.md:326 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()`
  - api/class-locatorquerybuilder.md:360 [ts]: `locator('main').getByRole('button', { name: 'Cancel', exact: true })`
  - api/class-locatorquerybuilder.md:363 [ts]: `locator('main').getByRole('button')`
  - api/class-locatorregistry.md:135 [ts]: `getByRole('listitem')`
  - api/class-locatorregistry.md:169 [ts]: `locator('main').locator('ul').getByRole('listitem').last()`
  - api/class-locatorregistry.md:203 [ts]: `locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })`
  - api/class-locatorupdatebuilder.md:96 [ts]: `locator('main').locator('iframe#card').contentFrame().getByRole('button', { name: 'Confirm' })`
  - api/class-locatorupdatebuilder.md:104 [ts]: `frameLocator().getByRole('button', { name: 'Confirm' })`
  - api/class-locatorupdatebuilder.md:133 [ts]: `locator('main').getByAltText(/logo/i)`
  - api/class-locatorupdatebuilder.md:135 [ts]: `locator('main').getByAltText('Visa')`
  - api/class-locatorupdatebuilder.md:157 [ts]: `selector: internal:attr=[id=/^summary/]`
  - api/class-locatorupdatebuilder.md:181 [ts]: `locator('main').getByLabel('E-mail')`
  - api/class-locatorupdatebuilder.md:183 [ts]: `locator('main').getByLabel('Email address')`
  - api/class-locatorupdatebuilder.md:205 [ts]: `locator('main').getByPlaceholder('Search', { exact: true })`
  - api/class-locatorupdatebuilder.md:207 [ts]: `locator('main').getByPlaceholder('Search products')`
  - api/class-locatorupdatebuilder.md:228 [ts]: `locator('main').getByRole('button', { name: 'Pay now', exact: true })`
  - api/class-locatorupdatebuilder.md:230 [ts]: `locator('main').getByRole('button', { name: 'Pay' })`
  - api/class-locatorupdatebuilder.md:232 [ts]: `locator('main').getByRole('link')`
  - api/class-locatorupdatebuilder.md:234 [ts]: `locator('main').getByRole('link', { name: 'Pay' })`
  - api/class-locatorupdatebuilder.md:261 [ts]: `locator('main').getByTestId('cart-item')`
  - api/class-locatorupdatebuilder.md:263 [ts]: `locator('main').getByTestId(/cart-/)`
  - api/class-locatorupdatebuilder.md:283 [ts]: `locator('main').getByText('Total')`
  - api/class-locatorupdatebuilder.md:285 [ts]: `locator('main').getByText('Pay', { exact: true })`
  - api/class-locatorupdatebuilder.md:306 [ts]: `locator('main').getByTitle('Help', { exact: true })`
  - api/class-locatorupdatebuilder.md:308 [ts]: `locator('main').getByTitle('More help')`
  - api/class-locatorupdatebuilder.md:329 [ts]: `locator('main').locator('ul').filter({ hasText: 'Cart' })`
  - api/class-locatorupdatebuilder.md:331 [ts]: `locator('main').locator('ol')`
  - api/class-locatorupdatebuilder.md:333 [ts]: `locator('main').locator('ol.cart')`
  - api/class-registrationbuilder.md:19 [ts]: `main.list.item: locator('main').locator('ul.orders').getByRole('listitem').filter({ hasText: 'Open' }).first()`
  - api/class-registrationbuilder.md:65 [ts]: `locator('div.shell').locator('iframe#payment').contentFrame().getByRole('button', { name: 'Pay' })`
  - api/class-registrationbuilder.md:69 [ts]: `frameLocator().getByRole('button', { name: 'Accept' })`
  - api/class-registrationbuilder.md:110 [ts]: `getByAltText('Shop logo')`
  - api/class-registrationbuilder.md:139 [ts]: `selector: internal:attr=[id=/^button\.submit\.[a-z0-9]{4}$/i]`
  - api/class-registrationbuilder.md:172 [ts]: `getByLabel('Email', { exact: true })`
  - api/class-registrationbuilder.md:198 [ts]: `getByPlaceholder('Search')`
  - api/class-registrationbuilder.md:224 [ts]: `getByRole('button', { name: 'Save' })`
  - api/class-registrationbuilder.md:259 [ts]: `getByTestId('order-row')`
  - api/class-registrationbuilder.md:285 [ts]: `getByText(/failed/i)`
  - api/class-registrationbuilder.md:313 [ts]: `getByTitle('More information')`
  - api/class-registrationbuilder.md:338 [ts]: `locator('ul.orders')`
  - api/class-registrationbuilder.md:467 [ts]: `getByRole('listitem').last()`
  - api/class-registrationbuilder.md:498 [ts]: `locator('main').locator('ul').getByRole('listitem').filter({ hasText: 'Open' }).last()`
  - api/class-registrationbuilder.md:515 [ts]: `getByRole('button', { name: 'Cancel', exact: true })`
  - api/class-registrationbuilder.md:517 [ts]: `getByRole('link')`
  - api/class-reusablelocator.md:22 [ts]: `locator('table').locator('tr').first()`
  - api/class-reusablelocator.md:24 [ts]: `locator('table').locator('tr').filter({ hasText: 'Open' })`
  - api/class-reusablelocator.md:26 [ts]: `locator('table').locator('tr').filter({ hasText: 'Open' }).last()`
  - api/class-reusablelocator.md:104 [ts]: `getByRole('heading', { level: 2 }).filter({ hasText: 'Orders' })`
  - docs/descriptions.md:81 [ts]: `getByRole('button', { name: 'Submit' })`
  - docs/filters-and-indices.md:40 [ts]: `locator('section').filter({ hasText: 'Orders' }).getByRole('listitem').filter({ hasText: 'Open' })`
  - docs/filters-and-indices.md:61 [ts]: `locator('main').locator('section').filter({ has: getByRole('heading', { name: 'Orders' }) })`
  - docs/filters-and-indices.md:62 [ts]: `.getByRole('listitem').filter({ hasText: 'Open' })`
  - docs/filters-and-indices.md:149 [ts]: `locator('li').filter({ hasText: 'Open' }).first().filter({ hasNotText: '#9' })`
  - docs/frames.md:52 [ts]: `locator('main').getByRole('region', { name: 'Payment' }).locator('iframe').contentFrame().getByLabel('Card number')`
  - docs/frames.md:82 [ts]: `locator('.widgets').locator('iframe').nth(1).contentFrame().getByRole('button', { name: 'Go' })`
  - docs/frames.md:112 [ts]: `frameLocator().getByRole('button', { name: 'Accept' })`
  - docs/locating-by-id.md:44 [text]: `getById("settings.panel")   →  [id="settings.panel"]`
  - docs/locating-by-id.md:45 [text]: `getById('say "hi"')         →  [id="say \"hi\""]`
  - docs/locator-modules.md:331 [text]: `locator('main').getByRole('list', { name: 'Products' }).getByRole('listitem').filter({ has: getByText('Sale', { exact: true }) })`
  - docs/locator-paths.md:171 [text]: `locator('main').getByRole('region', { name: 'Order' }).getByRole('region', { name: 'Mobile subscription' }).getByRole('button', { name: 'Edit' })`
  - docs/queries.md:48 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').last()`
  - docs/queries.md:98 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).filter({ hasText: 'Open' }).locator('li').first()`
  - docs/queries.md:101 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first().last()`
  - docs/queries.md:145 [ts]: `locator('main').getByRole('list', { name: 'Orders' }).filter({ hasText: 'Orders' }).locator('li').first()`
  - docs/queries.md:180 [ts]: `locator('main').getByRole('article', { name: 'Desk lamp' }).getByRole('button', { name: 'Remove from wishlist' })`
  - docs/queries.md:211 [ts]: `locator('main').locator('li').first()`
  - docs/queries.md:214 [ts]: `locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()`
  - docs/registering-locators.md:49 [ts]: `locator('section.cart').filter({ hasText: 'Total' })`
  - docs/registering-locators.md:51 [ts]: `getByText('Total', { exact: true })`
  - docs/registering-locators.md:71 [ts]: `getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last(), described "Last matching row"`
  - docs/registering-locators.md:148 [ts]: `getByRole('button', { name: 'Save' })`
  - docs/registering-locators.md:172 [ts]: `throws; list.item stays getByRole('listitem').first()`
  - docs/resolving-locators.md:64 [ts]: `locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })`
  - docs/resolving-locators.md:115 [ts]: `getByRole('dialog', { name: 'Session expired' }).locator(getByRole('button', { name: 'Log in' }))`
  - docs/resolving-locators.md:157 [ts]: `locator('main').getByRole('list', { name: 'Orders' }).getByRole('listitem'): every order`
  - docs/resolving-locators.md:159 [ts]: `locator('main').getByRole('list', { name: 'Orders' }).getByRole('listitem').first(): one order`
  - docs/resolving-locators.md:207 [ts]: `locator('main').getByRole('table', { name: 'Cart' }).getByLabel('Quantity'): 3 inputs, the aside's is not one`
  - docs/resolving-locators.md:231 [ts]: `getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })`
  - docs/reusing-locators.md:38 [ts]: `locator('ul').getByRole('listitem').last(), described "Last item"`
  - docs/reusing-locators.md:41 [ts]: `getByText('Invalid password'), described "main.form.error@invalidPassword"`
  - docs/reusing-locators.md:71 [ts]: `locator('tr')`
  - docs/reusing-locators.md:72 [ts]: `locator('tr').first()`
  - docs/reusing-locators.md:73 [ts]: `locator('tr').last()`
  - docs/reusing-locators.md:92 [ts]: `getByRole('heading', { name: 'Summary', level: 2 })`
  - docs/reusing-locators.md:94 [ts]: `getByRole('link'): the role replaced, the options cleared`
  - docs/reusing-locators.md:96 [ts]: `getByRole('heading'): the level deleted`
  - docs/reusing-locators.md:122 [ts]: `getByRole('heading', { name: 'Summary', level: 2 }).filter({ hasText: 'Summary' }).first(),`
  - docs/reusing-locators.md:123 [ts]: `as getByRole({ name: "Summary" }).filter({ hasText: "Summary" }).nth(0) in one chain`
  - docs/upgrading-from-2x.md:105 [ts]: `3.0.0: locator('iframe').nth(1).contentFrame().getByRole('button', { name: 'Pay' })`
  - docs/upgrading-from-2x.md:234 [ts]: `locator('main').getByRole('listitem')`
  - docs/upgrading-from-2x.md:256 [ts]: `2.x:   table.row@last resolved to locator('table').locator('tr').first().last(), the first row`
  - docs/upgrading-from-2x.md:257 [ts]: `3.0.0: table.row@last resolves to locator('table').locator('tr').last()`
  - internal/resolution.md:55 [text]: `locator('main').locator('section').filter({ has: getByRole('heading', { name: 'Orders' }) })`
  - README.md:110 [text]: `locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })`
- Not rebuilt, with the reason: `docs/upgrading-from-2x.md:256`, the 2.x chain (`…first().last()`), which 3.x cannot
  produce; `docs/reusing-locators.md:123`, a second comment line that is code, not a chain;
  `docs/registering-locators.md:111-122`, the duplicate-registration message, whose `"has": "locator('b')"` is a message
  detail (`add.spec.ts` and its twin assert it, and plan 30's check covers the message).
- Step 2: `test/tests/docs/docsChains.spec.ts`, one test per page titled with its path (18 tests), each building the
  page's registry or page object as the page writes it (shared ones as helpers: the orders registry of *Queries* and
  the query page, the login registry), on the test's blank page, and comparing each chain with `expect.soft`, so one run
  names every stale chain of a page. **Not as the plan wrote**: a resolved locator prints its description (the path by
  default) in `toString()`, so the chain is `${locator.describe("")}`, as the packed twins compare it (probe: `${nested}`
  is `"Orders list"`, `${nested.describe("")}` is `"locator('main').locator('ul')"`); *Descriptions*' own example calls
  `toString()` after a query's `describe("")`, and that is asserted as written. A selector a page shows alone
  (`[id="settings.panel"]`, `internal:attr=[id=/^summary/]`) is compared through `page.locator(selector)`, which Playwright
  prints as it prints the registry's. The two strict mode errors are reproduced on a small DOM (`page.setContent`):
  their first lines, and *Resolving locators*' three `aka` chains, match the pages.
- Result: every chain matched on the first run; no page was stale. A planted wrong chain
  (`locator('li').nth(0)` for `.first()`) failed both pages that show it, naming expected and received.
- **Not predicted**: on Firefox, Playwright's strict mode error lists two elements and then `...` (playwright-core 1.64,
  `_generateSelectors`: `maxElements = this._isUtilityWorld && this._browserName === "firefox" ? 2 : 10`), so
  *Resolving locators*' third `aka` line is Chromium's and WebKit's; it failed 6 of 6 repeats on Firefox and passed on
  the others. The spec expects `    ...` there through `browserName` (AGENTS.md §4); the page is unchanged, since it
  shows what Chromium and WebKit print and the difference is Playwright's.
- During the work the spec ran through `playwright test` only, which does not type-check; `pack-test`'s `tsc` then
  rejected `skip("main")` on a query taken through a helper typed with the whole path union (a union of query paths has
  no sub-path in common). The query is taken with the literal path, as the page does.
- Step 3: no chain on the pages hides an option the rendering drops; nothing needed the stored record.
- Seen, outside the contract (`text` blocks and comments): 9 chains in running prose, in inline code:
  `docs/descriptions.md:38`, `:39`, `:90`; `docs/first-page-object.md:125`, `:130`, `:133`; `docs/frames.md:61`;
  `internal/resolution.md:52`, `:58` (the other 7 inline hits are method names such as `locator.contentFrame()`).
  Reported at the stop; at the maintainer's request they were added in a further commit: the call log's
  `waiting for …` and the strict mode line of *Descriptions* and *Your first page object* from an action on the blank
  page (500 ms) and on two buttons, a locator chained further (`locator('main').locator('li')`, printed without
  `describe("")`, since it has no description), the frame segment as a terminal, and the heading path alone and as a
  chain starting at `locator('main')`. All 9 matched on the three browsers (19 tests each); a planted wrong count
  (`resolved to 3 elements`) failed. AGENTS.md §4 and §9 and the two Internal pages say "a `text` block, a code comment
  or the running text".
- Step 4: AGENTS.md §4 (`docs/`, 86 spec files, about 14,000 lines) and §9; *Internal → Documentation* (*The code
  decides*) and *Internal → Tests and checks*.
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,421 passed, the 18
  page tests on each of three browsers among them, 3 skipped; doc snippets 223; api coverage 0 problems; error
  messages 0 problems; step locations 31); `pnpm docs:build` 0.
