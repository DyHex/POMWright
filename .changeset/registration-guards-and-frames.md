---
"pomwright": major
---

### Breaking changes

The locator registry mirrors Playwright more closely: frames are the `<iframe>` element plus `contentFrame()`, every
strategy's first argument is checked where it is written, `update` is a patch of the registered definition and
`replace` a new one, and a page object verifies its registry after `defineLocators()`.

- `filter`, `nth`, `first` and `last` on a `frameLocator(selector)` segment now apply. 2.x recorded them and dropped
  them at resolution; when it mattered, the action failed with a strict mode violation naming the frame selector. A
  frame segment resolves as `locator(selector)`, then its steps, then `contentFrame()` for the descendants, and the
  `<iframe>` element itself when it is the last segment or a `has`/`hasNot` reference (what `owner()` gave). A
  step-less frame renders exactly as before; a stepped one renders `locator('iframe').nth(1).contentFrame()…`.
  Migration: `grep -rn 'frameLocator(' --include=*.ts .` and review every chain that follows with `.nth(`, `.filter(`,
  `.first(` or `.last(`. Prefer telling frames apart through their ancestor segments; `filter({ hasText })` on an
  iframe element never matches.
- `update()` keeps the registered strategy and throws, naming `replace()` and the right method, for another one; the
  builder-local cache that restored an earlier strategy's definition is gone. `replace()` changes the strategy and,
  like `update()`, keeps the recorded steps and the description. Migration: rename cross-strategy
  `update(...).<method>(...)` calls to `replace` and state the first argument.
- `update()` follows JSON Merge Patch: `null` deletes an option (`{ name: null }`) or every option
  (`getByRole("button", null)`, `getByRole(null)`); `undefined` and absent values leave the options alone. So
  `update(x, undefined)` no longer wipes the options and `{ key: undefined }` no longer removes a key. Migration:
  `grep -rn 'update(' --include=*.ts . | grep undefined` and use `null`.
- Every builder (`add`, a seeded `add`, `createReusable`, `update`, `replace`) throws at the call when the strategy's
  first argument is missing, naming the method and the path (`getByRole requires a role value for "main.button".`),
  and when it is an empty string for `locator`, `frameLocator` and `getByRole`, which Playwright cannot use
  (`getById("")` already threw). `getByTestId("")` and the text-likes store the empty string, which Playwright
  matches. 2.x registered `getByTestId("")` and `frameLocator("")` without their value and failed at resolution, a
  seeded `getByTestId("")` silently inherited, and an options-only `getByRole` from JavaScript registered without a
  role.
- `filter`, `nth` and `describe` before a strategy no longer compile; at runtime the message names the method and the
  strategies to call first.
- A seeded registration whose override throws keeps the seeded definition instead of being unregistered. A throwing
  DSL call never changes the registry.
- `PageObject` verifies every registered path right after `defineLocators()`, so a mistyped `has`/`hasNot` path
  reference or a cycle fails at construction, with every failing path listed, instead of at the first action that
  resolves it. Registration itself is unchanged: forward references stay allowed.

### New

- `add(path).frameLocator()` with no selector registers Playwright's any-frame locator (`page.frameLocator()`,
  Playwright 1.63 and later; the peer floor is 1.64): the descendants resolve in whichever single frame holds them,
  the main frame included. It must be the first segment of its chain, takes no steps and has no terminal form;
  `replace().frameLocator()` installs it on a sub-path.
- `registry.verify()` on every registry and in the public `LocatorRegistry` type, for standalone registries from
  `createRegistryWithAccessors`.

### Fixes

- Steps on frame segments are no longer dropped (analysis 1.6, 3.2).
- A registration, seed, update or replacement without its first argument no longer registers and fails later
  (analysis 1.8).
- `update(x, undefined)` no longer wipes the registered options (analysis 1.8).
- `filter`, `nth` and `describe` before a strategy are compile errors with a runtime message that says what to call
  first (analysis 1.9e).
- A seeded registration is no longer unregistered by a wrong-type override (analysis 1.10).
