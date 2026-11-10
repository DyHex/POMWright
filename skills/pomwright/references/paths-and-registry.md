# Paths and the registry

What a path is, the rules it follows, the registry that holds one locator per path, its check, and how paths follow a
page that changes. Full rules: [Paths and the registry](https://dyhex.github.io/POMWright/docs/locator-paths/) and
[Verifying a registry](https://dyhex.github.io/POMWright/docs/verifying-registries/).

## Contents

- [What a path is](#what-a-path-is)
- [Paths written out, and paths composed](#paths-written-out-and-paths-composed)
- [Segments without a locator](#segments-without-a-locator)
- [A registry without a page object](#a-registry-without-a-page-object)
- [The check: verify](#the-check-verify)
- [When the page changes](#when-the-page-changes)

## What a path is

A path is segments separated by dots, from the outside of the page inward; its ancestors are its prefixes. The union of
a page object's or a registry's paths is the list of everything it can locate, and TypeScript checks every path passed
against it and offers the paths as completions:

```ts
type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.button@login";
```

- A segment names what the element is and which one, `kind@which`, the kind being its role: `form@login`,
  `input@email`, `button@login`. The `@` is a convention, not syntax. A path that matches several elements is plural:
  `main.list@orders.items`.
- The rules, checked at compile time for a literal and at run time for every path: not empty, no dot at either end, no
  two dots in a row, no whitespace.
- Paths follow what a user would recognize (landmarks, regions, forms, dialogs, tables, lists), not the markup: a
  wrapper `div` is not a segment.

## Paths written out, and paths composed

Write every path out in full where you can: a full path is what an error message and the report show, and a text search
or a rename finds it as written. A page that repeats one element for a few known values may compose its paths from a
`const` array:

```ts
import type { LocatorRegistry } from "pomwright";

const actions = ["save", "publish", "discard"] as const;
type Action = (typeof actions)[number];
type Paths = "main" | "main.toolbar" | `main.toolbar.button@${Action}`;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.toolbar").getByRole("toolbar");
  for (const action of actions) {
    registry.add(`main.toolbar.button@${action}`).getByRole("button", { name: action });
  }
}
```

A member with an open part, `` `main.list.item@${string}` ``, accepts any value: fill it only with values without dots,
since a dot adds a segment.

## Segments without a locator

Only the paths you resolve need a locator. A segment without one is a name that groups paths, and resolution leaves it
out of the chain:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.form@login" | "main.form@login.button.submit">;

registry.add("main.form@login").getByRole("form", { name: "Log in" });
registry.add("main.form@login.button.submit").getByRole("button", { name: "Log in" });
// getNestedLocator("main.form@login.button.submit"): "main" and "main.form@login.button" are names
// getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
```

A project that wants every segment registered sets `strictChains: true` (a registry option, and a page object's
`locators` option, usually once in the app's base class); the check then reports each unregistered ancestor.

## A registry without a page object

`createRegistryWithAccessors<Paths>(page)` creates a registry on a Playwright page, for code that is not a page object
(a helper, a component used by several page objects, a quick script). The path union is a required type argument; call
`registry.verify()` once everything is registered, since no page object does it for you:

```ts
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;

type Paths = "main" | "main.button@save";
const { registry, getNestedLocator } = createRegistryWithAccessors<Paths>(page);

registry.add("main").locator("main");
registry.add("main.button@save").getByRole("button", { name: "Save" });
registry.verify();

await getNestedLocator("main.button@save").click();
```

`createRegistryWithAccessors<string>(page)` accepts any path, and gives up completions, the union check and typed
sub-paths: use it only for paths known at run time.

## The check: verify

A page object runs `defineLocators()` and then `verify()` once, right after it is constructed, so a registry mistake
fails the test in its fixture, before the body runs, with the page object's name and every failing path. `verify()`
finds a `has` or `hasNot` path that is never registered, filters that refer to each other in a loop, an any-frame
`frameLocator()` that is not the first segment, an `add(path)` that never got a locator method, and with `strictChains`
every unregistered ancestor. It does not check that a selector parses, that an element exists or is unique, or a path
in the union that is never registered and never resolved.

## When the page changes

A path says where an element is, so the paths follow the page's structure; each common change is an edit in one place,
and TypeScript and the check point at anything missed.

- **A wrapper is removed**: delete that segment's `add(…)`; the paths below it resolve again with their names
  unchanged (not under `strictChains`). To rename the paths below it too, find and replace the segment's path with its
  trailing dot, `main.section@order.region@subscriptions.` with `main.section@order.`, then remove the segment's
  member of `Paths` and its `add(…)`.
- **A wrapper is added**: rename the paths below it to include it, and register it.
- **An element moves**: replace its old path prefix with the new one.
- **An element's role, name or test id changes**: edit its one `add(…)`; every chain and every `has` through it
  follows.
- **A path gets a new name**: find ``(["'`])main\.list(["'`.])`` and replace with `$1main.items$2`, regular expressions
  on; it renames the path and every path below it in any quotes, and leaves `main.listArchive` alone.
- **A variant of the page for one test**: no registry change; the test leaves the segment out of its query with
  `skip` (the queries reference, `references/resolving-and-queries.md`).

Once `Paths` is edited, every use of an old path is a compile error, and a `has` path left behind fails the check. See
[When the page changes](https://dyhex.github.io/POMWright/docs/locator-paths/#when-the-page-changes).
