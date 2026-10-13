# Plan: the `PageObject` lifecycle (analysis items 1.7 and 3.7, the `null`/`[]` actions bullet of section 2, and the section 5 `PageObject.md` bullets)

Working document, kept in `release-3.0.0/` beside the analysis it answers: item 1.7 (`PageObject` calls
`defineLocators()` and `pageActionsToPerformAfterNavigation()` from its constructor, before the subclass exists), the
automatic `verify()` call of plan 1.6-1.8 (decision 7.8 there), which moves with the definition, the section 2 bullet
on `null` and `[]` actions and the `return [];` boilerplate, item 3.7 (a registry per instance), and the three section
5 bullets for `PageObject.md`. File links are relative to this folder. Written 2026-10-13 and reviewed the same day:
the review added the author's view with a 2.1 and 3.0.0 example (1.1), restructured the edge cases around what the
test passes (1.7), and replaced "define at the first use" by "define right after construction, or at the first use
if that comes earlier", so that registry mistakes fail in the fixture as in 2.1 (1.3, 3.2). Every decision in
section 7 was taken with the user on 2026-10-13 and is mirrored in [DECISIONS.md](DECISIONS.md) and
[RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md); the plan was then reviewed once more for mistakes and ambiguity.
Executed 2026-10-13, see below.

**Executed 2026-10-13** on `chore/bugfixes-quality-improvements-and-docs`, one commit per execution step: 66e9481 (1, the
runtime and `src/pageObject.test.ts`), db4720b (2, the harness: `lifecycle.spec.ts`, `actions.spec.ts`, the
`verify.spec.ts` change, the six page objects), 90f34c1 (3, `docs/v3`), 2301bee (4, the changeset), and the ledger
commit for step 6 that carries this note. Step 5 found nothing to fix: `pnpm lint` clean, 262 unit tests with no type
errors, 370 chromium tests against a freshly packed tarball, and the two new specs and `verify.spec.ts` green on
firefox and webkit. Execution-time decisions (the message templates, the frame filter, red then green, the `setTimeout`
after first-use assertions, `beforeAll` groups verified in all three describe modes) are in
[DECISIONS.md](DECISIONS.md).

Every runtime claim below was verified on 2026-10-13 against HEAD e3fea45: POMWright's behaviour through
`dist/index.mjs` (built after HEAD; its runtime is byte-identical to the tarball installed in `test/`) with chromium
from the root package (`createRequire` of `package.json`, `@playwright/test` 1.64.0) on a local http server of the
probe's own, every page object constructed with a real `Page`; runner behaviour (fixture and hook failures, error
`cause` and stack rendering, Playwright's TypeScript transform, the navigation actions, `test.fail()`) through
temporary specs in `test/tests/` run against the installed tarball on chromium with `--retries=0` and deleted
afterwards; the design through a prototype built on the public `createRegistryWithAccessors`, type-checked
against `dist/index.d.mts` and run against a real page and in the runner; class-field emission and every type claim
with the repository's TypeScript 5.9.3 under the root `tsconfig.json` flags (`strict`, `noUncheckedIndexedAccess`,
`verbatimModuleSyntax`, target `es2022`), every negative case a consumed `@ts-expect-error`; API usage facts from a
survey of one 2.1.0 consumer project (23 page objects, 30 locator files, 552 registrations), counts only. Every code
reference points at the exact lines in this repository. Example hosts are generic (`*.example`).

Probes cited below: **P1** what a subclass reads inside the two hooks today (`dist`, real page); **P2** `tsc`
emission and initialisation order of parameter properties and fields; **P3** the deferred-definition prototype in two
variants (facade, getter), with **P3b** field and branch reads under the facade; **P4** construction cost by path
count; **P5** the runner: (a) a fixture failure today, (b) a first-use failure and `cause` rendering, (c)
Playwright's transform order, (d) when the actions hook runs and `null` versus `[]`; **P6** the hook and override
types; **P7** V8 and a mutated error message; **P8** the check scheduled right after construction, in the runner:
test- and worker-scoped fixtures, `beforeEach`, `beforeAll`, the construction-site stack, state set after `new`, a
correct page object, plus the cost of the site capture and the scheduling in Node; **P9** its edge cases in the
runner: (a) `test.fail()` called in the body and (a2) the `test.fail("…", …)` declaration form, each with a broken
fixture page object, (b) a deliberate catch of a first-use error, (c) and (d) a subclass constructor that throws after
`super()` with a definition that reads only state that is set, and one that reads a field the constructor never set;
**P10** which registry mistakes are compile errors; **P11** the 2.1 example of 1.1, compiled and run against `dist`;
**P12** validation before `super()` in a subclass with parameter properties and fields (`tsc` and run); **P13** the
order of the frames captured in the base constructor behind a domain base class; **P14** a broken page object built
in `beforeAll` (default and `serial` mode) and in `beforeEach` of groups with several tests, in the runner with one
worker, with the scheduled check and with today's eager `PageObject` as the 2.1 baseline; **P15** a locator module
that takes page-object state as an extra argument, with the composition overloads (`tsc`).

Out of scope, left to the plans listed in [PLANS.md](PLANS.md): renaming `UrlTypeOptions` and every other type or
export question (1.9, plan 7); the `retries` setting, `tsc` in CI and the typecheck probe file (section 4, plan 6); the
1.10 small fixes (plan 8), including sharing one call-site helper between `seed` and `PageObject` (3.3); `describe`
options, strict chains and the other structural items (plan 9); the remaining section 5 bullets for `overview.md` and
the other documents (plan 10), except the `page as Page` cast in the `overview.md` `PageObject` fixture example,
which is the same noise as the `PageObject.md` bullet and is fixed with it.

---

## 1. Intended contract

### 1.1 In short, for a page-object author

**What goes wrong in 2.1.** When a test runs `new LocalizedLoginPage(page, "nb")`, the subclass constructor
starts by calling `super(...)`, which runs the base classes' constructors, ending in `PageObject`'s, which calls
`this.defineLocators()` ([pageObject.ts:97](../src/pageObject.ts#L97)). At that moment the subclass
constructor has not got past `super(...)`, so nothing the subclass stores is there yet: parameter properties, field
initialisers and assignments in its constructor body all read `undefined`. The test passed `"nb"`, but the
definition ran before the page object had stored it. The same holds for `pageActionsToPerformAfterNavigation()`,
which is evaluated in the same constructor ([L105](../src/pageObject.ts#L105)). Nothing reports it (P1, P11).

**What 3.0.0 does.** `PageObject` no longer calls the two hooks from its constructor. `defineLocators()` and the
registry verification run right after the code that called `new` has finished (in a fixture: right after
`new LoginPage(page)`, before the test body starts), or at the first use of a locator if that comes earlier. The
actions hook is called each time the actions run. Nobody calls anything new; page objects and fixtures are written
exactly as in 2.1.

The domain base class is the same in 2.1 and 3.0.0 (shown with the 2.1 harness options):

```ts
// shop.base.ts
type BaseOptions<Options extends UrlTypeOptions> = {
  baseUrlType: string;
  urlPathType: UrlPathTypeFromOptions<Options>;
};

export default abstract class ShopApp<
  Paths extends string,
  Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> extends PageObject<Paths, BaseOptions<Options>> {
  protected constructor(
    page: Page,
    urlPath: UrlPathTypeFromOptions<BaseOptions<Options>>,
    options?: { label?: string; navOptions?: NavigationOptions },
  ) {
    super(page, "https://shop.example", urlPath, options);
  }
}
```

2.1, the usual page object (every harness and surveyed page object has this shape), and one that uses its own
constructor argument:

```ts
// login.page.ts
export default class LoginPage extends ShopApp<Paths> {
  constructor(page: Page) {
    super(page, "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  // required in 2.1, even when there is nothing to do
  protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
    return [];
  }
}

// localized-login.page.ts
const loginLabel = { en: "Log in", nb: "Logg inn" } as const;

export default class LocalizedLoginPage extends ShopApp<Paths> {
  constructor(page: Page, private readonly locale: "en" | "nb") {
    super(page, "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    // this.locale is undefined here: new LocalizedLoginPage(page, "nb") registers
    // locator('main').getByRole('button'), the name is lost (P11)
    this.add("main.button@login").getByRole("button", { name: loginLabel[this.locale] });
  }

  protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
    return [];
  }
}
```

3.0.0, the same two page objects; the only edit is that the empty hook may go:

```ts
// login.page.ts
export default class LoginPage extends ShopApp<Paths> {
  constructor(page: Page) {
    super(page, "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }
  // no pageActionsToPerformAfterNavigation: optional, no actions by default
  // (keeping `return [];` or `return null;` still compiles and means the same)
}

// localized-login.page.ts (loginLabel as above)
export default class LocalizedLoginPage extends ShopApp<Paths> {
  constructor(page: Page, private readonly locale: "en" | "nb") {
    super(page, "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    // runs after the constructor has finished: this.locale is "nb", the name is "Logg inn"
    this.add("main.button@login").getByRole("button", { name: loginLabel[this.locale] });
  }
}
```

Fixtures and tests are unchanged:

```ts
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

test("login", async ({ loginPage }) => {
  // a registry mistake (a duplicate path, a cycle, a `has` reference to a path that is never registered)
  // fails the fixture before this body starts, as in 2.1, now with "LoginPage: …" in the message
  await loginPage.navigation.goto();
  await loginPage.getNestedLocator("main.button@login").click();
});
```

What an author can notice, none of which needs code:

- `this.something` works in `defineLocators()` and in the actions hook.
- The empty `pageActionsToPerformAfterNavigation()` can be deleted; keeping it still works. With the
  `noImplicitOverride` compiler flag, a hook that is kept needs the `override` keyword (7.6).
- Registry mistakes still fail the fixture, with the page object's label in the message. `new X(page)` itself no
  longer throws for them, so a test that wraps `new` in `expect(…).toThrow()` asserts on a first use instead (1.4).
- A page object built in `beforeEach` or `beforeAll` with a registry mistake still fails the tests the hook runs
  for, but each body runs until its first use of that page object; in a `beforeAll` group that is not `serial`,
  every test of the group fails, where 2.1 failed the first and did not run the rest (1.4).
- The definition does not see a value assigned to the page object after an `await` that follows `new` (1.7).

Everything else (the facade object behind `locatorRegistry`, the private state field, the scheduled check, the
construction-site stack, how the navigation helper receives the actions) is internal.

### 1.2 Principles for this plan

- **A page object is ready after `new`, and its definitions see the whole instance.** `defineLocators()` may read
  anything the subclass constructor sets. Nothing in the definition DSL changes.
- **Fail fast stays.** The definition and the verification run right after construction, so a registry mistake fails
  the fixture before the test body, as in 2.1. A use that comes earlier (a field initialiser, `new X(page).get…` in
  one statement) runs them at that use.
- **Verification stays automatic and runs once.** `verify()` runs exactly once per instance, right after
  `defineLocators()`, before anything resolves through the page object. There is still no opt-out.
- **A failure names the page object and points at the right line.** An error from the definition or the
  verification carries the page object's label and the original as `cause`; when it is raised by the check after
  construction, its stack points at the construction site, as `seed` errors do since plan 1.5.
- **Hooks are overridable methods; only `defineLocators()` is required.** The post-navigation actions hook is
  optional and is evaluated when the actions run.
- **No new public API.** `PageObject`'s members keep their types; what changes is when the two hooks run and that the
  actions hook has a default.
- **No guard for the remaining sharp edges.** A field initialiser that resolves a locator, a value assigned after an
  `await`, and a subclass constructor that throws after `super()` are documented (1.7), not detected.
- **An `undefined` value is never second-guessed.** A definition registers what the author's code produces, as
  today; `{ name: undefined }` passed on purpose still means "no name filter", as in Playwright (1.7).

### 1.3 When the definition runs: the contract

`PageObject` holds in `locatorRegistry` an object with the same six members as the public `LocatorRegistry` type,
and the four accessors are its methods. Each method ensures the definition before it does its work. At the end of
its constructor, `PageObject` schedules one check that ensures the definition as soon as the synchronous code that
called `new` has finished (a microtask). Ensuring the definition means: if it has not run, run `defineLocators()`,
then `verify()`; if it is running (a call made from inside `defineLocators()`), do nothing; if it failed, rethrow
that failure. The scheduled check does nothing if anything has run the definition before it, successfully or not.

| what the code does | defines and verifies? | notes |
| --- | --- | --- |
| `new LoginPage(page)` | right after the code that called `new` has finished, before any `await` in it continues; in a fixture, before the test body | URL validation, the session storage helper and the navigation helper are built in the constructor, as today; the check is scheduled last, so a constructor that throws in `PageObject` (an invalid URL) schedules nothing |
| synchronous code right after `new` (`po.mode = "x"`) | not yet; it runs before the check | the definition sees it (P8) |
| `new LoginPage(page).getNestedLocator(path)` in one statement, or any locator call before the check | yes, at that call | the scheduled check then does nothing |
| a field initialiser that resolves (`readonly submit = this.getNestedLocator(…)`) | yes, during field initialisation | see 1.7 for what it sees |
| `loginPage.getNestedLocator(path)`, `getLocator(path)`, `getLocatorSchema(path)` in the test body or a page-object method | already done | |
| `loginPage.add(path)…` from a test or a method | already done, then registers the path | a path added after the definition is not verified, as today |
| a destructured accessor, `const { getNestedLocator } = loginPage` | already done, or at that call if earlier | the accessors are closures, as today's bound functions are |
| `this.locatorRegistry.add`, `getLocator`, `getNestedLocator`, `getLocatorSchema` from a subclass method | already done, or at that call if earlier | the analysis's requirement: direct use of the protected registry is covered |
| `this.locatorRegistry.verify()` | already done, or at that call if earlier; a later call verifies again | verification is idempotent |
| `this.locatorRegistry.createReusable.…`, reading `this.locatorRegistry` without calling a method | does not trigger it (the check still runs) | a seed never reads the registry |
| `navigation.*`, `sessionStorage.*`, `page`, `baseUrl`, `urlPath`, `fullUrl`, `label` | does not trigger it (the check still runs) | they never depended on the registry; an action that calls a locator triggers it like any call |
| any registry call made from inside `defineLocators()` | no, it passes through | as today: `defineLocators(this.locatorRegistry)` registers, and a resolution inside the definition sees the paths registered before it |
| any registry call after a failed definition or verification | rethrows the same error | `defineLocators()` runs once |

### 1.4 Errors

| failure | raised by | message | stack | `cause` |
| --- | --- | --- | --- | --- |
| anything thrown inside `defineLocators()` (a duplicate path, an empty selector, a missing primary argument from JavaScript, a `TypeError` in the subclass's code) | the scheduled check, or an earlier locator call | `<label>: defineLocators() failed: <original message>` | the construction site when raised by the check (the first frame outside POMWright is the `super(...)` call in the class that extends `PageObject`, a domain base class if there is one, then the page object's own `super(...)` and the fixture's `new` line, P8, P13); the call site otherwise | the original error, whose stack contains the failing `defineLocators` line |
| `verify()` | the same | `<label>: Locator registry verification failed for N of M paths:` followed by one line per path, unchanged | the same | the verification error |
| any later registry use | that use | the same error object | the stack of its first raise (the construction site when the check raised it) | |

The label is the page object's `label` (the `label` option, or the class name), as in the navigation helper's
messages (`OrdersPage: expected URL …`). An error raised by the scheduled check is thrown outside the test's own code;
Playwright fails the running test with it, the mechanism plan 1.5's service-worker check relies on, and prints the
`cause` with its own stack (P5b, P8). A test that goes on to use the page object reports the error twice, once from
the check and once from the rethrow at the use (P14). Where it lands:

| where the page object is constructed | 2.1 | 3.0.0 |
| --- | --- | --- |
| test-scoped fixture | the fixture fails at `new`, before the body; the message does not name the page object (P5a) | the fixture fails before the body, labelled, with the code frame on the `super(...)` line and the fixture's `new` line in the stack (P8) |
| worker-scoped fixture | at `new` | the test fails before its body, labelled, at the construction site (P8) |
| `beforeEach` | the hook throws at `new`; each test fails, no body runs (P14) | each test fails with the labelled error; each body runs until its first use of that page object, where the same error is rethrown (P8, P14) |
| `beforeAll`, default mode (the harness's `fullyParallel`) | the hook throws; the first test fails, the others did not run (P14) | every test of the group fails with the labelled error, each body running until its first use (P14): the hook itself does not fail, so the group is not skipped, and each test after a failure runs in a new worker that runs `beforeAll` again |
| `beforeAll`, `serial` mode | the first test fails, the others did not run (P14) | the same, except that the first test's body runs until its first use (P14) |
| the test body, then used synchronously (`expect(() => new X(page).getNestedLocator(p)).toThrow(…)`) | `new` throws | the call throws, labelled; the test can catch it, and the scheduled check does not fail the test afterwards (P9b) |
| the test body, `expect(() => new X(page)).toThrow(…)` | passes | fails: `new` no longer throws, and the check then fails the test; assert on a first use instead (row above) |
| a `test.fail("…", …)` declaration whose fixture builds a broken page object | expected failure | expected failure (P9a2); `test.fail()` called inside the body does not apply, because the body never starts (P9a) |

### 1.5 Verification

`verify()` runs together with the definition, right after it, once per instance. The plan 1.6-1.8 contract for what
it checks (that plan's section 1.9 table) is unchanged; only the moment, the label and the stack change. Standalone
registries from `createRegistryWithAccessors` are unchanged and call `registry.verify()` themselves.

What the move from the constructor to "right after it" changes, by kind of mistake (P10: the compile errors are
consumed `@ts-expect-error`s, the runtime cases compile):

| mistake | 2.1 | 3.0.0 |
| --- | --- | --- |
| a misspelt `has`/`hasNot` path literal, a path outside the union, a step before a strategy, an options-only call without the primary on an unseeded builder | compile error | compile error |
| an invalid `baseUrl` or `urlPath`, an invalid session storage origin | `new` throws | `new` throws |
| a duplicate path, `locator("")`, a cycle, a reference to a path that is valid but never registered, an any-frame segment below an ancestor, anything from JavaScript or behind a cast | `new` throws, in the fixture, without the page object's name | the check right after `new` throws, in the fixture, labelled, at the construction site |

### 1.6 Post-navigation actions

| call | hook evaluated? | actions run? |
| --- | --- | --- |
| construction | no (2.x: once) | |
| `navigation.goto()` | once, after `page.goto` returns | yes |
| `navigation.goto({ runPostNavigationActions: false })` | no | no |
| `navigation.goto(target)` | no | no |
| `navigation.expectThisPage()` | once, after the wait | yes |
| `navigation.expectThisPage({ runPostNavigationActions: false })` | no | no |
| `navigation.expectAnotherPage()` | no | no |

- `pageActionsToPerformAfterNavigation()` becomes an ordinary protected method with a default that returns `[]`.
  Overriding it is optional; a page object without actions omits it.
- It is called each time the actions run, so it reads the page object's current state, constructor arguments
  included, and may return a different list per call. It is never called at construction and its result is not
  cached.
- Its return type stays `(() => Promise<void>)[] | null` (7.7): `null` means no actions, exactly as `[]` does, and the
  docs say so. The recommended form is to omit the method.
- The actions run in order, each awaited, inside the method's step, as today.

### 1.7 Edge cases, with the decided answer

**Subclass state in the hooks.** In each row the test passes a value to the page object's constructor, or the page
object sets one itself, and the page object's code reads it through `this`. POMWright never substitutes a value: the
3.0.0 column is what the author's code produces once the value is there.

| the page object's code | what the test or the class provides | 2.1: what the hook saw, and the result | 3.0.0 |
| --- | --- | --- | --- |
| `getByRole("button", { name: this.buttonName })`, a parameter property | `new P(page, "Cancel")`: the test wants the Cancel button | `undefined`; registers `{ name: undefined }`, rendered `getByRole('button')`: all buttons, 2 on the probe page, so the first action fails with a strict mode violation; with one button on the page it acts on that one (P1) | `getByRole('button', { name: 'Cancel' })` |
| the same | `new P(page, undefined)`, on purpose: no name filter | `undefined`, the same registration | the same registration: `{ name: undefined }` means "no name filter", as in Playwright; POMWright does not throw, because it cannot tell an intended `undefined` from a forgotten one |
| ``getByTestId(`${this.testIdPrefix}-submit`)``, a field initialiser `testIdPrefix = "login"` | the class | `undefined`; `getByTestId('undefined-submit')`, 0 matches, the first action times out | `getByTestId('login-submit')`, 1 match (P3b) |
| `getByRole("button", { name: this.mode === "cancel" ? "Cancel" : "Log in" })`, assigned in the constructor body | `new P(page, "cancel")` | `undefined`; `getByRole('button', { name: 'Log in' })`, 1 match: the wrong button, no error | the `Cancel` button (P3b) |
| `this.texts.login`, a field initialiser | the class | `TypeError: Cannot read properties of undefined (reading 'login')` at `new` | resolves |
| `labels[this.locale].login`, the analysis's example | `new P(page, "nb")` | the same `TypeError` at `new` (correction below) | resolves (P3: `Logg inn`, 1 match) |
| `getByText(this.text)`, a parameter property as the primary argument | `new P(page, "Cancel")` | `getByText requires a text value for "text".` at `new` (the plan 1.6-1.8 guard) | resolves |
| `pageActionsToPerformAfterNavigation() { return this.waitForSpinner ? [action] : []; }` | `new P(page, true)` | `undefined`; evaluated once at construction, stores `[]`; the action runs 0 times across `goto()`, `goto()`, `expectThisPage()` (P5d) | evaluated at each run; the action runs |
| any of the above, two instances | `new P(page, "nb")`, `new P(page, "en")` | both `undefined` | each its own (P3: `Logg inn` and `Log in`) |
| a value the test assigns synchronously right after `new` (`po.mode = "item"`) | the test | `undefined` (the definition ran inside `new`) | seen (P8) |
| a value the test assigns after an `await` that follows `new` | the test | `undefined` | not seen: the check has already run (P8); pass the value to the constructor instead |
| `readonly submit = this.getNestedLocator("…")`, a field initialiser that resolves | the class | works: the registry was defined inside `super()` | runs the definition during field initialisation: fields declared above it are set, fields below it are not; parameter properties are set under Playwright's transform (P5c) and not under `tsc` with define semantics, the default for target `es2022` and later (P2); documented, with a getter as the recommended form |

Correction to the analysis for the record: 1.7 calls the failure silent and illustrates it with
`labels[this.locale].login`, which throws a `TypeError` at construction (verified). The silent cases are values used
as options (`{ name: undefined }` drops the option), strings built from state (`undefined-submit`) and branches on
state (the wrong element). A missing primary argument throws since plan 1.6-1.8.

**Locator options a test changes on purpose** are unaffected: `getLocatorSchema(path).update(…)` and `.replace(…)`
work on the registered definition when the test calls them, after the definition has run, and `update().getByRole({
name: null })` drops a registered name (plan 1.6-1.8).

**The lifecycle itself.**

| case | 2.1 (verified) | 3.0.0 |
| --- | --- | --- |
| a page object without `pageActionsToPerformAfterNavigation` | TS2515, does not compile | compiles; no actions |
| `return null` from the hook | identical to `[]`: both store `[]`, `goto()` and `expectThisPage()` pass (P5d) | identical to `[]`, documented |
| the 2.x annotation `(): (() => Promise<void>)[] \| null` on the hook | compiles | compiles |
| `noImplicitOverride: true` and a hook implementation without `override` | compiles (implementing an abstract member needs no `override`) | TS4114; add `override` or delete the method (7.6) |
| a `readonly` actions list | TS2416 | TS2416, unchanged |
| a page object constructed and never used | defines and verifies | defines and verifies, in the scheduled check |
| a second registry use after a failure | not reachable (`new` threw) | the same error; `defineLocators()` runs once |
| `po.add("extra")` from a test | registers after the definition | the same (P3); `extra` is not verified, as today |
| `this.locatorRegistry.getNestedLocator(path)` from a subclass method | resolves | resolves; defines first if nothing has (P3) |
| `this.locatorRegistry.createReusable.locator("aside")` | n/a: the definition ran inside `new` | does not run the definition (P3) |
| `defineLocators(this.locatorRegistry)`, the module pattern of every harness and surveyed page object | works | works; the composition overloads of `composing-locator-modules.md` type-check with the facade (P3) |
| `this.getLocator("main.form")` inside `defineLocators()` | resolves against the paths registered so far | the same (P3) |
| `this.locatorRegistry.verify()` inside `defineLocators()` | verifies the paths registered so far | the same; the automatic verification still runs afterwards |
| a subclass constructor that throws after `super()` | `new` throws the subclass's error; the registry was already defined and verified inside `super()` | `new` throws the subclass's error; the scheduled check still runs on the discarded instance: nothing more if its definition works (P9c), a second labelled error that fails the test if the definition reads state the constructor never set (P9d); documented: validate arguments before `super()`, which TypeScript allows for code that does not touch `this` and which stops `PageObject`'s constructor, and so the check, from running at all (P12), or keep the definition independent of them |
| construction cost | about 10 µs plus about 1 µs per path (P4) | about 1.2 µs more for the site capture and the scheduling (P8); the per-path part runs in the check |

### 1.8 2.1.0 and 3.0.0 side by side

| aspect | 2.1.0 (and HEAD) | 3.0.0 |
| --- | --- | --- |
| when `defineLocators()` runs | in the base constructor, [pageObject.ts:97](../src/pageObject.ts#L97) | right after construction, or at the first locator call if earlier; once per instance (7.1) |
| what it can read | what the base constructor has set | the whole instance |
| automatic `verify()` | right after `defineLocators()` in the constructor, [L98](../src/pageObject.ts#L98) | right after `defineLocators()`, once per instance (7.3) |
| where a registry mistake fails | `new`, usually in the fixture; message without the page object | right after `new`, in the fixture; labelled, at the construction site, with the original as `cause` (7.4) |
| does `new` throw for a registry mistake | yes | no (the check right after it does) |
| `this.locatorRegistry` | the registry instance | an object with the same six members whose methods ensure the definition (7.2) |
| actions hook evaluated | once, in the constructor, [L105](../src/pageObject.ts#L105) | each time the actions run (7.5) |
| actions hook | abstract, [L111](../src/pageObject.ts#L111) | optional, default `[]` (7.6) |
| `null` from the hook | identical to `[]`, documented as if different | identical to `[]`, documented as identical (7.7) |
| `defineLocators()` | abstract | abstract (7.8) |
| registry per instance | yes | yes; no per-class cache (7.9) |
| page object never used | defines and verifies | defines and verifies |

---

## 2. How it works today (verified)

### 2.1 Construction order

The constructor ([pageObject.ts:62-108](../src/pageObject.ts#L62-L108)) validates the URLs (L75-80), composes
`fullUrl` (L83), creates the registry and binds the accessors (L84-90), builds the session storage helper (L91-95),
calls `this.defineLocators()` (L97) and `this.locatorRegistry.verify()` (L98), and builds the navigation helper with
`this.pageActionsToPerformAfterNavigation()` evaluated as an argument (L99-107). Both hooks are abstract (L110-111).
All of this runs inside the subclass's `super(...)` call, before the subclass assigns anything.

What a subclass reads inside the two hooks (P1: subclasses compiled by `tsc` with the repo flags, which reported
nothing; run against `dist` on a page with the buttons `Log in` and `Cancel` and a `data-testid="login-submit"`
element):

| subclass state used in the hook | value seen | registered / resolved | outcome |
| --- | --- | --- | --- |
| parameter property as an option, `getByRole("button", { name: this.buttonName })`, constructed with `"Cancel"` | `undefined` | `getByRole('button')`, 2 matches | strict mode violation at the first action; with one button on the page, a silent wrong match |
| field initialiser in a template, ``getByTestId(`${this.testIdPrefix}-submit`)`` | `undefined` | `getByTestId('undefined-submit')`, 0 matches | timeout at the first action |
| field read through a property, `this.texts.login` | | | `TypeError` at construction |
| `labels[this.locale].login` with a parameter property | | | `TypeError` at construction |
| parameter property as the primary argument, `getByText(this.text)` | | | `getByText requires a text value for "text".` at construction |
| constructor-body assignment in a branch, constructed with `"cancel"` | `undefined` | `getByRole('button', { name: 'Log in' })`, 1 match | acts on the wrong button, no error |
| actions hook, `this.waitForSpinner ? [action] : []`, constructed with `true` | `undefined` | 1 hook call during construction, 0 actions stored | the action never runs |

P11: the 2.1 `LocalizedLoginPage` of 1.1 compiles under the repo flags against today's `dist`, and
`new LocalizedLoginPage(page, "nb")` registers `locator('main').getByRole('button')`.

### 2.2 Class fields, parameter properties and the compilers

When subclass state becomes visible depends on the compiler, which matters for a field initialiser that resolves a
locator (P2: `tsc` emission and run; P5c: Playwright's transform in the runner):

| compiled by | inside the base constructor | in a field initialiser that calls a method reading a parameter property |
| --- | --- | --- |
| `tsc`, target `es2022`, `useDefineForClassFields` true (its default for `es2022` and later: native fields are emitted, verified) | `undefined` | `undefined`: native fields are initialised when `super()` returns, the parameter property is assigned after them |
| `tsc`, `useDefineForClassFields` false | `undefined` | the value: the parameter property is assigned first |
| Playwright 1.64's test runner transform (how page objects in a Playwright project run) | `undefined` | the value (`"nb"`) |

TypeScript reports none of these: a read through a method call is invisible to its use-before-initialisation check.

### 2.3 The actions

`Navigation` stores the evaluated list at construction ([navigation.ts:42](../src/helpers/navigation.ts#L42), the
parameter at [L50](../src/helpers/navigation.ts#L50)) and turns `null` into `[]` at
[L54](../src/helpers/navigation.ts#L54); `executeActions` ([L69-73](../src/helpers/navigation.ts#L69-L73)) runs the
stored list after `goto()` ([L125-127](../src/helpers/navigation.ts#L125-L127)) and `expectThisPage()`
([L145-147](../src/helpers/navigation.ts#L145-L147)) unless `runPostNavigationActions` is `false`.
`createNavigation` ([L171-182](../src/helpers/navigation.ts#L171-L182)) defaults the list to `null` (L177) and is
internal (not exported from [index.ts](../index.ts)). In the runner (P5d) the hook was called once during
construction and never again across `goto()`, `goto()`, `expectThisPage()`; a page object returning `null` and one
returning `[]` both stored `[]` and both navigated. The unit test passes `null` at
[navigation.test.ts:50](../src/helpers/navigation.test.ts#L50), [L86](../src/helpers/navigation.test.ts#L86) and
[L96](../src/helpers/navigation.test.ts#L96). [docs/v3/PageObject.md:159-160](../docs/v3/PageObject.md#L159-L160)
says `[]` runs no actions and `null` skips "the actions list entirely", implying a difference (section 5 bullet
[L77]).

### 2.4 Verification and how a failure is reported

`verify()` ([locatorRegistry.ts:414-444](../src/locators/locatorRegistry.ts#L414-L444)) is public on the registry
and in the `LocatorRegistry` type ([L592-595](../src/locators/locatorRegistry.ts#L592-L595)). In the runner (P5a) a
page object with a `has` typo built in a fixture fails the test at fixture setup with `Locator registry verification
failed for 1 of 2 paths: …`; the code frame is the subclass's `super(...)` line and the stack runs through
`Object.eagerTypo` (the fixture). The message does not name the page object.

A prototype that defined at the first use only (P5b) failed at the test's first `getNestedLocator` call, inside the
step that made it, with `LazyTypo: Locator registry verification failed for 1 of 2 paths: …`, and Playwright
printed `[cause]: Error: Locator registry verification failed …` with the cause's own stack under it.

The prototype with the scheduled check (P8), same typo and a duplicate path, each built in a fixture:

| construction in | result |
| --- | --- |
| a test-scoped fixture, page object unused by the body (the body waits 3 s) | the test fails before the body (no body output, 2.2 s for the whole run), labelled, with the cause |
| a test-scoped fixture, used by the body | the same: the body never starts |
| a test-scoped fixture, duplicate path | `DuplicatePage: A locator schema with the path "body" already exists.` before the body; the cause's stack contains `Duplicate.defineLocators` at the duplicate `add` line |
| a worker-scoped fixture | the test fails before its body, labelled |
| `beforeEach`, `beforeAll`, one test per group | the test fails with the error, after its body has run (the body did not use the page object); groups with several tests are P14, below |
| a correct page object with a constructor argument | defined once, sees the argument |

Without the construction-site stack, an error thrown by the check has no frame in user code (its stack starts in the
microtask); with the site captured at the end of `PageObject`'s constructor and frames inside the base class
filtered out, the code frame was the subclass's `super(...)` line and the stack continued with the fixture's `new`
line, in every row above. The probe's page objects extended the base directly; behind a domain base class the
captured frames run from the domain base's `super(...)` line to the page object's and then the fixture's (P13), so
the code frame is the domain base's `super(...)` call with the page object's line right below it. Plan 1.5 does the same for `seed` errors with `captureCallSite` and `atSite`
([sessionStorageSeed.ts:168-182](../src/helpers/sessionStorageSeed.ts#L168-L182)).

Edge cases of the check (P9): a test that catches a first-use error on purpose (`expect(() => new
Typo(page).getNestedLocator("body")).toThrowError(…)`) passed and was not failed afterwards, because the check does
nothing once the definition has run; a subclass constructor that throws after `super()` passed an `expect(() => new
…).toThrow(…)` when its definition read only parameter properties, and failed the test with a second, labelled
`TypeError` when its definition read a field the constructor never set; `test.fail()` called in the body of a test
whose fixture built a broken page object did not apply (reported as failed: the body never starts), while the
declaration form `test.fail("…", async ({ typo }) => {})` reported the expected failure as passed.

Groups with several tests (P14, one worker; t2 uses the page object, t1 and t3 do not):

| group | 2.1 (today's `PageObject`) | the scheduled check |
| --- | --- | --- |
| `beforeAll`, default mode | t1 failed, t2 did not run | t1, t2 and t3 failed with the labelled error; all three bodies ran, t2's up to its use, which threw again (two errors reported) |
| `beforeAll`, `serial` | t1 failed, t2 did not run | t1 failed (its body ran), t2 and t3 did not run |
| `beforeEach`, two tests | e1 failed, its body did not run | e1 and e2 failed; both bodies ran, e2's up to its use (two errors reported) |

Why a new error and not a prefixed original (P7): V8 formats `error.stack` lazily, so a message changed before the
first read of `stack` shows the prefix, but one changed after any read (a debugger, a reporter, an earlier `catch`)
keeps the old header. Wrapping is the robust form; `cause` keeps the original and its stack.

### 2.5 The hook types

P6, `tsc` with the repo flags:

| declaration in the subclass | today (abstract, `… \| null`) | default `[]`, `null` kept | default `[]`, `null` dropped |
| --- | --- | --- | --- |
| no hook | TS2515 (`does not implement inherited abstract member`) | compiles | compiles |
| `return []` | compiles | compiles | compiles |
| `return null` | compiles | compiles | TS2416 |
| the 2.x annotation `(): (() => Promise<void>)[] \| null`, returning a list | compiles | compiles | TS2416 |
| a `readonly` list | TS2416 | TS2416 | TS2416 |

With `noImplicitOverride: true`:

| base member | implementation without `override` | with `override` |
| --- | --- | --- |
| abstract (today) | compiles | compiles |
| concrete default | TS4114 | compiles |
| optional bodiless method (`hook?()`) | TS4114 | compiles |

A subclass member with the same name as a TypeScript-`private` member of the base fails with TS2415; an ECMAScript
`#private` member does not collide, at compile time or at runtime (verified). A base accessor cannot be redeclared as
a property in a subclass (TS2610, verified); a base property can.

### 2.6 Cost

P4: `dist` `PageObject` subclasses with N paths (sections of ten; role, test id, text and label strategies; every
fifth path with a `has` reference and an `nth` step), real `Page`, median of 500 constructions (200 for N ≥ 500)
after warm-up, p95 in parentheses. The two prototype columns define at the first use and lack the URL, storage and
navigation helpers:

| N paths | construction today | `defineLocators()` only | `verify()` only | prototype: construction | prototype: construction + first use |
| --- | --- | --- | --- | --- | --- |
| 0 | 10 µs (16) | 0 µs | 0 µs | 1 µs | |
| 10 | 19 µs (62) | 5 µs | 9 µs | 0 µs | 26 µs |
| 50 | 61 µs (97) | 11 µs | 38 µs | 0 µs | 51 µs |
| 150 | 146 µs (186) | 28 µs | 117 µs | 0 µs | 150 µs |
| 500 | 505 µs (675) | 107 µs | 390 µs | 0 µs | 500 µs |
| 1000 | 1092 µs (1467) | 204 µs | 796 µs | 0 µs | 1072 µs |

About 1 µs per path, four fifths of it verification, plus about 10 µs of fixed cost (URL composition, the storage
and navigation helpers). The scheduled check adds about 1.2 µs per construction (P8, Node, 200,000 constructions:
1.1 µs to capture the site as an `Error` and 0.06 µs to schedule; formatting the stack, which happens only on
failure, costs 2.2 µs), so 3.0.0 costs what 2.1 costs plus about 1.2 µs. The surveyed project's largest locator file has 66 registrations
and a page object composes up to seven modules; the median file has 10. The facade's per-call check costs nothing
measurable: 200,000 `getLocatorSchema` calls took 600 to 680 ns each through the raw accessor and through the
facade, in alternating runs (P3).

### 2.7 Harness and survey

- Harness page objects ([test/page-object-models/testApp/pages/](../test/page-object-models/testApp/pages)): ten
  classes, all with the 2.x annotation; six return `[]` (`iframe`, `testfilters`, `testids`, `testnav-item`,
  `testPath`, `[color]/color`), two return a list that increments a counter (`testPage`, `testnav`), two return
  `null` (`teststorage`, `teststorage-second`); every `defineLocators()` is `defineLocators(this.locatorRegistry)`
  with a module function. Eleven inline classes in specs return `null` without an annotation:
  [testNav.spec.ts:9-79](../test/tests/testApp/testNav.spec.ts#L9-L79) (six),
  [urls.spec.ts:8-30](../test/tests/pageObject/urls.spec.ts#L8-L30) (two),
  [verify.spec.ts:10-35](../test/tests/pageObject/verify.spec.ts#L10-L35) (two) and
  [sessionStorage.spec.ts:442-452](../test/tests/testApp/sessionStorage.spec.ts#L442-L452) (one).
- [verify.spec.ts:45-49](../test/tests/pageObject/verify.spec.ts#L45-L49) asserts that `new` throws for a typo,
  which no longer holds (1.4); [L51-55](../test/tests/pageObject/verify.spec.ts#L51-L55) relies on the fixture page
  objects being verified before the body, which still holds. The counters in
  [testNav.spec.ts:82-99](../test/tests/testApp/testNav.spec.ts#L82-L99) and
  [testPage.spec.ts:3-9](../test/tests/testApp/testPage.spec.ts#L3-L9) read a field from an action closure, which
  works today because the closure reads `this` when it runs, and keep working.
  [urls.spec.ts](../test/tests/pageObject/urls.spec.ts) asserts construction-time URL validation, which stays in the
  constructor, before the check is scheduled.
- Nothing tests what a definition or an action sees of subclass state, or when the hook is evaluated.
- Survey of one 2.1.0 consumer project: 23 page objects through one base class; every `defineLocators()` is a
  module call with `this.locatorRegistry` and reads no other instance state; no `this.locatorRegistry` use outside
  `defineLocators()`; 177 accessor calls through `this.`; no field initialiser calls an accessor; the hook: 22
  non-empty lists, 1 `[]`, 0 `null`, all 23 with the explicit 2.x annotation; the actions call
  `this.getNestedLocator(...)`; `noImplicitOverride` is not set and no `override` keyword is used. Nothing there
  changes behaviour under this plan.

### 2.8 What is sound

The accessor surface and its types; `defineLocators(this.locatorRegistry)` with module functions and the composition
overloads; URL validation at construction; the navigation helper's options and step titles; the action closures,
which already read `this` when they run; `verify()` itself; the compile-time checks, which catch the commonest
registry mistakes before anything runs (P10).

---

## 3. Design

### 3.1 The lifecycle in `PageObject`

```ts
export abstract class PageObject<LocatorSchemaPathType extends string, Options extends UrlTypeOptions = …> {
	// page, baseUrl, urlPath, fullUrl, label, sessionStorage, navigation: unchanged
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;
	#locators: "pending" | "defining" | "defined" | { failure: Error } = "pending";

	protected constructor(page, baseUrl, urlPath, options?) {
		// URL validation, fullUrl, label, sessionStorage: unchanged (L72-83, L91-95)
		const { registry, add, getLocator, getLocatorSchema, getNestedLocator } =
			createRegistryWithAccessors<LocatorSchemaPathType>(page);      // as today, L84-85
		const define = () => this.#defineLocatorsOnce(registry);       // returns true when it ran just now
		const first = <F extends (...args: never[]) => unknown>(fn: F): F =>
			((...args: Parameters<F>) => {
				define();
				return fn(...args);
			}) as F;
		this.locatorRegistry = {
			add: first(add),
			createReusable: registry.createReusable,
			getLocator: first(getLocator),
			getLocatorSchema: first(getLocatorSchema),
			getNestedLocator: first(getNestedLocator),
			verify: () => {
				if (!define()) registry.verify();                          // the first run verifies once, not twice
			},
		};
		this.add = this.locatorRegistry.add;
		this.getLocator = this.locatorRegistry.getLocator;
		this.getLocatorSchema = this.locatorRegistry.getLocatorSchema;
		this.getNestedLocator = this.locatorRegistry.getNestedLocator;
		this.navigation = createNavigation(page, baseUrl, urlPath, this.fullUrl, label,
			() => this.pageActionsToPerformAfterNavigation(), options?.navOptions);

		// last, after everything above that can throw: define and verify once the code that called `new` is done
		const site = new Error();                                       // its stack is formatted only on failure
		queueMicrotask(() => {
			if (this.#locators !== "pending") return;                    // a locator call already ran it, or it failed
			try {
				define();
			} catch (error) {
				throw atConstructionSite(error as Error, site);            // stack: the frames outside POMWright
			}
		});
	}

	#defineLocatorsOnce(registry: LocatorRegistry<LocatorSchemaPathType>): boolean {
		if (this.#locators === "defined" || this.#locators === "defining") return false;
		if (typeof this.#locators === "object") throw this.#locators.failure;
		this.#locators = "defining";
		let step = "define";
		try {
			this.defineLocators();
			step = "verify";
			registry.verify();
			this.#locators = "defined";
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const failure = new Error(
				step === "define" ? `${this.label}: defineLocators() failed: ${message}` : `${this.label}: ${message}`,
				{ cause: error },
			);
			this.#locators = { failure };
			throw failure;
		}
	}

	protected abstract defineLocators(): void;

	/** Actions run after `goto()` without a target and after `expectThisPage()`. Called each time they run; none by default. */
	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
```

`atConstructionSite` rewrites the failure's stack to `name: message` followed by the site's frames that are not in
`pageObject.ts` or in POMWright's `dist`, the same technique as `captureCallSite` and `atSite` in
[sessionStorageSeed.ts:168-182](../src/helpers/sessionStorageSeed.ts#L168-L182), except that the site is kept as an
`Error` and formatted only on failure (2.6). It is a private helper in `pageObject.ts`; sharing one helper with
`seed` is a plan 8 cleanup. The rewritten stack belongs to the stored failure, so a later use that rethrows it (in a
hook's body, 1.4) points at the construction site too. The only cast is the one in `first`, which keeps each accessor's generic signature; the
facade then satisfies `LocatorRegistry<LocatorSchemaPathType>` without casts (P3, strict, built exactly this way from
the accessors of `createRegistryWithAccessors`, which is unchanged). The state is an ECMAScript private member so
that it cannot collide with a subclass member (2.5, 7.10). Wording of the two message templates and the names may be
settled at execution.

### 3.2 When to run the definition: options

| option | definitions see the whole instance | a registry mistake fails | covers direct `this.locatorRegistry` use |
| --- | --- | --- | --- |
| 2.1: inside the constructor | no (1.7) | at `new` | n/a |
| A. at the first locator call only (the first draft of this plan) | yes | at the first locator call, wherever that is; a page object never used is never checked (P5b) | yes, through the facade |
| **B. right after construction (a scheduled check), or at the first locator call if earlier** (chosen, 7.1) | yes, except values assigned after an `await` that follows `new` | right after `new`: in a fixture, before the body, at the construction site (P8) | yes, through the facade |
| C. an explicit initialiser: the subclass calls `this.init()` last, or a static `create()` | yes | at the call | yes |

B keeps the fail-fast behaviour of 2.1 and plan 1.6-1.8 for every page object built in a fixture, which is how page
objects are normally built, and needs nothing from the author. A alone moves every runtime registry mistake from
fixture setup to whichever step first touches a locator, and never checks a page object that a test constructs but
does not use. C is boilerplate in every page object, is forgotten silently, and a static `create()` breaks `new
LoginPage(page)` in fixtures. The first draft rejected the scheduled check on the assumption that its errors would
escape the test; P8 showed that Playwright fails the running test with them, and with the site captured they are
reported like 2.1's. The first-call trigger stays in B because a use can come before the check (a field initialiser,
`new X(page).get…` in one statement), and because it is what makes direct use of the protected registry safe.

Covering direct `this.locatorRegistry` use (both A and B need it):

| mechanism | triggers on | cost |
| --- | --- | --- |
| **a facade** (chosen, 7.2): `locatorRegistry` holds an object with the six members, whose methods ensure the definition | method calls only; `createReusable` and merely reading the member do not (P3) | one generic helper with one cast, in `pageObject.ts`; the member stays a property of the same type |
| a getter: `protected get locatorRegistry()` ensures the definition and returns the registry; the accessors are wrapped | any read of the member, including `createReusable` and passing it on (P3) | the member becomes an accessor, so a subclass that redeclares it (`protected declare readonly locatorRegistry: …`) stops compiling with TS2610 |
| a hook in `LocatorRegistryInternal` called at the top of its public methods | method calls | a page-object concern in the registry, a branch standalone registries never use, in the file plan 9 restructures |

### 3.3 Errors and the failed state

Wrapped, labelled, with `cause`, sticky; the scheduled check's errors carry the construction site (1.4). Rejected:
mutating the original message (2.4, P7); rethrowing the original unchanged (the message would not say which page
object, and the scheduled check's stack would contain no user frame); retrying `defineLocators()` on the next use (it
would re-register into the partial registry and report duplicate paths instead of the real error); a check that
reruns after a deliberate catch (it would fail a test that caught the error on purpose, P9b).

### 3.4 Actions at use

`createNavigation` takes `actions: () => (() => Promise<void>)[] | null` (default `() => null`), `Navigation` stores
the function, and `executeActions` becomes

```ts
private async executeActions() {
	for (const action of this.actions() ?? []) {
		await action();
	}
}
```

called from the same two places as today ([L125-127](../src/helpers/navigation.ts#L125-L127),
[L145-147](../src/helpers/navigation.ts#L145-L147)). Rejected: evaluating once at the first run and caching, which
hides later state changes and adds a second lifecycle; evaluating before `page.goto`, which would let a hook read the
page before the navigation it follows.

### 3.5 The optional hook and `null`

Options for the hook: **a concrete default returning `[]`** (chosen, 7.6); keep it abstract (the boilerplate the
section 2 bullet is about stays); an optional bodiless method (`hook?()`), which has the same TS4114 cost under
`noImplicitOverride` (2.5) and needs `?.()` at the call site, for no gain. The cost of this choice: a consumer
with `noImplicitOverride: true` gets TS4114 on every existing implementation until it adds `override` or deletes the
method; the surveyed project and the harness do not set the flag.

Options for `null`: **keep it in the return type, documented as identical to `[]`** (chosen, 7.7), or drop it. Dropping
it changes no behaviour and fails to compile on every page object that carries the 2.x annotation (all 23 surveyed,
all 10 harness page objects) and on the 13 harness classes that return `null`; each fix is mechanical (delete the
method, or delete `| null`), but it is churn for a type nicety, and the two spellings have always behaved the same.

### 3.6 `defineLocators()` stays abstract

A page object without locators is rare, and the abstract method is what tells an author where the definitions go.
Rejected: an empty default.

### 3.7 One registry per instance (analysis 3.7)

Each instance keeps its own registry and defines it once, right after construction. No per-class cache: definitions
may now read instance state, which is the point of 1.7, so a cache keyed by class would hand one instance's
definitions to another (P3: two instances with `nb` and `en` resolve `Logg inn` and `Log in`); and the cost is about
1 µs per path per construction (2.6), the same as in 2.1. Tick 3.7 *Skip* with this as the note, and document it in
`PageObject.md`.

### 3.8 Public surface

No new export from [index.ts](../index.ts), no new member, no type change on `PageObject` except that
`pageActionsToPerformAfterNavigation` is no longer abstract (the `.d.ts` loses its `abstract` keyword). `PageObject`
gains an ECMAScript private member, which appears in the `.d.ts` as `#private;` and is invisible to consumers.
`createNavigation`'s actions parameter changes; it is internal. `LocatorRegistry`, `createRegistryWithAccessors` and
the accessor types are unchanged.

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. [pageObject.ts](../src/pageObject.ts): the lifecycle of 3.1 replaces L86-90 and L97-107, with the scheduled check
   and the private `atConstructionSite` helper as the constructor's last statements; the hook gets its default
   (L111).
2. [navigation.ts](../src/helpers/navigation.ts): the provider (3.4) at L42, L50, L54, L69-73 and L177; the doc
   comment of `runPostNavigationActions` (L21) says the hook is called when the actions run.
3. No new dependency, no export change.

### 4.2 Fixture and harness (`test/`)

- No server change: the specs use `/testnav` ([server.js:266](../test/server.js#L266)), whose links have distinct
  names and ids.
- The six harness page objects returning `[]` lose the method, so most specs run through the default; `testPage`
  and `testnav` keep their lists; `teststorage` and `teststorage-second` keep `return null`, so the 2.x form stays
  covered with its annotation; the eleven inline classes stay as they are.
- New and changed specs per 5.2.

### 4.3 Docs (`docs/v3` only)

[PageObject.md](../docs/v3/PageObject.md):

- [L1](../docs/v3/PageObject.md#L1) and [L5](../docs/v3/PageObject.md#L5) say v2: left to plan 10 with the other
  version labels.
- [L144-160](../docs/v3/PageObject.md#L144-L160) *Required abstract methods* becomes *Hooks and lifecycle*, written
  for authors, in the order of 1.1: what `defineLocators()` may read and when it runs (right after construction, or
  at the first locator call if earlier; once); verification right after it; how a registry mistake is reported (in
  the fixture, labelled, at the construction site; `new` itself does not throw; what `beforeEach` and `beforeAll`
  groups report, by mode (1.4); asserting such an error in a test through a first use); the edge cases of 1.7 (values assigned after an `await`,
  field initialisers that resolve, with a getter as the recommended form, constructors that throw after `super()`);
  `pageActionsToPerformAfterNavigation()` optional, called each time the actions run, `[]` and `null` both mean
  none, omit the method instead. This is the 1.7 warning of section 5 bullet [L70], written as the contract, since
  the trap is gone, and bullet [L77].
- A short *One registry per instance* paragraph (3.7) with the cost.
- [L237](../docs/v3/PageObject.md#L237) and [L239](../docs/v3/PageObject.md#L239): the hook is called when the
  actions run.
- The five `return [];` hooks in the examples at [L275-277](../docs/v3/PageObject.md#L275-L277),
  [L316-318](../docs/v3/PageObject.md#L316-L318), [L339-341](../docs/v3/PageObject.md#L339-L341),
  [L360-362](../docs/v3/PageObject.md#L360-L362) and [L381-383](../docs/v3/PageObject.md#L381-L383) go.
- [L392-406](../docs/v3/PageObject.md#L392-L406) *Migration from 2.x* gains: definitions see the whole instance;
  `new` no longer throws for registry mistakes (the check right after it does, in the fixture); the hook is optional
  and evaluated per run; `noImplicitOverride` users add `override` or delete the hook.
- [L449-461](../docs/v3/PageObject.md#L449-L461): `new LoginPage(page)` and the unused `type Page` import line go
  (section 5 bullet [L279]).

[overview.md](../docs/v3/overview.md): [L23](../docs/v3/overview.md#L23) (`defineLocators()` is required, the hook
optional); [L73](../docs/v3/overview.md#L73) and [L80](../docs/v3/overview.md#L80) (the `page as Page` cast and its
import); [L286-290](../docs/v3/overview.md#L286-L290) (`[]` and `null` are the same, omit the method);
[L312-313](../docs/v3/overview.md#L312-L313) (called when the actions run); [L335](../docs/v3/overview.md#L335)
(the comment names `defineLocators` only); [L421](../docs/v3/overview.md#L421) (the contracts line).

[locator-registry.md](../docs/v3/locator-registry.md): [L301-303](../docs/v3/locator-registry.md#L301-L303) ("the
page object's constructor fails" becomes "the check right after the page object's construction fails") and
[L576-579](../docs/v3/locator-registry.md#L576-L579) (the same, plus the label and the construction site); the
migration bullet at [L953-954](../docs/v3/locator-registry.md#L953-L954) keeps "in the fixture".

[composing-locator-modules.md](../docs/v3/composing-locator-modules.md): the boilerplate hook at
[L162-163](../docs/v3/composing-locator-modules.md#L162-L163) goes, and a new section *Passing page-object state to a
module* shows a locator module that takes an extra argument (a locale) with the overload pattern of
[L55-98](../docs/v3/composing-locator-modules.md#L55-L98), the page object calling
`defineLocators(this.locatorRegistry, this.locale)`, and a parent module passing the argument on (P15), with one
sentence on why it works in 3.0.0 and passed `undefined` in 2.x. The *Hooks and lifecycle* section of `PageObject.md`
points to it. [session-storage.md:235](../docs/v3/session-storage.md#L235): the mention of the boilerplate hook goes.

Section 5 bullets closed by this plan: `PageObject.md` [L70], [L77], [L279].

### 4.4 Changeset

`.changeset/pageobject-lifecycle.md`, `"pomwright": major`, under *Breaking changes*:

- `defineLocators()` and the registry verification run right after the page object is constructed (once the code
  that called `new` has finished), or at its first locator call if that comes earlier, instead of inside the base
  constructor, so `defineLocators()` can read constructor arguments, field initialisers and constructor-body
  assignments. A registry mistake still fails the fixture before the test body, now with the page object's label in
  the message, the construction site in the stack and the original error as `cause`, but `new` itself no longer
  throws for it. Migration: a test that expects `new X(page)` to throw for a registry mistake expects a first use to
  throw (`expect(() => new X(page).getNestedLocator(path)).toThrow(…)`). A page object built in `beforeEach` or
  `beforeAll` fails the tests the hook runs for, but each body runs until its first use of that page object; in a
  `beforeAll` group that is not `serial`, every test of the group fails instead of the first failing and the rest
  not running. A value
  assigned to a page object after an `await` that follows `new` is not seen by `defineLocators()`; pass it to the
  constructor.
- `pageActionsToPerformAfterNavigation()` is optional (default: no actions) and is called each time the actions run
  rather than once at construction. Migration: delete implementations that return `[]` or `null`; with
  `noImplicitOverride`, add `override` to the ones that stay.

Under *Fixes*: analysis 1.7. The unreleased
[registration-guards-and-frames.md](../.changeset/registration-guards-and-frames.md) says a page object verifies
"right after `defineLocators()`" and that a mistake "fails at construction" (L9, L38-40); both stay true in the
sense a reader takes them (in the fixture), so it is not edited.

### 4.5 Analysis, release notes, decisions, AGENTS.md, PLANS.md

At agreement (2026-10-13, done with this revision): [DECISIONS.md](DECISIONS.md) gets this plan's section, and the
plan 1.6-1.8 row that says `PageObject` calls `verify()` right after `defineLocators()` and that "plan 5 moves the
call together with the lazy definition" is amended to point here; [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)
gets the items marked *planned*: a breaking item for the lifecycle and the hook with the migration of 4.4, a bug-fix
line for 1.7, the docs and tests lines and two upgrade checklist items, and its *Page objects verify their registry
after `defineLocators()`* section ([L199-205](RELEASE-NOTES-3.0.0.md#L199-L205)) says "right after construction, in
the fixture" where it said "at construction"; [PLANS.md](PLANS.md) row 5 reads "written 2026-10-13, decisions taken,
awaiting implementation".

At execution (step 6): tick *Fix* on 1.7 with the correction recorded in section 1.7 of this plan; *Skip* on 3.7
with the note of 3.7; the section 2 bullet ([L501-502](POMWRIGHT-2.1.0-ANALYSIS.md#L501-L502)); the three
`PageObject.md` bullets of section 5 ([L712-714](POMWRIGHT-2.1.0-ANALYSIS.md#L712-L714)). Flip the release-note
items to *done* and append any execution-time decisions to `DECISIONS.md`. [AGENTS.md](../AGENTS.md): the revision
line; the repo map rows for `src/` (the new unit-test file) and `src/pageObject.ts` (the deferred definition);
section 4 (spec count, the new specs); section 5, [L137](../AGENTS.md#L137): "`PageObject` runs `defineLocators()`
and `verify()` once, right after construction or at the first locator call if earlier, never inside its constructor;
a standalone registry calls `verify()` itself"; section 7 (the fifth pending changeset). [PLANS.md](PLANS.md) row 5
to executed.

---

## 5. Tests

### 5.1 Unit tests (vitest)

New `src/pageObject.test.ts`. Construction touches no `Page` method (the registry, the storage helper and the
navigation helper only store it: [locatorRegistry.ts:69-71](../src/locators/locatorRegistry.ts#L69-L71),
[sessionStorage.ts:162-169](../src/helpers/sessionStorage.ts#L162-L169), [navigation.ts:44-55](../src/helpers/navigation.ts#L44-L55)),
so a `PageObject` subclass is constructed with a recording stub page whose methods return a chainable stub (a
`Proxy`), as [utils.test.ts:125-134](../src/locators/utils.test.ts#L125-L134) does for `createLocator`. The
scheduled check is captured by `vi.spyOn(globalThis, "queueMicrotask")` with an implementation that records the
callback instead of scheduling it, installed immediately before the `new` expression and restored immediately after:
in that synchronous window nothing but `PageObject` schedules, whereas a spy left in place would also swallow
microtasks that vitest and Node schedule. Each test then runs the recorded callback where it can assert on it, and
nothing is thrown outside a test:

- Construction calls `defineLocators()` zero times and schedules one check; running the check calls
  `defineLocators()` once and `verify()` once (counted with `vi.spyOn(LocatorRegistryInternal.prototype, "verify")`);
  running it again, or any number of later locator calls, changes neither count.
- A locator call before the check (each trigger of the 1.3 table: `add`, `getLocator`, `getNestedLocator`,
  `getLocatorSchema`, a destructured accessor, each `this.locatorRegistry` method) defines and verifies once; the
  check then does nothing; `createReusable` and reading the member do not trigger.
- `defineLocators()` sees a parameter property, a field initialiser, a constructor-body assignment and a value set
  synchronously after `new` (the definitions recorded on the stub carry the values).
- Re-entrancy: `this.getLocator(path)` and `this.locatorRegistry.verify()` inside `defineLocators()` work on the
  paths registered so far and do not recurse.
- Failures through the check: a duplicate path throws `<label>: defineLocators() failed: A locator schema with the
  path …` with the original as `cause` and a stack whose first frame is in the test file (the subclass's `super(...)`
  line, then the `new` line), not in `pageObject.ts`; a `TypeError` in the subclass gives the same template with the `TypeError` as `cause`; a
  verification failure gives `<label>: Locator registry verification failed …`; a later locator call throws the same
  object and `defineLocators()` ran once; the label option is used when given.
- Failures through a first use: the same messages, thrown at the call; the check then does nothing (no second throw).
- A subclass constructor that throws after `super()`: `new` throws the subclass's error and the captured check,
  run afterwards, does nothing more when the definition reads only state that is set.
- Types: a subclass without the actions hook compiles; `return []`, `return null`, a list, and the 2.x annotation
  compile; a subclass without `defineLocators()` is a TS2515 (`@ts-expect-error`); `expectTypeOf` the
  `locatorRegistry` member is `LocatorRegistry<Paths>` (through a subclass method) and the accessors keep their
  types; a module function typed `LocatorRegistry<ModulePaths | ExternalPaths>` accepts `this.locatorRegistry`.

[navigation.test.ts](../src/helpers/navigation.test.ts): the three `null` arguments (L50, L86, L96) become
`() => null` or are omitted. The actions themselves run inside `test.step` and are tested in the runner.

### 5.2 Integration tests (Playwright, `test/`)

New `test/tests/pageObject/lifecycle.spec.ts` (tarball-level), against `/testnav` DOM:

- A page object whose `defineLocators()` picks a link by a parameter property (`getByRole("link", { name:
  this.linkName })`), builds an id from a field initialiser, and branches on a constructor-body assignment: each
  resolves to the expected element (`toHaveId`, `toHaveText`), for two instances with different arguments, built in
  a fixture and in the test body.
- A value assigned synchronously after `new` is seen; one assigned after an `await` is not (the documented edge).
- `this.locatorRegistry.getNestedLocator` in a page-object method and a destructured accessor resolve against DOM;
  a counting subclass shows one definition across construction and many uses.
- Registry mistakes, through a first use in the body, constructed and used with no `await` in between so that the
  use comes before the check: `expect(() => new Typo(page).getNestedLocator(…)).toThrowError(
  "Typo: Locator registry verification failed for 1 of 2 paths: …")`, `error.cause` is the verification error, a
  second call throws the same message, and the test passes (the check does not fail it afterwards); a duplicate path
  gives `<label>: defineLocators() failed: A locator schema with the path …`.
- Registry mistakes, through the check: `test.fail("…", async ({ brokenPage }) => {})` declarations with a fixture
  that builds a page object with a `has` typo, and one with a duplicate path, so the suite proves the fixture fails
  before the body (P9a2), and one in a group whose `beforeEach` builds a broken page object; the message and the
  stack are asserted in the unit tests (5.1).
- A field initialiser that resolves a locator (`readonly heading = this.getNestedLocator("body.heading")`) works and
  sees a parameter property under the runner's transform: pins the fact the docs state (2.2).
- A subclass constructor that validates an argument after `super()` and throws: `expect(() => new
  Strict(page, "")).toThrow(…)` passes when its definition reads only parameter properties; one that validates
  before `super()`, the documented form (P12), passes the same assertion and schedules nothing.

New `test/tests/pageObject/actions.spec.ts` (tarball-level), against `/testnav`:

- A page object without the hook navigates with `goto()` and `expectThisPage()`.
- A hook that reads a parameter property (`this.withAction ? [action] : []`) runs the action when constructed with
  `true` and not with `false`.
- The hook is not called at construction, is called once per `goto()` and per `expectThisPage()`, and not for
  `goto(target)`, `expectAnotherPage()` or `runPostNavigationActions: false` (a counter in the hook).
- A hook whose result depends on state changed by the test between two `goto()` calls returns the new list.
- `return null` and `return []` behave identically (both navigate, no action runs).

[verify.spec.ts](../test/tests/pageObject/verify.spec.ts): [L45-49](../test/tests/pageObject/verify.spec.ts#L45-L49)
becomes "the first use throws naming the page object and the path" (`expect(() => new
Typo(page).getNestedLocator("list.item")).toThrowError("Typo: Locator registry verification failed …")`), the
old-contract expectation (7.12); [L51-55](../test/tests/pageObject/verify.spec.ts#L51-L55) stays: the fixture page
objects are verified by the check before the body. The comment at L5-6 says "right after construction".

Every other spec stays green unchanged, including the navigation counters, the eleven inline classes and
`urls.spec.ts`. One-off local runs of the two new specs and `verify.spec.ts` on `firefox` and `webkit`.

**Running**: `./pack-build.sh`, then in `test/` `pnpm add -D "pomwright@file:../pomwright-test-build.tgz"
--ignore-scripts` and `pnpm exec playwright test --project=chromium --reporter=line` (AGENTS.md section 3). The
`pageObject/` specs and the page objects run against the tarball.

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: `new` no longer throws for a registry mistake (the check right
after it does; a test that asserted a constructor throw changes); in `beforeEach`/`beforeAll` the body runs up to its
first use of a broken page object, and in a `beforeAll` group that is not `serial` every test fails where 2.1 failed
the first and did not run the rest; a value assigned after an `await` that follows `new` is not seen by the
definition (in 2.1 the definition saw no value assigned after `super()` at all); the actions hook is evaluated per run instead of once (a
hook with side effects runs per navigation); TS4114 for `noImplicitOverride` users who keep the hook;
`this.locatorRegistry` is a facade rather than the registry instance (the type is unchanged; only identity checks
against an internal class could notice). Each has a migration line in 4.4. The optional hook is an addition.

---

## 7. Decisions

Taken with the user on 2026-10-13; the chosen option is stated first in each. 7.1, 7.3, 7.4, 7.9 and 7.12 to 7.16
were amended in the review before they were taken; 7.13 gained the locator-module example afterwards, and P14 corrected
what the plan said about `beforeAll` groups (1.4) without changing a decision.

- [x] 7.1 Fix 1.7 by deferring the definition: `PageObject` no longer calls `defineLocators()` from its constructor;
  it runs right after construction, in a check scheduled as the constructor's last statement (a microtask, so after
  the code that called `new`), or at the first locator call if that comes earlier; once per instance. Rejected: the
  first use only (moves fail-fast from fixture setup to the first locator call and never checks an unused page
  object); an explicit initialiser (`init()` or a static `create()`); keeping the call in the constructor with a
  documented warning.
- [x] 7.2 Direct use of the protected registry is covered by a facade: `locatorRegistry` holds an object with the six
  `LocatorRegistry` members whose methods ensure the definition; the four accessors are its methods;
  `createReusable` passes through and does not trigger; the member's type is unchanged. Rejected: a
  `locatorRegistry` getter (triggers on any read; TS2610 for a subclass that redeclares the member); a hook inside
  `LocatorRegistryInternal`.
- [x] 7.3 The automatic `verify()` moves with the definition: right after `defineLocators()`, in the same run,
  exactly once per instance, no opt-out; standalone registries unchanged.
- [x] 7.4 Errors: `<label>: defineLocators() failed: <message>` for anything thrown inside the definition,
  `<label>: <verification message>` for verification, each a new `Error` with the original as `cause`; an error
  raised by the scheduled check has its stack rewritten to the construction site (frames outside POMWright, as
  `seed` errors since plan 1.5); sticky: every later use rethrows the same error, the definition is not retried, and
  the check does nothing once the definition has run or failed, so a deliberately caught error does not fail the test
  afterwards. Rejected: mutating the original message; rethrowing it unchanged; retrying; a check that reruns after
  a failure.
- [x] 7.5 Actions at use: `createNavigation` takes a provider; the hook is called each time the actions run, after
  the navigation or wait, never at construction, not cached.
- [x] 7.6 The actions hook gets a default returning `[]` and is no longer abstract. Rejected: keeping it abstract;
  an optional bodiless method. Accepted cost: TS4114 for `noImplicitOverride` users until they add `override` or
  delete the method.
- [x] 7.7 `null` stays in the hook's return type and means no actions, exactly as `[]`; the docs say so and
  recommend omitting the method. Rejected: dropping `null` (a compile error on every page object with the 2.x
  annotation, 23 of 23 surveyed, for no behaviour change).
- [x] 7.8 `defineLocators()` stays abstract. Rejected: an empty default.
- [x] 7.9 Analysis 3.7: one registry per instance, defined once right after construction; no per-class cache
  (incorrect once definitions read instance state; about 1 µs per path per construction, as in 2.1); ticked *Skip*
  and documented.
- [x] 7.10 The lifecycle state is an ECMAScript `#private` member of `PageObject`. Rejected: a TypeScript `private`
  member (TS2415 for a subclass member of the same name).
- [x] 7.11 Documented, not guarded: a field initialiser that resolves a locator (it runs the definition there; a
  getter is the recommended form), a value assigned after an `await` that follows `new` (not seen; pass it to the
  constructor), a subclass constructor that throws after `super()` (the check still runs on the discarded instance;
  validate before `super()`, P12, or keep the definition independent of the arguments), and an `undefined` option value
  (registered as written, as in Playwright).
- [x] 7.12 Harness: new `pageObject/lifecycle.spec.ts` and `pageObject/actions.spec.ts` against `/testnav`, no new
  route; the scheduled check covered end to end with `test.fail("…", …)` declarations and in detail by the unit
  tests; `verify.spec.ts:45-49` asserts on a first use instead of `new` (the old-contract expectation), L51-55
  unchanged; the six harness page objects returning `[]` drop the hook, the two returning `null` and the two with
  lists keep theirs, the eleven inline classes stay.
- [x] 7.13 Docs: the `PageObject.md` sections of 4.3, written for authors with the 1.1 example, the `PageObject`
  parts of `overview.md` including its `page as Page` cast, two places in `locator-registry.md`, a new section in
  `composing-locator-modules.md` showing a locator module that takes page-object state as an extra argument
  (`defineLocators(this.locatorRegistry, this.locale)`, added 2026-10-13 after the review), the boilerplate hook
  removed there and its mention in `session-storage.md`; section 5 `PageObject.md` bullets [L70], [L77], [L279]
  close here.
- [x] 7.14 Unit layer: new `src/pageObject.test.ts` with a stub page and the scheduled check captured through a spy,
  for the lifecycle, the errors and their stacks, the triggers and the types; `navigation.test.ts` adopts the
  provider; the actions and DOM in the runner.
- [x] 7.15 One `major` changeset, `pageobject-lifecycle`; the unreleased `registration-guards-and-frames` changeset
  is not edited (its "right after `defineLocators()`" and "fails at construction" still describe what a reader sees).
- [x] 7.16 The construction site is captured as an `Error` at the end of `PageObject`'s constructor and formatted
  only on failure, by a private helper in `pageObject.ts` modelled on `captureCallSite`/`atSite`; sharing one helper
  with `seed` is left to plan 8.

> Notes:

---

## 8. Execution order

1. `pageObject.ts` and `navigation.ts` with `src/pageObject.test.ts` first (red, then green) and the
   `navigation.test.ts` change; `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`.
2. Harness: the six page objects, `lifecycle.spec.ts`, `actions.spec.ts`, the `verify.spec.ts` change; pack, add the
   tarball, run the chromium project; run the two new specs and `verify.spec.ts` once on `firefox` and `webkit`.
3. Docs in `docs/v3`.
4. Changeset.
5. Full run: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, the packed integration suite on chromium; fix
   anything red.
6. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md` status.
