---
"pomwright": major
---

### Breaking changes

- `getLocatorSchema(path).replace(subPath?)` takes the parameter lists of Playwright's own methods: the first argument
  is required and the options are Playwright's option types. `replace().getByRole({ name: "Save" })`,
  `replace().getByTestId()` and the other calls without a first argument, which always threw, no longer compile, and
  neither do `null` options (`replace().getByRole("button", null)` or `{ name: null }`), which meant omission.
  `replace().frameLocator()` and `replace().getByRole("button", undefined)` still compile; `update()` is unchanged.
  From JavaScript a missing first argument throws `getByRole requires a role value for "<path>".`, the message every
  other builder uses, instead of `Locator replace for "<path>" of type "role" requires a "role" value.`, and `null`
  options still mean omission. Migration: pass the first argument to `replace()` methods and drop `null` options from
  them.
- `UrlTypeOptions`, `PageObject`'s second type argument, is renamed `PageObjectTypeOptions`, since it also carries the
  `storage` schema. There is no alias. Migration: rename it in imports and constraints.
- A path literal containing U+FEFF (the byte-order mark) is a compile error; it always threw at registration.

### Features

- New type exports, so that shared locator modules, helpers and domain base classes can name what the registry hands
  out, and a project compiled with `declaration: true` can export functions that return it:
  `LocatorQueryBuilder` (what `getLocatorSchema(path)` and each step of its chain return), `LocatorUpdateBuilder`
  (what `update()` and `replace()` return), `ReusableLocator` (a seed from `createReusable`, the `reuse` option of
  `add`; `ReusableLocator<Paths, "role">` keeps the strategy, `ReusableLocator<Paths>` accepts any), `FilterDefinition`,
  `IndexSelector`, `LocatorSchemaPathFormat` (the path rules as a type) and `LocatorSchemaPathArgument` (the path
  parameter of `add` and the accessors, for a helper that forwards a path in a base class generic in its paths).

### Fixes

- The query builder's internal `applyUpdate` and `applyReplacement`, which skip the argument checks, are no longer
  reachable through its types after a chained call.
- The type-level path check rejects the same whitespace as the runtime check, U+FEFF included, and the whitespace
  error shows each character but the plain space as an escape (`main\u00A0.form`) instead of printing it invisibly.
