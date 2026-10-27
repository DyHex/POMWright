# Plan 26: `NavigationFor` declares `goto` as a property; the labelled `Cannot resolve` message

- **Decisions**: [DECISIONS.md](DECISIONS.md) #19, #36 (point 2)
- **Findings**: [D-1](D-page-objects-urls-navigation/defect-D-1-navigationfor-accepts-regexp-helper.md),
  [D-3](D-page-objects-urls-navigation/defect-D-3-navigation-messages-docs.md) (its code option; D-3's docs items are in
  plan 30); test gap #5's `NavigationFor` part
- **Bump**: patch (two changesets)
- **Stop**: no
- **Depends on**: plans 16 and 25 (the same files); before plan 30 (the navigation lists)

## Contract

- `goto` in `NavigationFor` is a property of function type, so `strictFunctionTypes` checks it strictly, and the `goto()`
  form without a target is added as an intersection only when `FullUrl` is a string. A RegExp-base or RegExp-path page's
  `navigation` is then rejected as `NavigationFor<string, string>`; calls on a page object's own `navigation` type-check
  exactly as today; a string page's `navigation` stays assignable to `NavigationFor<RegExp, UrlMatcher>`, the type the
  docs teach for a function that takes any page object's helper.
- `goto(target)` names the page object when the target cannot be resolved against its `baseUrl`, as every other
  navigation message does, for example `LoginPage: goto("http://") cannot be resolved against baseUrl
  "https://shop.example"` (final text from a probe), with the original error as `cause`.

## Current behaviour

- `src/helpers/navigation.ts:57-111`: `NavigationFor` declares `goto` as a method, which TypeScript compares bivariantly,
  so a RegExp page's single `goto(target: AbsoluteUrl)` satisfies a string page's two overloads, and the documented
  compile error for `goto()` on such a page is lost through the documented parameter type, with a runtime throw instead
  (`…-probes/D/navfor/`).
- `src/helpers/url.ts:138` throws `Cannot resolve "…" against baseUrl "…".` unlabelled; `navigation.ts:191` passes it on.

## Steps

### Step 1: D-1

1. `navigation.ts`, as scope D's `…-probes/D/navfor/sketch2.ts`: a base object type with `expectThisPage`,
   `expectAnotherPage` and `goto: (target: GotoTarget<BaseUrl>, options?: NavigationOptions) => Promise<void>`; then
   `FullUrl extends string ? Base & { goto: (options?: ThisPageOptions) => Promise<void> } : Base` (the conditional
   outside the base type). Every member keeps its doc comment (AGENTS.md §9: a type a chain hovers carries comments on
   its own members); `### goto()` stays findable by `check-api-coverage.mjs`.
2. **Tests**: `test/tests/packaging/publicTypes.typecheck.ts`: `@ts-expect-error` on assigning a RegExp-base and a
   RegExp-path page's `navigation` to `NavigationFor<string, string>`; the positive assignment of a string page's to
   `NavigationFor<RegExp, UrlMatcher>`; every existing call form unchanged; `publicTypes.emit.ts` if the emitted
   declaration changes. At implementation, the two external consumer projects type-check against the packed build in
   scratch copies (neither references `NavigationFor`).
3. **Docs**: `api/class-navigation.md`: at the top, `PageObject.navigation` is typed `NavigationFor<BaseUrl, FullUrl>`
   (the type of `baseUrl`, then of `fullUrl`), the three page kinds and their helper types (string and string:
   `NavigationFor<string, string>`; string base, RegExp path: `NavigationFor<string, UrlMatcher>`; RegExp base:
   `NavigationFor<RegExp, UrlMatcher>`), and which parameter type takes which helpers; `NavigationFor`'s doc comment.
4. **Changeset** `navigation-for-goto.md` (`patch`), with the migration: "A RegExp page object's `navigation` is no longer
   accepted as `NavigationFor<string, string>`, so `goto()` without a target is a compile error there too, as the docs
   say. A function that takes any page object's helper types its parameter `NavigationFor<RegExp, UrlMatcher>`."

### Step 2: D-3's label

1. `navigation.ts:191` (where the target is resolved): catch the `Cannot resolve` error and throw `${label}:
   goto(<target>) cannot be resolved against baseUrl <base>` with `{ cause }`; `resolveUrl` itself unchanged (it also
   serves construction-time validation).
2. `goto`'s doc comment `@throws` gains the message.
3. **Tests**: a unit test (`src/helpers/navigation.test.ts` or `url.test.ts`, where `goto` is driven); a
   `test/tests/testApp/testNav.spec.ts` assertion.
4. **Docs**: the message on `api/class-navigation.md` (`goto()` **Throws**) and `api/errors.md` *Navigation* is written
   in plan 30's pass, with D-3's other items; this step only changes the code and its doc comment.
5. **Changeset** `cannot-resolve-label.md` (`patch`): "`goto(target)` names the page object when the target cannot be
   resolved against its `baseUrl`."

## Verify

The standard checks (PLANS.md, rule 5) after each step; `pnpm docs:build` after step 1.

## Commit

```text
fix: NavigationFor checks goto strictly, so a RegExp page's helper is not a string page's

Plan: defect-review-result/PLAN-D-1-D-3-navigation.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
fix: goto(target) names the page object when the target cannot be resolved

Plan: defect-review-result/PLAN-D-1-D-3-navigation.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
