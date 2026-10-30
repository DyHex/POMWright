---
title: Locating by id
description: "getById: the element's id attribute matched verbatim, or a RegExp evaluated with its flags, for ids that a CSS hash selector cannot express."
---

## Introduction

Playwright has no `getById`: an id is a CSS selector away, `page.locator("#login")`. That works until an id contains
characters CSS gives a meaning to. `#settings.panel` means "id `settings` and class `panel`", `#form:user` is a
selector that does not parse, and `#1st` is invalid because a CSS identifier cannot start with a digit. Ids like these
are common in generated markup. `getById` matches the `id` attribute itself, so any id works as written.

```html
<section id="settings.panel">…</section>
<input id="form:user" />
<li id="items[0]">…</li>
<p id="#literal-hash">…</p>
<p id="1st">…</p>
```

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<
  "section@settings" | "form.input@user" | "list.item@first" | "paragraph@hash" | "paragraph@intro"
>;
// ---cut---
registry.add("section@settings").getById("settings.panel");
registry.add("form.input@user").getById("form:user");
registry.add("list.item@first").getById("items[0]");
registry.add("paragraph@hash").getById("#literal-hash"); // the "#" is part of the id
registry.add("paragraph@intro").getById("1st");
```

Each of these finds its element, where `page.locator("#settings.panel")` finds nothing.

## A string: the id as written

A string is compared with the `id` attribute verbatim and case-sensitively. There are no prefixes: `getById("#login")`
looks for `id="#login"`. The selector is an attribute selector, with quotes, backslashes and line breaks in the id
escaped for you:

```text
getById("settings.panel")   →  [id="settings.panel"]
getById('say "hi"')         →  [id="say \"hi\""]
```

## A RegExp: a pattern

A RegExp is evaluated against each element's `id` with its flags, through the attribute engine Playwright's own
`getByTestId(RegExp)` uses. An unanchored pattern matches part of an id; anchor it with `^` and `$` to match a whole
one. For buttons with the ids `button.submit.ab12`, `button.submit.CD34` and `other`:

| `getById(…)` | matches |
| --- | --- |
| `/^button\.submit\.[a-z0-9]{4}$/` | `button.submit.ab12` |
| `/^button\.submit\.[a-z0-9]{4}$/i` | both `button.submit` ids |
| `/submit/` | both `button.submit` ids |
| `/^submit/` | none |

The selector is `internal:attr=[id=/^button\.submit\.[a-z0-9]{4}$/i]`. Use a RegExp for generated ids with a
stable shape, or with `nth`, `filter`, `count()` or `all()` for every element whose id matches.

### Flags

Every flag goes to Playwright unchanged, as with Playwright's locators. `g` changes nothing about matching. `y` (sticky)
anchors at the start, because Playwright tests each id from its first character: `/foo/y` behaves as `/^foo/`, and `^`
says so more plainly.

Playwright's selector syntax needs a backslash before each quote, apostrophe and backtick of the pattern, and before
the second `>` of `>>`. `getById` adds them, reading the pattern's own escapes whole: `getById(/^say["']hi$/)` becomes
`internal:attr=[id=/^say[\"\']hi$/]`, the same pattern. Unicode mode (`u` or `v`) works with any character and does not
allow that backslash, so there `getById` writes a quote, an apostrophe or a backtick by its code (`\x22`, `\x27`,
`\x60`) and the second `>` of `>>` as `\x3e`: `getById(/^say"hi$/u)` becomes `internal:attr=[id=/^say\x22hi$/u]`, the
same pattern. The locators Playwright builds itself miss some of these (see
[Registering locators](/POMWright/docs/registering-locators/#a-regexp-in-unicode-mode)).

## Validation

An empty id throws when it is registered: an `id` attribute must have at least one character, and browsers disagree
about what `[id=""]` matches.

```text
getById requires a non-empty id for "main.form@user".
```

On a seed the message names the factory: `createReusable.getById requires a non-empty id.` A RegExp is never rejected,
and the pattern it describes never changes.

## Several matches, shadow DOM, frames

`getById` follows Playwright's rules like any locator: an action needs exactly one match, and `nth`, `filter`, `count()`
and `all()` work as usual. It finds elements in open shadow roots, not in closed ones, and inside a frame only when its
path runs through a [frame segment](/POMWright/docs/frames/).

A CSS id selector is case-insensitive in quirks mode (a page without a doctype), so there `#SETTINGS` matches
`id="settings"`. `getById` is case-sensitive in every document mode: `getById("settings")` matches `id="settings"`,
and `getById("SETTINGS")` does not.

## Reference

- [`getById()` on the registration builder](/POMWright/api/class-registrationbuilder/#getbyid)
- Playwright: [`getByTestId`](https://playwright.dev/docs/api/class-page#page-get-by-test-id), whose RegExp form uses
  the same engine; [Other locators](https://playwright.dev/docs/other-locators)
