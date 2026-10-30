---
"pomwright": patch
---

`getById` with a `u` or `v` RegExp that holds a quote, an apostrophe, a backtick or `>>` finds its element; before, it
failed with Playwright's selector parse error. The selector writes those characters by their code (`\x22`, `\x27`,
`\x60`, and `\x3e` for the second `>`), and the pattern stays the same. Without `u` or `v`, a RegExp with two quotes in
a row (`/say["']hi/`) or a named group closed right before a `>` (`/(?<g>>)>/`) failed the same way, and one with `\>`
before a `>` (`/a\>>b/`) was turned into another pattern: the pattern is now read whole, its escapes included. The
locators Playwright builds itself (`getByRole`'s `name`, the text methods, `getByTestId`, `filter`'s `hasText`) keep
Playwright's limitations, which every POMWright locator meets because its description follows it: write the character
by its code (`/don\x27t save/iu`, `/don["\x27]t save/i`), or leave out `u`
([microsoft/playwright#40446](https://github.com/microsoft/playwright/issues/40446)); *Registering locators* lists them.
