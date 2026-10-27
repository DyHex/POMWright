# D-1: A RegExp page object's `navigation` compiles as `NavigationFor<string, string>`, so `goto()` without a target type-checks and throws at runtime

- **Kind**: defect
- **Area**: `NavigationFor` (types), the parameter type `class-navigation.md` recommends
- **Severity**: Low (a type promise is broken in a plausible use, the shared-helper pattern the API page teaches; the
  runtime then throws at once with a clear message, so nothing goes wrong silently)
- **Semver of the fix**: patch (a type corrected to what the docs promise and the runtime does, AGENTS.md §7; code that
  relied on the wrong type stops compiling, so the changeset gives the migration)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (scope D)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #19](../DECISIONS.md))

## Contract

- `website/src/content/docs/api/class-navigation.md`, intro: "Its type, `NavigationFor<BaseUrl, FullUrl>`, follows the
  page object's URL types: `goto()` without a target exists only when `fullUrl` is a string, and on a RegExp `baseUrl`
  `goto(target)` takes an absolute URL only." Then, *NavigationFor*: "Name the type to take the helper as a parameter:
  `async function openAndLeave(navigation: NavigationFor<string, string>) { await navigation.goto(); … }`".
- `website/src/content/docs/docs/urls-and-navigation.md`, *Pages whose URL varies*: "Such a page has no single URL to
  go to, so `goto()` without a target is not available (a compile error, and from JavaScript: `AccountPage: goto()
  without a URL needs a string fullUrl; …`)."
- `src/helpers/navigation.ts:43-46` (doc comment of `NavigationFor`): "`goto()` without a target exists only when
  `fullUrl` is a string, and `goto(target)` takes any string on a string `baseUrl` but only an absolute URL on a RegExp
  `baseUrl`."

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/navfor/zz-probe-D-navfor.spec.ts`, a page object
with `{ urlPathType: RegExp }` passed to the `openAndLeave(navigation: NavigationFor<string, string>)` helper of
`class-navigation.md`:

```ts
class AccountPage extends PageObject<"main", { urlPathType: RegExp }> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", /^\/testnav\/item\/\d+$/);
	}
	protected defineLocators(): void {
		this.add("main").locator("main");
	}
}
async function openAndLeave(navigation: NavigationFor<string, string>) {
	await navigation.goto();
	await navigation.expectAnotherPage();
}
test("a RegExp page's navigation compiles as NavigationFor<string, string>", async ({ page }) => {
	const accountPage = new AccountPage(page);
	await expect(openAndLeave(accountPage.navigation)).rejects.toThrow(
		"AccountPage: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.",
	);
});
```

From the worktree root:

```sh
cp ../POMWright-final-review-probes/D/navfor/zz-probe-D-navfor.spec.ts test/tests/
pnpm exec tsc --noEmit -p test; echo "tsc exit $?"
pnpm -C test exec playwright test tests/zz-probe-D-navfor.spec.ts --project=chromium --reporter=line
rm test/tests/zz-probe-D-navfor.spec.ts
```

The broader type probe `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/zz-probe-D-types.typecheck.ts`
(same command, as `test/tests/zz-probe-D-types.typecheck.ts`) asserts with `@ts-expect-error` that
`takesString(b.navigation)` (RegExp base) and `takesString(p.navigation)` (RegExp path) are rejected; both directives
are reported unused.

## Observed / expected

```text
tsc exit 0
[1/1] [chromium] › tests/zz-probe-D-navfor.spec.ts:22:5 › a RegExp page's navigation compiles as NavigationFor<string, string>
  1 passed (825ms)
```

and from the type probe:

```text
test/tests/zz-probe-D-types.typecheck.ts(87,2): error TS2578: Unused '@ts-expect-error' directive.
test/tests/zz-probe-D-types.typecheck.ts(89,2): error TS2578: Unused '@ts-expect-error' directive.
```

The call `accountPage.navigation.goto()` directly is a compile error (TS2554), as documented; the same call through
`NavigationFor<string, string>` compiles and throws at runtime. Expected: assigning the helper of a page object whose
`fullUrl` is a `UrlMatcher` (or whose `baseUrl` is a RegExp) to `NavigationFor<string, string>` is a compile error, so
the documented compile error for `goto()` on such a page cannot be bypassed by the documented parameter type. The same
hole lets `goto("/relative")` on a RegExp `baseUrl` compile through that parameter.

## Cause

`src/helpers/navigation.ts:57-131`: `NavigationFor` declares `goto` with method syntax. TypeScript compares method
parameters bivariantly even under `strictFunctionTypes`, so the single signature
`goto(target: AbsoluteUrl, options?)` of a RegExp page satisfies both overloads of the string page
(`goto(target: string, options?)` and `goto(options?: ThisPageOptions)`): `AbsoluteUrl` is assignable to `string`, and
the second comparison passes in one of the two directions.

## Fix plan

- **Intended contract**: `NavigationFor<RegExp, UrlMatcher>` and `NavigationFor<string, UrlMatcher>` are not assignable
  to `NavigationFor<string, string>`; a string page's helper stays assignable wherever a RegExp page's is expected
  (today it is, and nothing documented says otherwise); `goto()`, `goto(target)` and `goto(options)` resolve as today.
- **Options**:
  1. **Recommended**: declare `goto` as a property of function type, so `strictFunctionTypes` checks it
     contravariantly, with the this-page form added as an intersection only when `FullUrl` is a string, and the
     conditional outside the base object type. A type sketch that does this,
     `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/navfor/sketch2.ts`, compiles with
     `node_modules/.bin/tsc --noEmit --strict --target es2022 --lib es2022,dom sketch2.ts` (exit 0): it rejects both
     RegExp helpers as `NavigationFor<string, string>`, accepts a string helper as `NavigationFor<RegExp, UrlMatcher>`
     and `NavigationFor<string, UrlMatcher>`, and keeps every call form. A first sketch with the conditional inside the
     property (`sketch.ts` beside it) also rejected the string helper as the RegExp one, through variance measurement;
     avoid that shape. Cost: the doc comments move from the overloads to the property (the editor shows one comment for
     both forms), and `check-api-coverage.mjs` must still find a `### goto()` heading for a property.
  2. A phantom discriminating member (for example a `readonly` brand keyed on `FullUrl`) on the type only. Cheaper to
     write, but it adds a member a consumer sees and that needs its own doc comment and API heading (§9).
  3. Docs only: say that `NavigationFor<string, string>` also accepts a RegExp page's helper and that the compile error
     is lost there. Cheapest, but leaves a type that contradicts the runtime.
- **Implementation steps**: `src/helpers/navigation.ts` (`NavigationFor`, `GotoTarget`), keeping `createNavigation`'s
  cast; regenerate nothing else.
- **Tests**: in `test/tests/packaging/publicTypes.typecheck.ts`, `@ts-expect-error` on assigning a RegExp-base and a
  RegExp-path page object's `navigation` to `NavigationFor<string, string>`, and a positive assignment of a string page's
  helper to `NavigationFor<RegExp, UrlMatcher>`; the same in `publicTypes.emit.ts` if the declaration emit changes.
- **Docs**: `api/class-navigation.md` *NavigationFor* (say which helpers a parameter of each type takes; for a helper
  that only waits, `NavigationFor<RegExp, UrlMatcher>` takes every page's), and the doc comment of `NavigationFor`.
- **Changeset**: patch. "A RegExp page object's `navigation` is no longer accepted as a `NavigationFor<string, string>`,
  so `goto()` without a target is a compile error there too, as the docs say." Migration: a function that takes the
  helper of any page object types its parameter `NavigationFor<RegExp, UrlMatcher>` and passes an absolute URL to
  `goto`.
- **Decisions to tick**:
  - [x] Fix the type (option 1 or 2), or document the hole (option 3): **option 1**, `goto` as a property of function
    type, the `goto()` form added only for a string `fullUrl`.
  - [x] Keep a string page's helper assignable to `NavigationFor<RegExp, UrlMatcher>`: yes; the docs teach it as the
    type of a function that takes any page object's helper.
  - [x] (added) Tests and changeset as above.
  - [x] (added) Docs: `api/class-navigation.md` says at the top that `PageObject.navigation` is typed
    `NavigationFor<BaseUrl, FullUrl>` (the type of `baseUrl`, the type of `fullUrl`), with the three page kinds and their
    helper types, and which parameter type takes which helpers; `NavigationFor`'s doc comment; `### goto()` stays
    findable by `check-api-coverage.mjs` (with B-7's edits to the page).
  - [x] (added) At implementation, type-check ice-orderform-web and ice-iceno-web against the fixed build (neither
    references `NavigationFor`, nor passes or stores a page object's `navigation`; checked on 2026-10-26).
- **Execution order**: independent of the other D findings.
