---
"pomwright": patch
---

`getById` with a `u` or `v` RegExp that holds a quote, an apostrophe, a backtick or `>>` finds its element; before, it
failed with Playwright's selector parse error. The selector writes those characters by their code (`\x22`, `\x27`,
`\x60`, and `\x3e` for the second `>`), and the pattern stays the same. The locators Playwright builds itself
(`getByRole`'s `name`, the text methods, `getByTestId`, `filter`'s `hasText`) keep Playwright's limitation, which every
POMWright locator meets because its description follows it: write the character by its code (`/don\x27t save/iu`) or
leave out `u` ([microsoft/playwright#40446](https://github.com/microsoft/playwright/issues/40446)).
