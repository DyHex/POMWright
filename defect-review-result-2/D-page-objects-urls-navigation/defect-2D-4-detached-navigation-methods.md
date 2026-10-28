# 2D-4: The navigation helper's methods fail with an internal TypeError when called detached, while goto is typed as a property

- **Kind**: design question
- **Area**: Navigation: the helper object (`Navigation` in `src/helpers/navigation.ts`) and `NavigationFor`'s `goto` property
- **Severity**: Low (a call written in an uncommon way fails at once, with a message about an internal field)
- **Semver of the fix**: patch if adopted (binding the methods adds no member and breaks nothing)
- **Pass**: 1
- **First review**: missed by the first review (the methods are unbound since v3.0.0; `goto` became a property in `8c8d8fb`, 2026-10-27, after `54cdada`, D-1's fix)
- **Reviewed**: `d850405`, 2026-10-28T16:16:15+01:00, Opus 5.5, second review, segment 2D

## Contract

None states whether the helper's methods may be called detached. Around it:

- `src/helpers/navigation.ts:86-109`: `goto` is declared in `NavigationBase` as a property, `goto: (target, options?) =>
  Promise<void>`, "a property, not a method: TypeScript then compares it strictly" (commit `8c8d8fb`).
  `expectThisPage` and `expectAnotherPage` stay method signatures.
- The page object's own accessors are bound and work detached: `src/pageObject.ts:306-331`, and
  `src/pageObject.test.ts` "a destructured accessor"; `test/tests/pageObject/lifecycle.spec.ts` "direct use of the
  protected registry and a destructured accessor resolve against DOM".
- Playwright's own methods (`page.goto`) are not bound either (the guide's *Mirror Playwright*).

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p08-detached/detached.mjs` (the built package, a stub
page; each error comes before Playwright's step, so no runner is needed):

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p08-detached/detached.mjs
```

Output (copied; the script's last line, a detached `getLocator` of a path the stub never registered, throws "No
locator schema registered", which shows that accessor runs detached, and ends the script with exit 1):

```text
goto() -> TypeError: Cannot read properties of undefined (reading 'fullUrl')
goto("/x") -> TypeError: Cannot read properties of undefined (reading 'resolveTarget')
expectThisPage() -> TypeError: Cannot read properties of undefined (reading 'label')
expectAnotherPage() -> TypeError: Cannot read properties of undefined (reading 'label')
```

Ways a test meets it: `const { goto } = loginPage.navigation`, `pages.forEach((p) => run(p.navigation.goto))`,
`await test.step("open", loginPage.navigation.goto)` (read from the code, not run: the step info passes the
first-argument check as options, and the call then fails on `this`).

## Argument

The helper is POMWright's own object, not Playwright's, and its type now presents `goto` as a function-valued property,
which in TypeScript reads as callable on its own (a lint rule such as typescript-eslint's `unbound-method` warns about a
detached method but not about a property; not probed here, the repository lints with biome). The page object's other
members that look like this (`add`, `getLocator`, …) are bound. A detached call fails with a message about an internal
field (`fullUrl`, `resolveTarget`, `label`), which names neither the helper nor the fix.

Cost of binding: three bound functions per page object (or arrow properties in `Navigation`); the step location's
boundary (`callerLocation(Navigation.prototype.goto)`) must stay the function whose frame is on the stack, so the
`test/step-locations/` check would have to pass unchanged. Cost of leaving it: none in normal use.

## Fix plan

- **Options**:
  1. Bind the three methods in `createNavigation` (`goto: navigation.goto.bind(navigation)`, …) or define them as
     arrow-function fields of `Navigation`, keeping each method's frame as the boundary of its `callerLocation`; a unit
     test that calls each destructured; the step-location specs as they are.
  2. Keep them unbound and say so on *Navigation* (`api/class-navigation.md`): "call them on the helper,
     `loginPage.navigation.goto()`; they are not bound", as Playwright's methods are not.
  3. Leave it.
- **Docs**: option 1, a sentence on `api/class-navigation.md` that the methods can be passed on; option 2, the sentence
  above.
- **Changeset**: option 1, patch, "The navigation helper's methods work when called on their own, as the page object's
  locator accessors do."
- **Decisions to tick**: 1, 2 or 3.
