# Plan 17: a Promise from `defineLocators()` fails the page object

- **Decisions**: [DECISIONS.md](DECISIONS.md) #16
- **Findings**: [D-5](D-page-objects-urls-navigation/defect-D-5-async-definelocators.md); test gap #11's D-5 part
- **Bump**: patch, with a migration hint
- **Stop**: no
- **Depends on**: plan 16 (the same file, `src/pageObject.ts`, one pass after D-4)

## Contract

`defineLocators()` registers synchronously. When it returns a value with a `then` function, the page object fails as
for any definition error: a labelled error, kept, thrown by the scheduled check or the first locator call:
`<label>: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the
constructor or a fixture, and pass it in.` (final wording from a probe). The returned Promise gets a no-op `catch`, so
its own rejection does not surface a second, unlabelled error. The `void` return type stays (the docs write
`protected defineLocators(): void {` 45 times).

## Current behaviour

`src/pageObject.ts:342-366` `#defineLocatorsOnce` ignores what `defineLocators()` returns: an `async` definition is
verified before the rest of it runs (`verify()` reports paths registered a moment later as missing), and an error after
its first `await` escapes unlabelled and unkept, leaving a half-registered page object usable
(`…-probes/D/asyncdefine/`).

## Steps

1. `#defineLocatorsOnce`: `const returned: unknown = this.defineLocators();` then, when `returned` is an object or
   function with a `then` function, attach `.then(undefined, () => {})` so its rejection is handled, and fail with the
   message above, built directly (label prefix, no `cause`) and **not** passed through the generic `catch`, which would
   wrap it again as `defineLocators() failed: …`: for example, set `this.#locators = { failure }` and throw it after the
   `try` (the `catch` handles only what `defineLocators()` and `verify()` throw). The failure is kept like every other.
2. `defineLocators()`'s doc comment: it runs synchronously; `@throws` gains the message.
3. **Tests**: `src/pageObject.test.ts`: an `async` definition fails the check with the labelled message; the error is
   kept (a second locator call throws the same object); no unhandled rejection when the Promise rejects (a definition
   that throws after an `await`). A harness case in `test/tests/pageObject/lifecycle.spec.ts`, the page object built in a
   fixture, the test failing with the message.
4. **Docs**: *Page objects*, *When `defineLocators()` runs*: it is synchronous, and what to do instead (read in the
   fixture or constructor, pass it in); `api/class-pageobject.md`, `defineLocators()` **Throws**; `api/errors.md`, *Page
   objects → Locators*; *Internal → Page object lifecycle*; AGENTS.md §5, the `PageObject` bullet (`defineLocators()`
   registers synchronously; a returned Promise fails the page object).
5. **Changeset** `async-define-locators.md` (`patch`): "A page object whose `defineLocators()` returns a Promise fails
   with a labelled error saying it must register synchronously; before, it was verified before the rest of its
   definition ran. Move awaited work into the fixture and pass the result to the constructor."

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: a Promise from defineLocators() fails the page object with a labelled error

An async defineLocators() was verified before the rest of it ran, and an
error after its first await escaped unlabelled, leaving a half-registered
page object. A returned Promise now fails the page object as any definition
error does.

Plan: defect-review-result/PLAN-D-5-async-definelocators.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
