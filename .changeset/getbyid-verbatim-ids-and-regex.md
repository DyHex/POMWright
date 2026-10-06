---
"pomwright": major
---

### Breaking changes

`getById` now matches ids the way the DOM has them, and evaluates RegExp ids as real patterns.

- String ids are matched verbatim and case-sensitively and resolve as `[id="…"]`. Ids containing `.`, `:`, `[`, `]`,
  spaces, quotes, backslashes, or a leading digit now work.
- The `#` and `id=` prefixes are no longer stripped. `getById("#login")` now looks for `id="#login"`. Find stale call
  sites with:

  ```sh
  grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts .
  ```

- RegExp ids are evaluated as regular expressions with their flags. In 2.x the regex source was matched as literal
  substring text, so plain unanchored patterns such as `/btn-submit/` behave the same, while metacharacters (`.`,
  `[`, `(`, `+`, `*`, `?`, `^`, `$`, `|`) and flags now take effect: escape characters meant literally (`/a\.b/`)
  and anchor with `^` and `$` for whole-id matches. The rendered selector changes from `[id*="…"]` to
  `internal:attr=[id=/…/]`.
- RegExp flags pass through to Playwright unchanged, as with Playwright's own locators. The sticky `y` flag acts as a
  start anchor on Playwright 1.64 and later and is unreliable before that (Playwright bug fixed in
  microsoft/playwright#42818); prefer `^`.
- `getById("")` throws at registration, naming the registry path.
- The rendered selector for string ids changes from `locator('#x')` to `locator('[id="x"]')`.
