---
"pomwright": major
---

### Breaking changes

`PageObject` no longer calls its hooks from its own constructor, where the subclass has not stored anything yet, so
`defineLocators()` and `pageActionsToPerformAfterNavigation()` see the whole page object. Page objects, locator files
and fixtures are written as before.

- `defineLocators()` and the registry verification run once per page object, right after it is constructed (once
  the code that called `new` has finished: in a fixture, before the test body), or at its first locator call if that
  comes earlier. In 2.x `defineLocators()` ran inside `super(...)`, so a definition that used a constructor argument,
  a field or a constructor-body assignment registered `undefined` without a word: a lost name option, a test id such
  as `undefined-submit`, or the wrong branch of a condition. A locator module can now take page-object state as an
  extra argument: `defineLocators(this.locatorRegistry, this.locale)`.
- A registry mistake (a duplicate path, an empty selector, a `has` reference to a path that is never registered, a
  cycle) still fails the fixture before the test body, now with the page object's label in the message
  (`LoginPage: Locator registry verification failed …`, `LoginPage: defineLocators() failed: …`), the construction
  site in the stack and the original error as `cause`, but `new X(page)` itself no longer throws for it. Every later
  locator call on that page object throws the same error. Migration: a test that expects `new X(page)` to throw for a
  registry mistake asserts on a first use instead:
  `expect(() => new X(page).getNestedLocator(path)).toThrow(…)`.
- A broken page object built in `beforeEach` or `beforeAll` still fails the tests the hook runs for, but each body
  runs until its first use of that page object; in a `beforeAll` group that is not `serial`, every test of the group
  fails, where 2.x failed the first and did not run the others.
- `defineLocators()` does not see a value assigned to the page object after an `await` that follows `new`.
  Migration: pass such values to the constructor. A field initialiser that resolves a locator runs the definition
  while the class is still being built; use a getter for derived locators.
- `pageActionsToPerformAfterNavigation()` is optional, with no actions by default, and it is called each time the
  actions run (after `goto()` without a target and after `expectThisPage()`) instead of once at construction, so it
  reads the page object's current state. `[]` and `null` both mean no actions, as they always did. Migration: delete
  implementations that return `[]` or `null`; with the `noImplicitOverride` compiler option, add `override` to the
  ones that stay.

### Fixes

- `defineLocators()` and `pageActionsToPerformAfterNavigation()` see the page object's constructor arguments, fields
  and constructor-body assignments instead of `undefined` (analysis 1.7).
