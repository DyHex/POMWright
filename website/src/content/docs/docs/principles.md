---
title: Principles
description: "The ideas POMWright is built on: mirror Playwright, one locator per path, nothing changes behind your back, fail early, check at runtime."
---

These are the rules POMWright's design follows. Knowing them makes its behavior predictable. Where a page seems to
break one of them, it says why.

## Mirror Playwright, add only what it lacks

POMWright adds to Playwright and changes none of it. A registered locator is a call of Playwright's own method with
Playwright's own arguments (`getByRole("button", { name: "Log in" })`), steps are Playwright's `filter` and `nth`, a
resolved path is an ordinary `Locator`, URLs resolve as Playwright resolves `baseURL`, waits are Playwright's waits with
Playwright's timeouts, steps are `test.step`, storage is `page.sessionStorage`. What POMWright adds is what Playwright
does not have: names for locators, chains built from those names, page objects that check themselves, typed session
storage that can be filled before an app loads, and a logger for the report. The docs explain each feature through the
Playwright feature it builds on.

## One locator per path, chained by default

Each element gets a path that says where it is (`main.form@login.button@login`) and one locator that says what it is
(`getByRole("button", { name: "Log in" })`). Resolving a path chains the locators of its segments, so a locator stays
short and is still unique in its context, and a page whose structure changes fails the test instead of letting it find
a similar element elsewhere. See [Resolving locators](/POMWright/docs/resolving-locators/).

## Nothing changes behind your back

A registered locator never changes after `add()`: a registration ends with its chain, at the next call on the registry,
the registry keeps copies of the objects you pass, and every resolution works on its own copy. A query
(`getLocatorSchema(path)`) is a private copy of a path's chain, changed for one use. A seed from `createReusable` is a
value: its methods return new seeds, as a Playwright `Locator`'s do. So code that tweaks a locator for one test cannot
change it for the next. See [Queries](/POMWright/docs/queries/) and
[Reusing locators](/POMWright/docs/reusing-locators/).

## Fail early, at fixture setup

A mistake is reported where it is made, as early as it can be found. A missing first argument, or an empty one where
Playwright cannot use it, throws at the call that registers it. A page object checks its URL when it is constructed,
and its locators right after, so a broken page object fails the test in the fixture, before the body runs, naming the
page object and every path at fault. See
[Verifying a registry](/POMWright/docs/verifying-registries/) and [Page objects](/POMWright/docs/page-objects/).

## Check at runtime; types where they cost nothing

Every rule about a value is checked at runtime, so a value from a variable, an environment or JavaScript code is
checked like a literal. TypeScript adds what it can check for free: paths that are not in the union, misspelt `has`
references, a `replace()` without its first argument. The rules about types themselves are TypeScript's alone, since
types do not exist at run time: a storage schema's type and its value agree, and `createRegistryWithAccessors` takes
its paths as a type argument. POMWright does not add a type that would make ordinary code harder to write in
exchange for an error the runtime reports anyway.

## No hidden state, one meaning per method

Each method does one thing and says so. `update` patches a definition and keeps its strategy; `replace` installs a new
one. `skip` leaves a segment out of one query and deletes nothing. `null` deletes an option, and `undefined` means "not
given", as in Playwright. POMWright sets no timeout or wait of its own: an unset option means Playwright's default.

## What POMWright does not do

It has no runner, no reporter and no assertions: tests use `@playwright/test`. It does not wait for anything Playwright
would not wait for, retry anything a test asked it to do, or catch errors to hide them. When a navigation replaces the
document while POMWright asks the page a question of its own, such as whether the browser has the Navigation API before
a `seed`, or where the page went for a navigation message, it asks again in the next document, up to 20 times, after
the same pauses Playwright makes before it retries one of its own actions. It does not decide how you structure a suite
beyond the page object and the registry; [Organizing a project](/POMWright/docs/organizing-a-project/) shows one way.
