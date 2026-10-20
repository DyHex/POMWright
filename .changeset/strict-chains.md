---
"pomwright": minor
---

### Features

- Opt-in `strictChains`: `createRegistryWithAccessors(page, { strictChains: true })` and the `PageObject` constructor
  option `locators: { strictChains: true }` make `verify()` require every ancestor of every registered path to be
  registered, and name every one that is not, one line per path:
  `"main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button"
  are not.` A page object checks it right after `defineLocators()`; a standalone registry when it calls `verify()`.
  The option is a boolean, `false` by default; without it nothing changes, and an unregistered segment stays a name
  that groups paths and is left out of the chain. `skip` and `unskip` work in both modes; under the
  option an any-frame `frameLocator()` is a root path. No migration.
