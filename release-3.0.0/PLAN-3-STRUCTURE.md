# Plan: structure (analysis items 3.1, 3.3, 3.4, 3.5 and 3.8, and the debug-step record of section 2)

Working document, kept in `release-3.0.0/` beside the analysis it answers: item 3.1 (eight parallel per-strategy
switches, a strategy table), 3.3 (the default `describe(path)` as an option; `debugSteps` or a `registry.explain(path)`),
3.4 (sparse chains as a silent failure mode, strict chains), 3.5 (path reuse returns `void`), 3.8 (seed builders mutate
in place), and the one open code bullet of section 2 (the debug-step record of `buildLocatorChain`, with its nullable
index, built and never read). It also settles the hand-overs of plans 1.9 and 1.10-2 listed under each item. File links
are relative to this folder.

Written 2026-10-15. Reviewed 2026-10-16: every decision in section 7 is taken. The review changed one recommendation
(3.4: an opt-in `strictChains`, decision 7.8), added two docs corrections it found (P15, decision 7.13), and closed a
gap the new path-reuse return opened (P16, decision 7.15: no steps or description on an any-frame definition, from any
source). The last review made 7.14 one rule for every builder (a primary Playwright cannot take throws) and added 7.16
(a seeded override takes `update`'s argument shapes and Merge Patch), after P17 showed that a seeded `{ exact: null }`
is stored as `null`, not deleted, as P15 had read from the rendered chain.

**Executed 2026-10-16** on `chore/bugfixes-quality-improvements-and-docs`, one commit per execution step: 555290c (1,
the strategy table with its unit and type tests; P3 byte-identical to 181475e over 5,355 DSL calls), 397ba26 (2, the
contract changes: immutable seeds, reuse by path returning `filter`/`nth`/`describe`, the reuse check, the debug-step
record removed, 7.14, 7.15 and 7.16, with their unit tests, 98 of which fail against step 1; the harness expectation
of a `void` path reuse stays red until step 4, as the order puts it), dd61a3e (3, `strictChains` with its unit tests,
red first; with the option in the harness's base class only the `testfilters` page object fails, 11 of 22 paths),
798120b (4, the harness: the changed path-reuse expectation, seeds and reuse by path against DOM, the new
`registry.strictChains.spec.ts`, the page-object case, the public-type and emit probes; 16 of the 46 tests in these
files and 19 lines of the type probe fail against 181475e), 6eee0ec (5, `docs/v3`, every new snippet compiled against
the packed package, also with `declaration: true`), 0850bf1 (6, the changesets `seeds-and-path-reuse`, major, and
`strict-chains`, minor), step 7 (the full run found nothing to fix, so it has no commit), and the ledger commit for
step 8 that carries this note. Final run: `pnpm format` and `pnpm lint` clean, 598 unit tests with no type errors,
`pnpm build`, `pnpm pack-test` 1281 passed (427 per browser) with both type checks, and the probes of 5.3 against the
final build: P3 equal to the final prototype's run (632 of 5,355 lines differ from 181475e, all in P17's classes), P4
1,024 differing helper calls in three classes none reachable from the DSL except through 7.16, P5 the table and the
builder type tests catch a strategy without its row or its methods, P6 identical descriptions and failure texts, P9 to
P11 and P14 to P18 as recorded. The execution-time decisions are in [DECISIONS.md](DECISIONS.md) (plan 9). The
review's handover folder (`handover-plan-3/`: the probe records, scripts and prototype patches cited above as
`prototype/…` and `scripts/…`) was a session artefact, never committed, and was deleted after execution at the user's
request; the probes' methods and results are summarised in this plan.

Every claim below was verified against HEAD 181475e (level with `origin`), never in the working tree, on 2026-10-15
(P1 to P13) and 2026-10-16 (P14 to P18):
three fresh clones in the session scratchpad, each with `pnpm install --frozen-lockfile`, `pnpm build` and
`pnpm harness:install`: `head` for the current behaviour; `probe`, whose `verify()` writes every registered path and its
unregistered ancestors to a file; `proto` with two branches, `table` (the strategy table of 3.1 alone, a pure refactor)
and `contract` (the table plus the designs of 3.3, 3.5 and 3.8 as later decided), and on 2026-10-16 a third, `strict`
(`contract` plus `strictChains`), a fourth, `anyframe` (`strict` plus 7.15), and a fifth, `nullrule` (`anyframe` plus
7.14 and 7.16). Runtime probes are Node scripts against
each clone's `dist/index.js` with chromium from the same clone's root `@playwright/test` 1.64.0 (`createRequire` of its
`package.json`); runner probes are temporary specs in the clone's `test/tests/`, run on chromium with `--retries=0`, the
HTML report read back in chromium over a local HTTP server; helper-level probes bundle each clone's `src` with the
repository's esbuild; type probes use the repository's TypeScript 5.9.3 under the harness `tsconfig.json` (`strict`,
`noUncheckedIndexedAccess`, `verbatimModuleSyntax`), against the packed package, every negative case a consumed
`@ts-expect-error`, and once more with `declaration: true`; Node 24.19.0. Usage facts come from one 2.1.0 consumer
project, counts only. Example hosts are generic (`*.example`).

Probes cited below: **P1** every per-strategy switch, table and name list in `src/`, and an eleventh strategy added to
the definition types on HEAD (to the union alone, then to every type map): which places `tsc` reports; **P2** the
`table` prototype: `pnpm lint`, `pnpm test:unit`, `pnpm typecheck`, the chromium suite, line counts; **P3** a
differential matrix of DSL calls through the public API of HEAD and of the `table` prototype (every strategy, sixteen
argument forms, through `add`, `createReusable`, seeded `add` with every override, `update` and `replace` to every
strategy, duplicate registrations): the stored record with its key order, the rendered chain, or the error message;
**P4** the same comparison one level down, calling the exported helpers (`createLocator`, the clone, the seeded patch,
the merge, the replacement, `methodForStrategy`) directly, with inputs no DSL call produces; **P5** the eleventh
strategy against the `table` prototype; **P6** (runner) a locator with the path description, with none
(`describe("")`) and with a custom one: `toString()`, `description()`, an action's timeout error, an assertion's error,
a strict-mode violation, a described locator used as a `has` inner, a locator chained past a described one, the step
rows of the HTML report, and the step titles a reporter receives; **P7** who reads the debug-step record (grep);
**P8** sparse chains: the consumer project's 23 page-object locator modules run against a recording registry, and the
harness's chromium suite on the `probe` clone; **P9** what `add(path, { reuse })` returns and throws for a path, a seed,
`{}`, `42`, `null`, an array and a missing path, on HEAD and on the `contract` prototype; **P10** `tsc`: the types of
path reuse and seed reuse, the reuse values TypeScript rejects, the seed's `definition`, and declaration emit of a
function that returns a reuse, on HEAD and on the prototype; **P11** a base seed reused at one path and then changed
through `nth`, `filter` and `describe` to derive variants, against a real table, and a seed's `definition` changed
before `add`, on HEAD and on the prototype; **P12** the `contract` prototype: unit tests, `pnpm typecheck`, the chromium
suite; **P13** the consumer survey and the harness counts.

Added in the review on 2026-10-16, after the smoke set (P2, P3, P9, P11, P12) was re-run on fresh clones of 181475e with
the same results: **P14** the `strictChains` prototype (on top of the `contract` prototype): unit tests, `pnpm lint`,
`pnpm typecheck`, the chromium suite with the flag off, the same suite with the flag set in the harness's domain base
class, the types of the option and a compiled page object that sets every constructor option; **P15** what reuse by
path copies (strategy, steps, description) and what can follow a seeded `add` (the override's position, repeated
steps, `describe` twice, the override's option merge against `update`'s), on HEAD and on the `contract` prototype;
**P16** the final review's checks: reuse by path of an any-frame `frameLocator()` path and steps chained after it, a
hand-made seed with an any-frame definition, the positions of an any-frame copy with and without `strictChains`,
`describe` twice on `add(path)`, `describe("")` after a path reuse, on HEAD and on the prototype, then the 7.15
prototype (unit tests, `pnpm lint`, `pnpm typecheck`, the chromium suite); **P17** the primaries and seeded options:
the stored record of a seeded override with a `null` key, a lone `null` and a primary with `null` options, on HEAD;
then the 7.14 and 7.16 prototype: unit tests (red against `anyframe`, then green), `pnpm lint`, `pnpm typecheck`, the
chromium suite, and P3's matrix against HEAD, every differing line classified; **P18** 7.16 for every method: a seeded
override against `update()` on the same definition, every strategy and argument form, comparing stored records (not
rendered strings), on HEAD and on the prototype; and the seeded `null` forms and their negatives in `tsc` for every
method, against each packed package.

Out of scope, left to the plans listed in [PLANS.md](PLANS.md): the documentation sweep of the remaining section 5
bullets and the README fixes (plan 10); the Starlight site (release work). Two findings of the probes are outside the
analysis items and are decided separately (3.6): from JavaScript, a primary Playwright cannot take reaches the registry
on most builders (P3, 7.14), and a seeded override stores a `null` option key instead of deleting it (P17, 7.16).

---

## 1. Intended contract

### 1.1 In short, for consumers

Most of this plan is invisible: the ten strategies move into one table, and a record nobody reads goes. What a consumer
can notice:

**A seed is a value, like a Playwright `Locator`.** `filter`, `nth` and `describe` on a seed return a new seed and leave
the one they were called on as it was. Today they change the seed itself and return it, so variants derived from one
base seed pile their steps onto each other (P11):

```ts
// <table> with three rows
const row = registry.createReusable.locator("tr");
registry.add("table").locator("table");
registry.add("table.row", { reuse: row });
registry.add("table.row@first", { reuse: row.nth(0) });
registry.add("table.row@last", { reuse: row.nth("last") });

getNestedLocator("table.row@last");
// 2.1.0 and HEAD: row.nth(0) changed row, so this is locator('table').locator('tr').first().last(): the FIRST row
// 3.0.0:          locator('table').locator('tr').last(): the last row

const heading = registry.createReusable.getByRole("heading", { level: 2 });
registry.add("summary", { reuse: heading.describe("Summary heading").filter({ hasText: "Summary" }) });
registry.add("other", { reuse: heading.filter({ hasText: "Other" }) });
// 2.1.0 and HEAD: "other" is described "Summary heading" and filtered by both texts: it matches nothing
// 3.0.0:          "other" is getByRole('heading', { level: 2 }).filter({ hasText: 'Other' }), described "other"
```

The only code this changes is a seed changed by a statement and used afterwards, `seed.filter(f); add(p, { reuse: seed
})`, which now registers the seed without the filter; write `add(p, { reuse: seed.filter(f) })`. Neither the consumer
project nor this repository has such a statement (P13).

**Reuse by path returns `filter`, `nth` and `describe`.** A registered path is a seed, so `add(path, { reuse: "other"
})` gets what a seeded registration gets after its strategy:

```ts
registry.add("errors.invalidPassword").getByText("Invalid password");
registry.add("login.form.error", { reuse: "errors.invalidPassword" }).describe("Login error");
// 2.1.0 and HEAD: TS2339 Property 'describe' does not exist on type 'void'; from JavaScript a TypeError
// 3.0.0:          a copy of errors.invalidPassword at login.form.error, described "Login error"
```

Reuse by path copies the whole record, as it always has: the strategy, every `filter` and `nth` step, and an explicit
description; without one, the copy is described by its own new path (P15). Steps chained after it go after the copied
ones, and the source never changes:

```ts
registry.add("common.listItem").getByRole("listitem").filter({ has: page.locator("b") });
registry.add("main.list").locator("ul");
registry.add("main.list.lastItem", { reuse: "common.listItem" }).nth("last");
// locator('ul').getByRole('listitem').filter({ has: locator('b') }).last(), described "main.list.lastItem"
```

Reuse is reuse: the steps can narrow the reused locator but never take part of it away, so there is no strategy
override and no `clearSteps` after a path, because TypeScript does not know a path's strategy and because the result
would no longer be the locator at that path. A different base is registered as its own path (`common.listItem` above)
and narrowed where it is used; a variant with other options is a `createReusable` seed. This makes reuse by path the
preferred way to share a locator across locator modules (the path types are already composed, nothing is exported or
imported), and `createReusable` mainly a tool inside one module, which can still be shared through export and import.
One exception follows the any-frame rule of plan 1.6-1.8: an any-frame `frameLocator()` takes no steps and no
description, so `filter`, `nth` and `describe` on a copy of one throw at the call, as does a hand-made seed that carries
steps or a description on an any-frame definition (P16, 7.15); where the copy sits is checked by `verify()`, as for
every any-frame path. A value that is neither a path nor a seed (`{ reuse: null }` from JavaScript) throws `reuse
requires a registered path or a seed from createReusable for "login.form.error".` instead of a `TypeError`.

The three registration forms side by side (P15, P17; seeded `add` keeps its shape, its merge is 7.16's):

| form | strategy | then |
| --- | --- | --- |
| `add(path)` | exactly one of the ten methods | `filter`, `nth` in any order and any number, `describe` (the last wins) |
| `add(path, { reuse: "other" })` | the copy of `other` | the same, after the copied steps (none on a copy of an any-frame path, 7.15); 2.1.0 and HEAD: nothing (`void`) |
| `add(path, { reuse: seed })` | the seed's; optionally one override of the seed's strategy, as the first call, with `update`'s argument shapes and Merge Patch (7.16): `{ name: "Cancel" }` keeps the seed's `exact`, `{ exact: null }` deletes it, a lone `null` clears the options, `("link", null)` sets the role and clears the options | the same, with or without the override |

**Descriptions do not change; the docs say exactly where they show.** A resolved locator is still described with its
path unless `describe` says otherwise. P6 shows where it is visible: the path appears in the HTML report's step rows, in
an assertion error's `Locator:` line and in `toString()`; the chain Playwright actually waited for appears in every call
log and in every strict-mode violation, whatever the description.

**Sparse chains stay the default; `strictChains` is an opt-in.** A path segment without a registration is still a name
that groups paths and is left out of the chain: P8 shows that this is how the consumer project names its paths (85% of
its registrations have an unregistered ancestor such as `button` or `dialog`). A project that wants every segment
registered sets `strictChains: true`, and `verify()` then requires every proper ancestor of every path to be registered
(P14). The terminal path is always registered, in both modes. Without the option nothing changes:

```ts
// a standalone registry: checked when it calls verify()
const { registry } = createRegistryWithAccessors<Paths>(page, { strictChains: true });

// a page object: once in the domain base class, beside label, navOptions and sessionStorage
super(page, "https://shop.example", urlPath, { ...options, locators: { strictChains: true } });

// with main and main.form.button.save registered, verify() reports:
// "main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button" are not.
```

What a consumer can notice:

| where | 2.1.0 and HEAD | 3.0.0 |
| --- | --- | --- |
| `seed.filter(…)`, `seed.nth(…)`, `seed.describe(…)` | change the seed and return it (P11) | return a new seed; the seed is unchanged (7.11) |
| variants derived from one base seed after its first use | each variant carries the steps and description of the ones before it (P11) | each variant is the base plus its own step (7.11) |
| `seed.definition.options.name = "x"` before `add` | changes what the next `add` registers (P11) | changes a copy; no effect (7.11) |
| `add(path, { reuse: "other" })` | returns `undefined`, typed `void` (P9, P10) | returns `filter`, `nth`, `describe` (7.9) |
| `add(path, { reuse: "anyFrame" })` where `anyFrame` is `frameLocator()` | registers the copy, returns `undefined` | registers the copy; `filter`, `nth` and `describe` on it throw at the call; its position is checked by `verify()` (7.15) |
| a hand-made seed object with an any-frame definition and steps or a description | registered with them; `verify()` passes; the first resolution below it throws (P16) | throws at the `add` call; nothing registered (7.15) |
| `const r: void = add(path, { reuse: "other" })` | compiles | TS2322 (P10) |
| an expression-bodied arrow returning `add(path, { reuse: "other" })`, compiled with `declaration: true` | emits | TS4023, as for a seed reuse today; a block body or `: void` emits (P10) |
| `add(path, { reuse: {} })`, `{ reuse: 42 }`, `{ reuse: null }` from JavaScript | `TypeError: Cannot read properties of …` (P9) | `reuse requires a registered path or a seed from createReusable for "<path>".` (7.10) |
| a primary Playwright cannot take, from JavaScript: `null`, a number, an options object where the primary goes, a RegExp for a role, `locator` or `frameLocator` (`getByTestId(null)`, `frameLocator(null)`, `update().getByRole(42)`, `createReusable.getByText({ exact: true })`) | `add` already throws for some; elsewhere stored, then a `TypeError` at resolution, a nonsense locator (`getByTestId('42')`, `internal:role=[object Object]`, `locator('null')`) or a call that does nothing (P3, P17) | throws at the call with the missing-value message, on every builder (3.6, 7.14) |
| a seeded override with a `null` key, a lone `null`, or a primary with `null` options (`getByRole({ exact: null })`, `getByRole(null)`, `getByRole("link", null)`) | TypeScript rejects all three; from JavaScript the key is stored as `null` (`{ name: null }` then fails at resolution), a lone `null` changes nothing, `("link", null)` keeps the seed's options (P17) | compiles; as `update`: the key is deleted, the options are cleared (7.16) |
| the default description, `describe("")` | as documented | unchanged; documented with P6 (7.5) |
| a path with an unregistered ancestor | left out of the chain | unchanged by default; with `strictChains: true`, a `verify()` failure naming each unregistered ancestor (7.8) |
| `createRegistryWithAccessors(page, options)`, the `PageObject` option `locators` | | new, optional: `{ strictChains?: boolean }` (7.8) |
| everything else in the registry | | unchanged: P3 compares 5,355 DSL calls, byte-identical (7.1) |

### 1.2 Principles for this plan

- **Behaviour-preserving where the item is about code.** The strategy table (3.1) and the deleted debug-step record
  change no observable result: P3 is byte-identical over 5,355 DSL calls, and every existing unit test, type check and
  chromium test passes unchanged on the `table` prototype (P2).
- **Mirror Playwright.** A seed behaves like a `Locator`: every method returns a new value (3.8). Descriptions are
  Playwright's `describe`, and Playwright decides where a description shows (P6). A chain loosened by an unregistered
  segment is caught by Playwright's own strictness when it matches more than one element (P6); POMWright's own check is
  an opt-in for projects that register every segment (3.4).
- **Nothing changes after it is made.** Plan 1.10-2 made registered locators unchangeable; this plan makes seeds
  unchangeable as well (3.8).
- **Validate at runtime; add compile-time checks only where they cost users nothing.** A reuse value that is neither a
  path nor a seed is checked at the call (3.5), and so is a primary Playwright cannot take, on every builder (3.6); the
  type of path reuse offers exactly the calls that work, not ten overrides of which nine would throw (3.5); a new
  strategy without a table row or a builder method is a compile error (3.1).
- **No guard whose only purpose is to excuse a user mistake.** No default check and no warning for a naming pattern the
  surveyed project uses in 85% of its registrations (3.4); `strictChains` is a style rule a project chooses, off unless
  set; no option to switch off a default the survey relies on (3.3).
- **Failing fast at fixture setup matters.** The reuse check throws inside `defineLocators()`, so the fixture fails;
  `strictChains` is checked by `verify()`, which `PageObject` runs right after `defineLocators()`.
- **No new dependency.**

### 1.3 Edge cases, with the decided answer

| case | today (verified) | 3.0.0 as decided |
| --- | --- | --- |
| `const b = seed.nth(0)`, then `add(p, { reuse: seed })` | `seed` has the `nth(0)` (P11: `first === row` is `true`) | `seed` has no step; `b` has it (P11) |
| `seed.filter(f);` as a statement, then `add(p, { reuse: seed })` | the filter is registered | the filter is lost: the statement's result is discarded (TypeScript cannot flag a discarded result); none in the survey or the repository (P13) |
| `seed.definition` read twice | the same object (P11) | two copies (P11) |
| `seed.steps` read twice | two copies (P11) | unchanged |
| a hand-made object of the `ReusableLocator` type passed as `reuse` | accepted (structural type) | accepted: the check reads `definition.type` against the table, not `instanceof` (7.10) |
| `add(p, { reuse: "other" }).describe("d").nth(0)` | TS2339; `TypeError` from JavaScript (P9) | registered as a copy of `other`, then described and indexed; `other` unchanged (P9, P12) |
| `add(p, { reuse: "other" }).getByRole(…)` | TS2339 | TS2339: no override after a path (7.9) |
| `add(p, { reuse: "other" })` when `other` has an explicit description | the description is kept | unchanged; a chained `describe` replaces it, `describe("")` removes it (P16) |
| `add(p, { reuse: "anyFrame" }).nth(1)`, `anyFrame` registered as `frameLocator()` | TS2339; nothing to chain | `nth() cannot apply to "p": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`; the copy stays registered without steps (P16, 7.15). Without 7.15 the prototype stored the step, `verify()` passed and the first resolution below `p` threw (P16) |
| `add("a.b.c", { reuse: "anyFrame" })`: where the copy may sit | as for any any-frame path | `add` never throws for the position; `verify()` does as for every any-frame path (P16): `a` and `a.b` unregistered: passes; the same with `strictChains`: the strict message; `a` or `a.b` registered: `frameLocator() without a selector must be the first segment of the chain; "a.b.c" has the ancestor "a".` (the first registered ancestor); `add("a", { reuse: "anyFrame" })` at a root path passes in both modes |
| a hand-made `ReusableLocator<Paths, "frameLocator">` with `definition: { type: "frameLocator" }` (it compiles: `selector` is optional) | with steps, registered as given; `verify()` passes; the first resolution below it throws (P16) | with steps or a description: `reuse cannot apply to "<path>": frameLocator() without a selector has no element to filter, index or describe; …` at the `add` call, nothing registered; without them it registers as `add(path).frameLocator()` does; an override `.frameLocator("iframe")` first makes it an ordinary frame segment that takes steps (P16, 7.15) |
| `add(p, { reuse: "other" })` when `other` has steps | the steps are copied (P15) | unchanged; chained steps go after them (P15); no `clearSteps`: a base without the steps is registered as its own path (7.9) |
| a seeded `add` with `filter`, `nth` or `describe` before the override | no override after a step: TS2339, `….getByRole is not a function` from JavaScript, the seed and the step registered (P15); the docs say "before or after the override" ([locator-registry.md:931](../docs/v3/locator-registry.md#L931)) | unchanged; the docs say the override is the first call (7.13) |
| a second seeded override | TS2339, `….getByRole is not a function` (P15); the docs say it throws the "only one matching override" message ([L929](../docs/v3/locator-registry.md#L929), [L1067](../docs/v3/locator-registry.md#L1067)), which no public chain reaches | unchanged; the docs say it does not compile and the first override stays; the error-reference line goes (7.13) |
| `add(p, { reuse: "other" })` with `other` unregistered | `No locator schema registered for path "other".` (P9) | unchanged |
| `add(p, { reuse: ["reason"] })` forced at runtime | `Invalid reuse path configuration for "p": reason` (P9), pinned by [add.reuseExisting.spec.ts:44-62](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L44-L62) | unchanged |
| `add(p, { reuse: {} })`, `42`, `null` from JavaScript | `TypeError` (P9); in TypeScript a compile error (P10) | `reuse requires a registered path or a seed from createReusable for "p".` (P9) |
| a resolved locator without `describe` | described with its path; `toString()` is the path (P6) | unchanged |
| `getLocator(p)` and `getNestedLocator(p)` | the same `toString()` and the same report row, different chains (P6: `true`) | unchanged; the call log shows each chain |
| a failed action on a described locator | `Click main.missing` in the report; the call log `waiting for locator('main').getByRole(…)` (P6) | unchanged |
| a locator chained past a POMWright locator, `getNestedLocator(p).locator("li")` | Playwright drops the description: the chain shows (P6) | unchanged |
| a described locator used as a `has` inner | its description is printed nowhere (P6) | unchanged; nothing to skip |
| a path with an unregistered ancestor (`main.button.save`, `main.button` unregistered) | the ancestor is left out of the chain (P8) | unchanged without `strictChains`; documented as a namespace segment |
| such a locator matching two elements | Playwright's strict-mode violation, naming the chain it tried (P6) | unchanged |
| `verify()` on a sparse chain | passes, pinned by [registry.verify.spec.ts:157-161](../test/tests/locatorRegistry/registry/registry.verify.spec.ts#L157-L161) | unchanged without `strictChains`; with it, one line per path naming every unregistered ancestor (P14) |
| `strictChains: true` on a standalone registry that never calls `verify()` | | nothing is checked; documented: a standalone registry calls `verify()` (7.8) |
| `strictChains: true` and `skip` of a registered ancestor | | the query leaves it out as without the option: the option checks registrations, `skip` is a query flag (P14) |
| `strictChains: true` and an any-frame `frameLocator()` below the root | rejected by `verify()` when an ancestor is registered; allowed below unregistered segments | it can only be a root path; a path failing both rules gets both messages on its line (P14) |
| `strictChains` set to anything but a boolean | | the option is `strictChains?: boolean`, default `false`; anything else is a compile error (P14, `"yes"`); from JavaScript, without types, only `true` turns it on (7.8) |
| an unregistered terminal path | `No locator schema registered for path "…"` | unchanged in both modes |
| a seeded `frameLocator(null)` at a root path, from JavaScript | registered; resolves to `locator('null')` (P3) | `frameLocator requires a selector value for "<path>".` (7.14); `frameLocator()` still inherits the seed's selector, and the any-frame form stays `add(path).frameLocator()` and `replace().frameLocator()` |
| `getByRole(null, null)`, `update().getByRole(null, { name: "x" })`, a seeded `getByRole(null, …)`: `null` as the first of two arguments | stored or ignored, by builder (P3) | `getByRole requires a role value for "<path>".` everywhere: with two arguments the first is the primary (7.14) |
| `update().getByRole(null)` | deletes every option (documented) | unchanged: a lone `null` is the options |
| `update().getByTestId(null)`, `update().getById(null)`, `update().frameLocator(null)` | the registered value is kept; the call does nothing (P3) | the missing-value message: `null` is no value, and omitting the argument is the way to keep it (7.14) |
| a seeded override `getByRole(null)` | changes nothing (P17) | clears the seed's options, as `update` does (7.16) |
| a seeded override `getByRole({ exact: null })` | stores `exact: null`; `{ name: null }` fails at resolution with a `TypeError` (P17) | deletes the key (7.16) |
| a seeded override `getByRole("link", null)` | the role is set, the seed's options kept (P17) | the role is set, the options cleared (7.16) |
| a call with two mistakes from JavaScript, e.g. `update("a.x").getByText(42)` on a role path | `cannot change the strategy …` | the primary's message, `getByText requires a text value for "a.x".`: the primary is checked first (P17) |
| a corrupted definition whose `type` is no strategy (internal API only) | the switches return the input unchanged, and the first Playwright call on it fails (P4) | `Unknown locator strategy "<type>".` at the first helper (P4); `verify()` reports either at fixture setup |

### 1.4 2.1.0 and 3.0.0 side by side

The seed builder, path reuse, the default description, sparse resolution and the debug-step record are as in v2.1.0
(checked against the tag); the strategy switches were rewritten by plans 1.6-1.8 and 1.9 but are still one per helper.

| aspect | 2.1.0 | HEAD | 3.0.0 as decided |
| --- | --- | --- | --- |
| per-strategy code | five `switch` statements and the builders | six exhaustive constructs and five silent ones (P1), [utils.ts:237-449](../src/locators/utils.ts#L237-L449), [locatorUpdateBuilder.ts:85-215](../src/locators/locatorUpdateBuilder.ts#L85-L215) | one `STRATEGIES` table; the helpers generic over it (7.1) |
| a strategy added to the types | (not probed) | errors in six places, silence in the builders (P1) | one error at the table, then one per builder without the method (P5, 7.3) |
| seed methods | change the seed, `return this` | the same, [reusableLocatorBuilder.ts:49-69](../src/locators/reusableLocatorBuilder.ts#L49-L69) | return a new seed; `definition` a copy (7.11) |
| path reuse | returns `void` (documented, [v2 locator-registry.md:570](../docs/v2/locator-registry.md#L570)); copies strategy, steps and an explicit description | the same, [locatorRegistry.ts:164-174](../src/locators/locatorRegistry.ts#L164-L174) | returns `filter`, `nth`, `describe` (7.9); copies as before |
| a reuse value that is neither | `TypeError` | the same (P9) | a message naming both forms (7.10) |
| default description | the path | the same, [locatorRegistry.ts:521](../src/locators/locatorRegistry.ts#L521) | the path; documented with P6 (7.5) |
| sparse chains | resolved without the missing segments | the same, [L456-462](../src/locators/locatorRegistry.ts#L456-L462) | the same by default, documented as namespaces; an opt-in `strictChains` checked by `verify()` (7.8) |
| debug-step record | built, never read | the same, [L466-522](../src/locators/locatorRegistry.ts#L466-L522) | deleted; `buildLocatorChain` returns the `Locator` (7.7) |

---

## 2. How it works today (verified)

### 2.1 Per-strategy code (3.1)

The ten strategies are spelled out in these places (P1):

| construct | where | lines | exhaustive at compile time? |
| --- | --- | --- | --- |
| `createLocator` | [utils.ts:237-275](../src/locators/utils.ts#L237-L275) | 39 | yes, `default: never` |
| `cloneLocatorStrategyDefinition` | [utils.ts:277-335](../src/locators/utils.ts#L277-L335) | 59 | yes |
| `applyDefinitionPatch` (seeded override) | [utils.ts:337-420](../src/locators/utils.ts#L337-L420) | 84 | yes |
| `methodForStrategy` | [utils.ts:437-449](../src/locators/utils.ts#L437-L449) | 13 | yes, `Record<Type, string>` |
| `mergeLocatorDefinition` (`update`) | [locatorUpdateBuilder.ts:85-151](../src/locators/locatorUpdateBuilder.ts#L85-L151) | 67 | yes, once the type is in `LocatorUpdate` |
| `buildReplacementDefinition` (`replace`) | [locatorUpdateBuilder.ts:158-215](../src/locators/locatorUpdateBuilder.ts#L158-L215) | 58 | yes, once the type is in `LocatorUpdate` |
| the update builder's ten methods and `commitTextLike` | [locatorUpdateBuilder.ts:253-501](../src/locators/locatorUpdateBuilder.ts#L253-L501) | | no |
| the registration builder's ten methods, `TextLikeType`, `STRATEGY_METHODS` | [locatorRegistrationBuilder.ts:34-38](../src/locators/locatorRegistrationBuilder.ts#L34-L38), [L134-431](../src/locators/locatorRegistrationBuilder.ts#L134-L431) | | no |
| the pre-definition `Pick` list and `LocatorMethodForType` | [locatorRegistrationBuilder.ts:553-590](../src/locators/locatorRegistrationBuilder.ts#L553-L590) | | no (`never` for an unknown type) |
| the seed factory's ten methods and `create` | [reusableLocatorBuilder.ts:80-218](../src/locators/reusableLocatorBuilder.ts#L80-L218) | | no |
| the definition types, their union, `LocatorStrategyDefinitionPatch`, `LocatorDefinitionByType`, `LocatorUpdate` | [types.ts:66-179](../src/locators/types.ts#L66-L179), [L250-260](../src/locators/types.ts#L250-L260) | | the four maps are written by hand |

The six mechanical helpers are 320 lines. The five text-likes differ only in the type literal and the Playwright method.
Each builder method checks the first argument with its own literal field name and empty-string rule
(`assertPrimaryValue(role, { method: "getByRole", field: "role", path, allowEmpty: false })`), the same pair the seed
factory and the update builder repeat.

P1, an eleventh strategy `{ type: "css"; css: string }`:

- added to the union alone: `tsc` reports `createLocator`, the clone and the seeded patch (`not assignable to type
  'never'`), `methodForStrategy` (`Property 'css' is missing`), and `LocatorDefinitionByType` through its users; the
  merge and the replacement do not see it, because `LocatorUpdate` is a separate list;
- added to the union, the patch union, `LocatorDefinitionByType` and `LocatorUpdate`: the six helpers are reported; the
  three builders, `STRATEGY_METHODS`, `TextLikeType`, the `Pick` list and `LocatorMethodForType` stay silent, so the new
  strategy would compile with no DSL method anywhere.

### 2.2 Descriptions (3.3)

Every resolution ends in `resolveSegment(path, terminal).describe(terminalDescription ?? path)`
([locatorRegistry.ts:521](../src/locators/locatorRegistry.ts#L521)): the registered or queried description, otherwise the
path; `describe("")` leaves none (plan 1.10-2). `has` path references are resolved through `resolveRecord`
([L325-342](../src/locators/locatorRegistry.ts#L325-L342)), so they are described too. The default dates from 2.1.0.

P6, registered `main` = `locator("main")`, `main.list` = `locator("ul")`, `main.list.item` =
`getByRole("listitem").filter({ hasText: "one" })`, `main.save` = `getByRole("button", { name: "Save" })`, `main.missing`
= `getByRole("button", { name: "Nope" })`:

| what | path description (default) | no description (`describe("")`) | custom (`describe("the missing button")`) |
| --- | --- | --- | --- |
| `toString()` | `main.missing` | `locator('main').getByRole('button', { name: 'Nope' })` | `the missing button` |
| `description()` | `main.missing` | `null` | `the missing button` |
| HTML report, step row of a click | `Click main.save` | `Click locator('main').getByRole('button', { name: 'Save' })` | `Click Save button` |
| HTML report, step row of an assertion | `Expect "toBeVisible" main.missing` | `Expect "toBeVisible" locator('main').getByRole(…)` | `Expect "toBeVisible" the missing button` |
| assertion error, `Locator:` line | `Locator: main.missing` | `Locator: locator('main').getByRole('button', { name: 'Nope' })` | `Locator: the missing button` |
| every call log (`click` timeout, assertion) | `waiting for locator('main').getByRole('button', { name: 'Nope' })` | the same | the same |
| strict-mode violation | `strict mode violation: locator('main').locator('ul').getByRole('listitem') resolved to 2 elements: …` | the same | the same |

More from P6: `getNestedLocator("main.missing")` and `getLocator("main.missing")` have the same `toString()` (`true`) and
the same report row; a locator chained past a POMWright one, `getNestedLocator("main.list").locator("li")`, prints
`locator('main').locator('ul').locator('li')`, Playwright having dropped the description; a described locator used as
`has` is printed as its chain inside the outer one (`filter({ has: getByRole('listitem').filter({ hasText: 'one' })
})`), in `toString()` and in the call log alike. A reporter's `step.title` is `Click` or `Expect "toBeVisible"`; the HTML
report adds the locator to the row.

So the analysis's "terminal failures now print the path instead of the chain that was tried" holds for the `Locator:`
line and the report rows; the call log of every failure still shows the chain. Its suggestion to skip describing `has`
inners would change nothing visible.

The harness strips the default 206 times with `describe("")` in 23 spec files before comparing rendered chains
(AGENTS.md section 4 already moves new specs to DOM assertions). The consumer project calls POMWright's `describe` 0
times, never reads `description()` or `toString()` of a locator, and resolves through `getNestedLocator` 617 times:
its reports show paths (P13).

### 2.3 The debug-step record (section 2, 3.3)

`buildLocatorChain` builds a `debugSteps` array
([locatorRegistry.ts:466-472](../src/locators/locatorRegistry.ts#L466-L472), filled at
[L479-491](../src/locators/locatorRegistry.ts#L479-L491) and [L507](../src/locators/locatorRegistry.ts#L507), its index
typed `IndexSelector | null | undefined`) and returns `{ locator, steps: debugSteps }`
([L522](../src/locators/locatorRegistry.ts#L522)). P7: its three callers read `.locator` only
([L341](../src/locators/locatorRegistry.ts#L341),
[locatorQueryBuilder.ts:361](../src/locators/locatorQueryBuilder.ts#L361),
[L383](../src/locators/locatorQueryBuilder.ts#L383)); nothing in `src`, `test` or `docs/v3` reads `steps`;
[overview.md:492](../docs/v3/overview.md#L492) names `buildLocatorChain` as internal, not the record.

### 2.4 Sparse chains (3.4)

`buildLocatorChain` keeps the ancestors that have a definition in the query and are not skipped
([locatorRegistry.ts:456-462](../src/locators/locatorRegistry.ts#L456-L462)); an unregistered one is left out exactly as
a skipped one. `verify()` ([L383-407](../src/locators/locatorRegistry.ts#L383-L407)) checks each path terminal-only and
the any-frame rule; it says nothing about missing ancestors, and
[registry.verify.spec.ts:157-161](../test/tests/locatorRegistry/registry/registry.verify.spec.ts#L157-L161) pins that a
sparse chain passes. A query's `filter`, `nth`, `update`, `replace` and `clearSteps` on an unregistered segment throw
`"a.b" is not a valid sub-path of "a.b.c". It is a segment of that path, but no locator schema is registered for it.`
([locatorQueryBuilder.ts:387-396](../src/locators/locatorQueryBuilder.ts#L387-L396)). The docs call sparse chains
supported but discouraged ([locator-registry.md:640-644](../docs/v3/locator-registry.md#L640-L644),
[L1171](../docs/v3/locator-registry.md#L1171)).

P8, what a strict check (every proper ancestor registered) would reject:

| where | registries | registrations | with an unregistered ancestor |
| --- | --- | --- | --- |
| the consumer project, each page object's `defineLocators` run against a recording registry | 23 | 1,791 (544 distinct paths) | 1,526 (85.2%; 308 distinct paths) |
| the harness, every registry that `verify()` checks in the chromium suite | 26 | 168 | 14: 11 in the `testfilters` page object's `fictional.*` group (P14), one each in three specs, one of them the spec above |

In the consumer project the unregistered ancestors are names that group paths: by last segment `button` 151 times,
`link` 30, `dialog` 25, `checkbox` 25, `error` 24, `text` 23, and the namespaces of its shared component modules, at
depths 1 to 8. It writes `main.form.button.submit` with `main.form` registered and `main.form.button` not, on purpose.

P6 adds what happens when a missing ancestor matters: a loosened locator that matches more than one element fails the
action with Playwright's strict-mode violation, which prints the chain it tried. What stays silent is a loosened locator
that still matches exactly one element.

### 2.5 Path reuse (3.5)

`add` ([locatorRegistry.ts:124-204](../src/locators/locatorRegistry.ts#L124-L204)) types path reuse as `void`
([L140-141](../src/locators/locatorRegistry.ts#L140-L141)) and returns `undefined` after registering a clone of the
source record ([L164-174](../src/locators/locatorRegistry.ts#L164-L174)); seed reuse builds a seeded
`LocatorRegistrationBuilder`, registers the seed at once, and returns the builder with one override and `filter`, `nth`,
`describe` ([L181-203](../src/locators/locatorRegistry.ts#L181-L203)). Both clone the record through
`cloneRecordForReuse` ([L96-106](../src/locators/locatorRegistry.ts#L96-L106)), which keeps an explicit description.
The `void` was a documented design, not a defect: "path-based reuse registers immediately and does not return a
chainable builder" ([v2 locator-registry.md:570](../docs/v2/locator-registry.md#L570)); analysis 3.5 calls it an
asymmetry.

P15, a `ul` and an `ol` list: `list.item` = `getByRole("listitem").filter({ has: page.locator("b") }).nth("last")
.describe("Last bold item")` reused at `other.item` (under `other` = `locator("ol")`) registers the same definition and
both steps and resolves to `locator('ol').getByRole('listitem').filter({ has: locator('b') }).last()`, described
`Last bold item`; `list.plain` (no description) reused at `other.plain` is described `other.plain`. On the `contract`
prototype, `.filter({ hasText: "a" }).nth(0).describe("chained")` after a path reuse appends both steps after the copied
filter, and the source is unchanged.

P15, seeded `add` (HEAD and prototype alike): the seeded builder is the post-definition view plus the seed's strategy
method ([locatorRegistrationBuilder.ts:592-597](../src/locators/locatorRegistrationBuilder.ts#L592-L597)); `filter`,
`nth` and `describe` return the post-definition view ([L23-32](../src/locators/locatorRegistrationBuilder.ts#L23-L32)),
so the override is possible only as the first call, and once: a second override or an override after a step is TS2339
and, from JavaScript, `….getByRole is not a function`. Steps repeat in any order; `describe` twice keeps the last. The
override merges the options over the seed's: a seed `getByRole("button", { name: "Save", exact: true })` overridden with
`{ name: "Cancel" }` is `getByRole('button', { name: 'Cancel', exact: true })`. It is not `update`'s Merge Patch, which
P15 concluded from the rendered chain: P17 read the stored record, and `{ exact: null }` is stored as `exact: null`
(Playwright prints a `null` `exact` as absent; `{ name: null }` fails at resolution with `reading 'unicode'`), a lone
`null` is spread away and changes nothing, and `("link", null)` keeps the seed's options, where `update` deletes the
key, all options, and all options. TypeScript rejects all three on a seeded override; on `update` they are typed. The
docs say otherwise in two places: "`filter` / `nth` / `describe` may still be chained, before or after the override"
([locator-registry.md:931](../docs/v3/locator-registry.md#L931)) and "a second override throws, and the path keeps the
first" ([L929](../docs/v3/locator-registry.md#L929)). The message `… was already provided from reuse; only one matching
override is allowed.` still exists
([locatorRegistrationBuilder.ts:482](../src/locators/locatorRegistrationBuilder.ts#L482), reached by a unit test that
holds the builder itself,
[locatorRegistrationBuilder.test.ts:263](../src/locators/locatorRegistrationBuilder.test.ts#L263), and listed in the
error reference, [L1067](../docs/v3/locator-registry.md#L1067)), but no public chain reaches it: the view the override
returns has no strategy method.

P16: `describe` twice on `add(path)` keeps the last; `describe("")` after a path reuse removes the source's explicit
description (prototype). An any-frame `frameLocator()` path reused by path is copied on HEAD (`add` returns `undefined`,
so nothing can follow). On the `contract` prototype the copy returns `filter`, `nth` and `describe`, and
`add("framed", { reuse: "anyFrame" }).nth(1).filter(…)` stores the steps on the any-frame copy; `verify()` passes,
because it checks an any-frame path against the first-segment rule only, and `getNestedLocator("framed.button")`
throws `frameLocator() without a selector does not point to a particular iframe; "framed" cannot be resolved on its own,
filtered or indexed; resolve a path inside it.` at the first use. Plan 1.6-1.8 gave the any-frame form no steps and no
terminal form; `add(path).frameLocator()` returns nothing chainable for that reason. The same state is reachable on HEAD
already, through a hand-made seed: `ReusableLocator<Paths, "frameLocator">` types `definition.selector` as optional, so
an object with `definition: { type: "frameLocator" }` and steps compiles, `add(p, { reuse: obj })` registers it with its
steps (and `.nth(1)` after it adds one), and `verify()` passes. `createReusable.frameLocator()` itself refuses: it
throws `createReusable.frameLocator requires a selector value.` and the docs say a frame seed needs a selector
([locator-registry.md:932](../docs/v3/locator-registry.md#L932)).

P9 and P10 on HEAD:

| call | type | runtime |
| --- | --- | --- |
| `add("table.copy", { reuse: "table" })` | `void` | `undefined` |
| `add("table.copy", { reuse: "table" }).describe("copy")` | TS2339 `Property 'describe' does not exist on type 'void'` | `TypeError: Cannot read properties of undefined (reading 'describe')` |
| `add("table.row", { reuse: seed })` | the seeded builder | the builder |
| `{ reuse: {} }`, `{ reuse: 42 }` | compile errors | `TypeError: Cannot read properties of undefined (reading 'type')`; nothing registered |
| `{ reuse: null }` | compile error | `TypeError: Cannot read properties of null (reading 'definition')` |
| `{ reuse: "nope" }` | compiles when `"nope"` is a path | `No locator schema registered for path "nope".` |
| `{ reuse: ["reason"] }` forced | | `Invalid reuse path configuration for "a5": reason` |

Declaration emit (P10, `declaration: true`): `export const copy = (r) => r.add("table.copy", { reuse: "table" })`
emits (`void`); `export const row = (r, s) => r.add("table.row", { reuse: s })` already fails with TS4023 and 19 TS4094,
the limitation plan 1.9 recorded (the registration builder views stay unexported; a block body or `: void` emits). The
docs present path reuse as a copy "as is" ([overview.md:291-298](../docs/v3/overview.md#L291-L298),
[locator-registry.md:907-919](../docs/v3/locator-registry.md#L907-L919): "does not return a chainable builder").

Usage (P13, P15): the consumer project reuses by path once, as a statement, and by seed 57 times (41 with nothing
chained, 16 with a `locator` override, none with `filter`, `nth` or `describe` after the reuse); the harness pins the
`void` return at [add.reuseExisting.spec.ts:7-22](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L7-L22)
(`expect(builder).toBeUndefined()`).

### 2.6 Seeds (3.8)

`ReusableLocatorBuilder` ([reusableLocatorBuilder.ts:28-78](../src/locators/reusableLocatorBuilder.ts#L28-L78)) copies
its definition and steps at creation (plan 1.10-2); `filter` and `nth` push onto its own step list and `describe` sets
its own description, each returning `this` ([L49-65](../src/locators/reusableLocatorBuilder.ts#L49-L65)); `steps` returns
copies, `definition` the stored object ([L67-73](../src/locators/reusableLocatorBuilder.ts#L67-L73)). The type
([types.ts:193-206](../src/locators/types.ts#L193-L206)) marks `definition` `readonly`, which does not reach its fields:
`seed.definition.options.name = "Changed"` compiles (P10).

P11 on HEAD, a table with rows `r1`, `r2`, `r3`:

| registered | chain | matches |
| --- | --- | --- |
| `table.row`, `{ reuse: row }` | `locator('table').locator('tr')` | 3 |
| `table.row@first`, `{ reuse: row.nth(0) }` | `….locator('tr').first()` | `r1` |
| `table.row@last`, `{ reuse: row.nth("last") }` | `….locator('tr').first().last()` | `r1`, the wrong row |
| `other`, `{ reuse: heading.filter({ hasText: "Other" }) }` after `summary` took `heading.describe("Summary heading").filter({ hasText: "Summary" })` | `….filter({ hasText: 'Summary' }).filter({ hasText: 'Other' })`, described `Summary heading` | 0 |
| `btn` after `seed.definition.options.name = "Changed"` | `getByRole('button', { name: 'Changed' })` | |

`row.nth(0) === row` and `row.nth("last") === row` are both `true`, and `row.steps` ends as `nth(0)`, `nth(last)`. The
docs' *Seed immutability* ([locator-registry.md:967-969](../docs/v3/locator-registry.md#L967-L969)) covers only that
`add` leaves a seed alone. Usage (P13): the consumer project creates 13 seeds, each with a single strategy call, and
never calls a method on one afterwards; the repository's specs, unit tests and docs never change a seed by a statement
or derive one seed from another after its first use (0 of each).

### 2.7 Harness and survey (P13)

- Harness: 50 spec files; `createReusable` 55 times; `getLocator(` 142 and `getNestedLocator(` 277 times in specs;
  `describe("")` 206 times in 23 files; one sparse-chain spec (2.4); one path-reuse return expectation (2.5).
- One 2.1.0 consumer project (124 TypeScript files, the project of the earlier surveys): 23 page objects, each with one
  `defineLocators(registry)` module that composes shared ones; `reuse:` 58 times (57 seeds, 1 path,
  as a statement); 13 seeds, never changed after creation; POMWright `describe` 0 times; `description()` and locator
  `toString()` 0 times; `getNestedLocator(` 617, `getLocator(` 6, `getLocatorSchema(` 100 (75 with `update`, 28 with
  `nth`, 1 with `filter`); `declaration: true` in its `tsconfig.json`, and no expression-bodied arrow that returns
  `add(…)`; sparse chains per 2.4. Nothing in it needs an edit for the decided design.

### 2.8 What is sound

The six mechanical helpers are correct and exhaustive at compile time (P1, P3); the builders' explicit method lists
carry Playwright's parameter types, per-method docs and the labelled replace tuples of plan 1.9, which a generated
surface would lose; clone-on-read and the copies at the boundary (plan 1.10-2) already keep registered records
unchangeable; the default description makes the report readable, and Playwright keeps the chain in every call log
(P6); sparse resolution is consistent with `skip` and with the sub-path messages.

---

## 3. Design

### 3.1 The strategy table (3.1)

| option | result | cost |
| --- | --- | --- |
| **A. one `STRATEGIES` table, the helpers generic over it, the name lists derived; the public methods stay explicit** (decided, 7.1) | P3 byte-identical, every test unchanged (P2); a new strategy is one row, and its absence or a builder without its method is a compile error (P5, 7.3) | src +265 −485 lines (P2) |
| B. A, and the builder methods generated from the table (mapped types) | fewer lines | loses the per-method doc comments, Playwright's overload shapes (seeded options-only forms) and plan 1.9's labelled replace tuples (`getByRole(role, options?)` in hovers); every hover becomes a mapped type |
| C. keep the switches | none | eight places to touch per strategy; five of them silent (P1) |

The table, as prototyped (`src/locators/utils.ts`):

```ts
type StrategySpec<Type extends StrategyType> = {
	readonly method: string;                       // the DSL method: "getByRole", …, "getById"
	readonly primary: PrimaryField<Type>;          // the definition field: "role" | "text" | "selector" | "testId" | "id"
	readonly options: "options" extends keyof LocatorDefinitionByType[Type] ? true : false;
	readonly allowEmpty: boolean;                  // "" is a value Playwright matches (text-likes, getByTestId)
	readonly optionalPrimary?: true;               // frameLocator(): the any-frame form
	readonly create: (target: LocatorBuilderTarget, definition: LocatorDefinitionByType[Type]) => Locator;
};

export const STRATEGIES = {
	role: { method: "getByRole", primary: "role", options: true, allowEmpty: false,
		create: (target, definition) => target.getByRole(definition.role, definition.options) },
	// … text, label, placeholder, altText, title, locator, frameLocator, testId, id
} as const satisfies { [Type in StrategyType]: StrategySpec<Type> };
```

Each row's `create` keeps Playwright's signature checked per strategy (`getByRole(role, options)`), and the
`frameLocator` and `id` rows keep their own checks and messages. Read from the table:

- `createLocator` is `strategyOf(type).create(target, definition)`;
- the clone, the seeded patch, the `update` merge and the `replace` build read and write `definition[spec.primary]` and,
  where `spec.options`, the options, through one `assembleDefinition(type, primary, options)` that keeps today's key
  order (`type`, primary, `options`), so the duplicate-registration message is unchanged (P3);
- one `assertStrategyPrimary(type, value, { method, path })` replaces the per-method `assertPrimaryValue`/`assertIdValue`
  pairs in the three builders (field and empty-string rule from the row; `getById` keeps `assertIdValue`'s message);
- `methodForStrategy`, `STRATEGY_METHODS` (the "call getByRole, …, getByTestId or getById before it" message),
  `TextLikeType`, `LocatorMethodForType` and the pre-definition `Pick` are derived from the rows;
- the seed factory's ten bodies become `return this.create("role", role, options)`; the update builder's become
  `commitWithOptions(type, args)` (the seven strategies with options) and `commitPrimary(type, value)` (the other
  three).

The ten methods of each builder stay as they are: their overloads, docs and Playwright parameter types are the public
API. The analysis's idea of deriving replace's argument tuples from the row's `options` is not taken: plan 1.9 named the
tuple elements per method (`[role, options?]`, `[text, options?]`, `[selector, options?]`) for the hovers, and labels
cannot be computed.

P2, the `table` branch: `pnpm lint` clean, 369 unit tests and no type errors, `pnpm build`, `pnpm typecheck` clean,
407 chromium tests passed, with no test changed. The six helpers shrink from 320 lines to the 86-line table and about 70
lines of generic code; over the four files, +265 −485.

P3: 5,355 DSL calls, byte-identical between HEAD and the prototype, including every error message, the multi-line
duplicate-registration messages, and JavaScript-only inputs (`null` and RegExp first arguments, `null` options, options
with `null` keys).

P4, one level down, 6,908 direct helper calls; 304 differ, in two classes no DSL call can reach:

| class | HEAD | table | why unreachable |
| --- | --- | --- | --- |
| `applyDefinitionPatch` with a `null` role or text in a role or text-like patch (300 cases) | `??`: the seed's value | `!== undefined`: `null` stored, the rule HEAD applies to `locator`, `frameLocator`, `getByTestId` and `getById` | the registration builder passes a string, a RegExp or `undefined` there ([locatorRegistrationBuilder.ts:143](../src/locators/locatorRegistrationBuilder.ts#L143), [L416](../src/locators/locatorRegistrationBuilder.ts#L416)) |
| a definition whose `type` is no strategy (4 cases) | the input returned unchanged | `Unknown locator strategy "css".` | every definition comes from a builder; the registry's internal `replace` is not on the public type |

Keeping `??` for the six rows would need a per-row rule for a case that cannot occur; the uniform `!== undefined` is
AGENTS.md's "`undefined` means not provided". (7.2)

Completeness (P5): with the table, an eleventh strategy in the types is one error at the table (`TS1360`, the row is
missing); with its row, the registration builder fails until it has the method (the derived `Pick`). The update builder
and the seed factory are classes whose methods the table cannot see, so a unit type test pins each to the table:
`Pick<LocatorUpdateBuilderInternal<…>, StrategyMethod>` and `Pick<ReusableLocatorFactory<…>, StrategyMethod>` fail to
compile when a method is missing. (7.3)

**Rendering records as DSL calls** (plan 1.10-2 decision 7.2 left it here). The table makes a renderer possible:
`locator("li").filter({ has: locator('b') })` instead of the JSON of plan 1.10-2. It would be used by one message, read
when a path is registered twice, which fails at fixture setup and is found by its first line. Decided: not now
(7.4); only `explain`, rejected in 7.7, would have needed it.

### 3.2 Descriptions (3.3)

| option | report rows and `Locator:` line | call logs | cost |
| --- | --- | --- | --- |
| **A. keep the path default; no option; the docs say where the path and where the chain shows (P6)** (decided, 7.5) | the path | the chain | docs |
| B. an option `description: "path" \| "none"`, default `"path"`, on `createRegistryWithAccessors(page, { description })` and the `PageObject` constructor options (`{ locators: { description } }`; `PageObjectTypeOptions` is type-only) | as chosen | the chain | a second parameter on the factory, a constructor option, plumbing to `buildLocatorChain`, tests, docs |
| C. no default (Playwright's own), the path as an opt-in | the chain unless opted in | the chain | every report row of every consumer changes; the survey's 617 resolutions lose their names |
| D. the analysis's four modes, `"path" \| "chain" \| "path+chain" \| "off"` | | | `"chain"` and `"off"` are the same thing in Playwright (no description prints the chain); `"path+chain"` would put the chain into the description text, doubling every report row |

Why A: the problem the analysis describes is half true (P6): a failure's call log always shows the chain that was
waited for, and a strict-mode violation names it; what shows the path is the report row and the `Locator:` line, which
is what makes a report of 617 resolutions readable. Nobody in the survey would set the option (no `describe`, no
`toString()`), and the harness's 206 `describe("")` calls are string assertions that new specs no longer write. The
chain of one locator is one call away: `getLocatorSchema(path).describe("").getNestedLocator()`. B is the alternative
if a consumer asks for it; it adds API that is easy to add later and hard to remove.

`has` inners keep their description: it is printed nowhere (P6), so skipping it, as the analysis suggests, would change
nothing visible. (7.6)

### 3.3 The debug-step record: delete, or `explain` (3.3, section 2)

| option | what | cost |
| --- | --- | --- |
| **A. delete it; `buildLocatorChain` returns the `Locator`** (decided, 7.7) | the record, its nullable index, the `{ locator, steps }` wrapper and the three `.locator` reads go | none |
| B. `registry.explain(path)`: one line per segment, registered or left out, with its steps and the description | e.g. `main.button (not registered, left out)` | a public method, a renderer (3.1's DSL rendering), tests and docs for output Playwright's own `toString()` and call log already give |

P7 shows nothing reads it. B's only addition over Playwright is naming the segments a chain left out (2.4), which the
docs can explain once. The `contract` prototype deletes the record (P12).

### 3.4 Sparse chains (3.4)

| option | consumer project (P8) | harness (P8, P14) | cost |
| --- | --- | --- | --- |
| A. document unregistered segments as namespaces only | unchanged | unchanged | docs |
| **B. A, plus an opt-in `strictChains` (factory and `PageObject`), checked by `verify()`, default off** (decided in review, 7.8) | unchanged unless set; set today, 1,526 of 1,791 registrations would fail | unchanged unless set; set in the domain base class, 11 of 22 paths of one page object fail (P14) | an option, plumbing, tests, docs (P14: +96 −7 lines with its unit tests) |
| C. strict by default, with an opt-out | 1,526 of 1,791 registrations fail at fixture setup | 14 fail, and the pinned spec changes | a breaking change for the dominant naming style |
| D. a one-time warning per sparse path | 308 distinct warnings | | noise; Playwright warns about nothing of the kind |

Why B: in the surveyed project a missing ancestor is not a forgotten registration but a name (`button`, `dialog`,
`link`), so the default stays: a check would reject the style, not the mistake. But registering every segment is a
style other projects choose (the surveyed one could be refactored to it, and a new project may start with it), and for
them a mistyped or forgotten ancestor that loosens a chain is a mistake the registry can name at fixture setup, before
Playwright's strict mode catches only the case where the looser locator matches more than one element (P6). The check
is opt-in, so no existing project changes; `skip` (plan 1.10-2) keeps leaving out a registered ancestor explicit at the
call, in both modes. The docs replace "supported, but discouraged" with what happens in each mode and how to check a
chain.

The design, as prototyped (P14, `prototype/0003-prototype-strictChains.patch` on top of the `contract` prototype):

- **Placement.** `createRegistryWithAccessors(page, { strictChains: true })`, a new optional second parameter, and the
  `PageObject` constructor option `locators: { strictChains: true }`, beside `label`, `navOptions` and
  `sessionStorage: { schema }`. Not in `PageObjectTypeOptions`: that is the type-only second type argument, and the
  option is a runtime value. A domain base class sets it once in its `super(…)` call. A page object setting every
  constructor option and every type option compiles against the prototype's packed package (P14):

  ```ts
  export class CheckoutPage extends PageObject<
  	CheckoutPaths,
  	{ baseUrlType: string; urlPathType: RegExp; storage: typeof checkoutStorage } // PageObjectTypeOptions: types only
  > {
  	constructor(page: Page) {
  		super(page, "https://shop.example", /\/checkout\/\d+/, {
  			label: "Checkout",
  			navOptions: { waitUntil: "domcontentloaded", timeout: 15_000 },
  			sessionStorage: { schema: checkoutStorage },
  			locators: { strictChains: true },
  		});
  	}
  	// defineLocators() as usual
  }
  ```

- **Where.** In `verify()` only, after nothing else has changed: with the flag, each path's proper ancestors are looked
  up in the registry; the existing resolution and any-frame checks run as before. `PageObject` calls `verify()` right
  after `defineLocators()`; a standalone registry calls it itself, and the option is enforced only there (documented).
  No check at resolution: a query can add steps to and skip registered segments, never unregister one, so a registry
  that passed `verify()` cannot produce a sparse chain.
- **Message.** One line per path inside `verify()`'s `n of N paths` error, naming every unregistered ancestor:
  `"main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button" are
  not.` A path that also fails another check gets both messages on its line, so the count stays per path.
- **Any-frame.** An any-frame `frameLocator()` must have no registered ancestor; under `strictChains` every ancestor is
  registered, so an any-frame path is a root path (the harness's `anyFrame` is one). Documented.
- **Values.** `strictChains?: boolean`, default `false` (absent, `undefined` or `false`). Anything else is a compile
  error (P14); from JavaScript, without types, the registry stores `options?.strictChains === true`, so only `true`
  turns it on. The options object is an inline type; no new exported name.
- **Changeset.** Its own `minor` changeset, `strict-chains`, riding 3.0.0.

P14 results: with the flag off, `pnpm lint` and `pnpm typecheck` clean, 4 new unit tests, the chromium suite identical
to the `contract` prototype (406 passed, the one 7.9 expectation failed). With `locators: { strictChains: true }` in the
harness's `TestApp` base class: only the `testfilters` page object fails, with 11 of its 22 paths, every one under the
unregistered `fictional` (the 11 of P8); 88 tests fail because they use it; every other harness page object passes as it
is, `iframe` with its root `anyFrame` included. `skip` of a registered ancestor still leaves it out of the chain under
the option (unit test).

### 3.5 Path reuse (3.5)

| option | type of `add(p, { reuse: "other" })` | runtime | cost |
| --- | --- | --- | --- |
| **A. `filter`, `nth` and `describe`, as after a seeded strategy** (decided, 7.9) | `LocatorRegistrationPostDefinitionBuilder` | registered at once as a copy, then the chained steps (P12) | `void` code breaks (TS2322); an expression-bodied arrow returning it fails declaration emit like a seed reuse (P10) |
| B. the full seeded builder: the one override as well | all ten overrides, because a path's strategy is unknown to TypeScript; nine throw `must use the "<type>" strategy` at runtime | as for a seed | ten methods offered, nine wrong |
| C. keep `void`; document | `void` | `undefined` | the asymmetry stays |
| D. remove path reuse; `createReusable` only | | | one call in the survey breaks; the docs' "copy as is" use case goes |

Why A: the analysis is right that a registered record is a seed, and every step after a seeded strategy works on it;
only the override cannot be typed, and a variant with other options is what `createReusable` is for. The prototype
registers the copy through the same seeded builder as seed reuse (one code path, `seededBuilder`) and returns its
post-definition view.

No `clearSteps` after a path (decided in review): the copy carries the source's steps (P15), and the steps chained after
it narrow the reused locator; taking the source's steps away would make it another locator, which is what registering a
separate base path is for. This was the design intent of reuse by path in 2.x ("reuse is reuse"); what 2.x lacked was
narrowing, which made consumers export and import `createReusable` seeds between locator modules instead.

**A reuse value that is neither a path nor a seed** (the plan 1.10-2 hand-over). TypeScript rejects `{}`, `42` and
`null` (P10); from JavaScript they throw a `TypeError` from inside `add`, and nothing is registered (P9).

| option | from JavaScript | cost |
| --- | --- | --- |
| **A. check after the array branch: a string is a path, an array the compile-time reason, an object whose `definition.type` is a row of the table a seed; anything else throws `reuse requires a registered path or a seed from createReusable for "<path>".`** (decided, 7.10) | a message naming both forms, at the `add` call inside `defineLocators()` (P12) | one check, structural, so a hand-made object of the `ReusableLocator` type still passes |
| B. leave the `TypeError` | `Cannot read properties of null (reading 'definition')` | none |

A follows AGENTS.md's "validate DSL input at the boundary" (`assertIdValue`, `assertDescription`). The array branch
stays: it is reachable by design and pinned
([add.reuseExisting.spec.ts:44-62](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L44-L62)). `instanceof
ReusableLocatorBuilder` is not used: the public type is structural.

**Steps on an any-frame definition** (found in the final review, P16). The any-frame `frameLocator()` takes no steps
and no description (plan 1.6-1.8), and `add(path).frameLocator()` returns nothing chainable. Path reuse returning
`filter`, `nth` and `describe` would let a copy of it take steps that fail only at the first resolution below it, and a
hand-made seed with an any-frame definition can already bring steps or a description with it (P16, HEAD too).

The any-frame rule has two parts that are checked at different times. Its position (the first segment of the chain;
under `strictChains`, a root path) depends on what else is registered, so only `verify()` can judge it, and it already
does, for copies as for any any-frame path. Its "no steps, no description" does not depend on position, so it can be
checked when a step or description is offered. A valid any-frame copy or seed therefore never throws at `add`.

| option | a copy by path, then `.nth(1)` | a hand-made any-frame seed with steps | cost |
| --- | --- | --- | --- |
| **A. one check in the registration builder: a step or description offered to an any-frame definition throws at the call, from `filter`, `nth` or `describe` (`<method>() cannot apply to "<path>": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`) or from a seed that carries them (`reuse cannot apply to "<path>": …`, nothing registered)** (decided, 7.15) | throws at the call | throws at `add` | two conditions and one message (P16: +90 −2 lines, most of it unit tests) |
| B. a branch for path reuse only, whose view throws | throws at the call | registered with its steps, as on HEAD | one branch in `add`; leaves the seed case |
| C. refuse every any-frame seed (a seed must have a selector) | as B | throws, but so does a valid any-frame seed without steps | rejects a valid case |
| D. `verify()` rejects steps on an any-frame path | passes `add`, fails at fixture setup | the same | a later failure than A for the same rule |

The check sits in the builder's `ensureDefinition`, which `filter`, `nth` and (through `applyDescription`) `describe`
pass, and in `persistSeededDefinition` for a seed; `add(path).frameLocator()` is unchanged. An override that gives an
any-frame seed a selector (`.frameLocator("iframe")`, the first call) makes it an ordinary frame segment, which then
takes steps. The prototype (`prototype/0004-prototype-any-frame-no-steps.patch` on `strict`): 387 unit tests (5 new),
lint, build and typecheck clean, chromium 406 passed and the one 7.9 expectation failed (P16).

### 3.6 Primaries Playwright cannot take; `null` on a seeded override (P3, P17; not analysis items)

`assertPrimaryValue` ([utils.ts:149-161](../src/locators/utils.ts#L149-L161)) rejects `undefined` and, where Playwright
cannot use it, `""`. Unseeded `add` and `createReusable` reach it only for a string (or a RegExp for the text-likes)
and give every other first argument the missing-value message (`getByRole requires a role value for "a.x".`); the other
builders pass whatever is not `undefined`. P3, P17, on HEAD:

| call (JavaScript) | stored | resolution, and so `verify()` |
| --- | --- | --- |
| `add("a.x").frameLocator(null)` under a registered `a` | `selector: null` | `TypeError: Cannot read properties of null (reading '_frame')` |
| a seeded `frameLocator(null)` at a root path | `selector: null` | `locator('null')`: no error; it waits for `<null>` elements |
| a seeded `getByTestId(null)`, `add("a.x").getByTestId(42)` | `testId: null`, `testId: 42` | `TypeError: … (reading 'unicode')`, `getByTestId('42')` |
| `replace().getById(null)` | `id: null` | `TypeError: … (reading 'flags')` |
| `update().getByTestId(null)` | the registered `testId` (`??`) | unchanged locator: the call did nothing |
| `update().getByRole(42)`, `update().getByRole(/S/i)` | `role: 42`, `role: /S/i` | `getByRole('42', …)`, `internal:role=/S/i…` |
| `createReusable.getByRole({ name: "Save" })` | `role: { name: 'Save' }` | `internal:role=[object Object]` |
| a seeded `getByRole({ exact: null })`, `getByRole(null)`, `getByRole("link", null)` | `exact: null`; the seed's options; the seed's options | as stored; `{ name: null }` throws `reading 'unicode'` |

The rule, as the review put it: a primary is always a value, never `null`; a lone `null` where options may stand is the
options, and on `update` and a seeded override it clears them; so `getByRole(null, null)` is valid nowhere, and
`getByRole(undefined, null)` is not needed to clear options.

| option | primaries | seeded options | cost |
| --- | --- | --- | --- |
| **A. `assertStrategyPrimary` gives any value Playwright cannot take for the strategy (`null`, a number, an object, a RegExp for role, `locator` or `frameLocator`) the missing-value message on every builder, as `add` already does; a seeded override parses its arguments with `update`'s `parseUpdateArguments` and merges with `update`'s `mergeOptions`, typed `OptionsPatch<…> \| null` as `update` is** (decided, 7.14 and 7.16) | throw at the call | `update`'s Merge Patch | one condition and a set of RegExp strategies in the shared assertion; the seeded override shares `update`'s two helpers (`mergeOptions` moves to `utils.ts`); P17: +250 −85 lines, 7 unit tests |
| B. reject `null` only | `null` throws; a number or an object is still stored by `update`, seeded overrides, `replace` and `createReusable` | unchanged: keys stored as `null` | the first prototype of the review; it stored `role: 42` from a seeded override once that took `update`'s parser (P17) |
| C. leave it | a `TypeError` at fixture setup, or a nonsense locator | unchanged | none |

`frameLocator(null)` throws as well, on every builder: the any-frame form comes from omitting the selector on `add` and
`replace`, and a frame seed cannot become any-frame through a patch. Omitting stays what it was: inherit on a seed and
on `update`, the any-frame form on `add` and `replace`. With two arguments the first is the primary, so `null` there
throws; `("link", null)` sets the role and clears the options (a `null` options argument to `replace` still equals
omission, plan 1.9).

P17, the prototype (`prototype/0005-prototype-primaries-and-seeded-merge.patch` on `anyframe`): the first six new unit
tests fail against `anyframe` (5 at runtime, 4 type errors in typecheck mode, since the seeded types rejected `null`),
then pass; the seventh (wrong-type primaries) was added when the matrix showed option B's regression; 401 unit tests,
lint, build and typecheck clean, chromium 406 passed and the one 7.9 expectation failed. P3's matrix against HEAD: 632
of 5,355 lines differ, every one in three classes: a primary Playwright cannot take now throws (`null`, `42`, an options
object, a RegExp for role, `locator` or `frameLocator`, on `update`, seeded overrides, `replace`, `createReusable` and
unseeded `frameLocator`/`getByTestId`/`getById`); a seeded override's `null` key, lone `null` and `(primary, null)`
follow `update` (14 lines); and a call with a wrong strategy and a wrong primary reports the primary first.

P18, 7.16 for every method (`scripts/seededVsUpdate.cjs`, `scripts/zzSeededTypes.probe.ts`). The same call applied
through `update()` and through a seeded override on the same definition stores the same record, or both throw the same
message, in all 130 cases on the prototype: the seven strategies with options (`getByRole`, the five text-likes,
`locator`) × 16 argument forms, and `getByTestId`, `getById`, `frameLocator` × 6. On HEAD 69 of the 130 differ: besides
the `null` forms, HEAD's seeded override dropped the options of a JavaScript `(undefined, options)` and stored
`{ exact: undefined }` as an explicit key. The outcomes, the same for every strategy with options (a seed
`getByRole("button", { name: "Save", exact: true })`):

| call | 3.0.0 |
| --- | --- |
| `()`, `(undefined)`, `({})`, `({ exact: undefined })` | unchanged: nothing given |
| `("link")`, `("link", undefined)` | the role replaced, the options kept |
| `({ name: "Cancel" })` | `{ name: 'Cancel', exact: true }`: keys merge |
| `({ exact: null })` | `{ name: 'Save' }`: the key deleted |
| `(null)` | no options |
| `("link", { name: "Cancel" })` | the role replaced, the options merged |
| `("link", null)` | the role replaced, no options |
| `(null, null)`, `(null, { … })`, `(42)` | `getByRole requires a role value for "<path>".` |
| `(undefined, null)`, `(undefined, { … })` (JavaScript only) | as `(null)` and `({ … })`: `undefined` is "not given" |

`getByTestId`, `getById` and `frameLocator`: omitting inherits, a value replaces, and `null`, `(null, null)` and `42`
throw the missing-value message. Types, against each packed package: on the prototype the 15 seeded forms (a lone
`null`, a `null` key, a primary with `null`, across all seven methods) compile, and the 8 negatives are consumed
`@ts-expect-error`s (`getByRole(null, null)`; `null` for `getByTestId`, `getById`, `frameLocator`; unseeded `add` with
`null` options or a `null` key; unseeded `locator(null)`; `createReusable.getByRole("button", null)`); on HEAD all 15
positive forms are errors (TS2769, TS2345, TS2322). Unchanged and outside this plan: a seeded `getByTestId()` with no
argument does not compile; it inherits with `getByTestId(undefined)`, as plan 1.6-1.8 typed it.

### 3.7 Seeds (3.8)

| option | P11's variants | statement-style code | cost |
| --- | --- | --- | --- |
| **A. immutable: `filter`, `nth` and `describe` return a new seed; `definition` returns a copy** (decided, 7.11) | correct (P12: `table.row@last` is `r3`; `other` matches 1) | `seed.filter(f);` has no effect (none in the survey or the repository) | the seed's three methods and its getter |
| B. document the mutation | wrong, documented | works | docs |
| C. freeze a seed at its first `add`: a later `filter`/`nth`/`describe` throws | the variants throw instead of resolving | works until the first `add` | a guard against the natural way to derive variants |

Why A: it is what a Playwright `Locator` does (`locator.filter()` returns a new locator), it is what the analysis asks
for, and it extends plan 1.10-2's rule that what POMWright stores never changes to the object a consumer holds. The
prototype's seed keeps its definition, steps and description in `readonly` fields and builds a new
`ReusableLocatorBuilder` per call; `steps` already returned copies. The public type does not change: the three methods
were already typed as returning a `ReusableLocator`. TypeScript does not warn about a discarded return value, so the
migration note names the statement form.

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. [utils.ts](../src/locators/utils.ts): the `STRATEGIES` table, `StrategyMethod`, `strategyOf`, `assembleDefinition`,
   `assertStrategyPrimary` (its `null` rejection of 7.14 lands in execution step 2) and a field reader for the generic
   helpers; `createLocator`, `cloneLocatorStrategyDefinition` and `applyDefinitionPatch` generic (L237-420);
   `methodForStrategy` derived (L437-449); `isReusableLocator` (3.5); `anyFrameStepsMessage` (7.15); doc comments on
   the table and each row field. In execution step 2: `assertStrategyPrimary` gives a value Playwright cannot take for
   the strategy the missing-value message (7.14, a set of the strategies whose primary may be a RegExp); `mergeOptions`
   moves here from `locatorUpdateBuilder.ts`, and `applyDefinitionPatch` merges the options with it (7.16).
2. [locatorUpdateBuilder.ts](../src/locators/locatorUpdateBuilder.ts): `mergeLocatorDefinition` and
   `buildReplacementDefinition` generic, `TextLikeDefinition` and `mergeTextLike` gone (L85-215); the ten method bodies
   through `commitWithOptions` and `commitPrimary` (L253-501); the method signatures and docs unchanged;
   `mergeOptions` re-exported from `utils.ts` (7.16).
3. [locatorRegistrationBuilder.ts](../src/locators/locatorRegistrationBuilder.ts): `TextLikeType` and
   `STRATEGY_METHODS` derived (L34-38); `assertStrategyPrimary` in the six checks (L148, L316, L361, L381, L406, L425);
   the pre-definition `Pick` and `LocatorMethodForType` derived (L553-590); the post-definition view returned after a
   path reuse; the any-frame check of 7.15 in `ensureDefinition` (which `applyDescription` now calls, so the view's
   `describe` passes it too) and in `persistSeededDefinition`; a seeded override of `getByRole`, the text-likes and
   `locator` parses its arguments with `parseUpdateArguments` (one `commitSeededOverride`), and its options are typed
   `OptionsPatch<…> | null` in both the options-only and the two-argument overload, as `update`'s (7.16); the unseeded
   overloads keep Playwright's option types.
4. [reusableLocatorBuilder.ts](../src/locators/reusableLocatorBuilder.ts): the factory's ten bodies through one `create`
   (L80-218); the seed immutable per 3.7, with doc comments saying each method returns a new seed (L28-78).
5. [locatorRegistry.ts](../src/locators/locatorRegistry.ts): `add`'s path branch returns the post-definition view
   through a shared `seededBuilder` (return type L138-146, branch L164-174); the reuse check after the array branch
   (L176-179), the seed branch through `seededBuilder` (L181-203); `buildLocatorChain` returns the `Locator`, without
   the record (L443-523), and `resolveRecord` (L333-341) and the query builder's two resolutions
   ([locatorQueryBuilder.ts:353-384](../src/locators/locatorQueryBuilder.ts#L353-L384)) drop `.locator`; `add`'s doc
   comment mentions both reuse forms.
6. `strictChains` (P14): [locatorRegistry.ts](../src/locators/locatorRegistry.ts) gets an internal
   `LocatorRegistryOptions` (`{ strictChains?: boolean }`), a second constructor parameter stored as
   `options?.strictChains === true`, the ancestor check and its message in `verify()` (L383-407; one line per path, every
   check's message on it), the option in `verify()`'s doc comment, and the second parameter of
   `createRegistryWithAccessors` (L563-571); [pageObject.ts](../src/pageObject.ts) gets the constructor option
   `locators?: { strictChains?: boolean }` (L82-86), passed to `createRegistryWithAccessors` (L100-101), and its doc
   comment.

`index.ts`, the exported names and the ESM entry are unchanged. `add`'s return type for a path reuse changes (an
unexported registration builder view, as for seed reuse). `STRATEGIES` and `LocatorRegistryOptions` are internal; the
public signatures of `createRegistryWithAccessors` and the `PageObject` constructor gain an optional parameter and an
optional option.

### 4.2 Harness (`test/`)

- [add.reuseExisting.spec.ts:7-22](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L7-L22) changes (the one
  existing expectation that encodes `void`, P12): renamed "add reuse by path returns filter, nth and describe"; it
  asserts the view's three methods instead of `toBeUndefined()` and keeps its `toEqual` of the record. New tests in the
  same file, against DOM: `describe`, `nth` and `filter` after a path reuse apply to the new path and leave the source
  unchanged; the source's explicit description is kept unless `describe` replaces it, and `describe("")` removes it;
  `{}`, `42` and `null` forced at runtime throw the message of 3.5 and register nothing; a standalone registry on
  `/iframe` with an any-frame path and its copy at a root path: the copy resolves a path inside it against the frame's
  DOM, refuses `filter`, `nth` and `describe` with the message of 7.15, and a copy below a registered ancestor fails
  `verify()` with the first-segment message.
- [add.reuseReusable.spec.ts](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts), seeded options (7.16),
  against DOM: a seed `getByRole("button", { name: "Save", exact: true })` overridden with `getByRole({ exact: null })`
  matches `Save` and `Save draft`; `getByRole(null)` matches every button; `getByRole("link", null)` every link;
  `getByRole(null, null)` from JavaScript throws the role message.
- [add.reuseReusable.spec.ts](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts), any-frame seeds (7.15): a
  hand-made `ReusableLocator<Paths, "frameLocator">` without a selector and without steps registers and resolves a path
  inside it; with a step it throws at `add` and registers nothing; with the override `.frameLocator("iframe")` it takes
  `nth`.
- [add.reuseReusable.spec.ts](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts): P11's variants against a
  fixture table (the `first` and `last` rows, the `describe` and `filter` that must not leak); `seed.filter(…)` leaves
  `seed.steps` unchanged and returns a seed with the filter; `seed.definition` changed after creation has no effect.
  The route `/testfilters` or the static page supplies the rows; no new route.
- New [registry.strictChains.spec.ts](../test/tests/locatorRegistry/registry/) (one spec file per option, beside
  `registry.verify.spec.ts`), standalone registries against DOM: without the option and with `false` a sparse chain
  passes `verify()` and resolves without its unregistered segment; with `true`, `verify()` names every unregistered
  ancestor, one line per path, and a complete chain passes; `skip` of a registered ancestor still leaves it out under the
  option; an any-frame path with a registered and an unregistered ancestor (`app` registered, `app.frames` not,
  `app.frames.any`) reports both messages on its line, and one below a registered root only the any-frame message. Red
  on HEAD: the option is ignored there and `verify()` passes (P14).
- [pageObject/verify.spec.ts](../test/tests/pageObject/verify.spec.ts): an inline page object with `locators: {
  strictChains: true }` and an unregistered ancestor fails its first use, made synchronously after `new` (AGENTS.md
  section 3), with the labelled `verify()` message; the same class without the option does not.
- [publicTypes.typecheck.ts](../test/tests/packaging/publicTypes.typecheck.ts): path reuse offers `filter`, `nth` and
  `describe` and no strategy method (`@ts-expect-error` on `.getByRole(…)`), and is not `void`; seed methods return a
  `ReusableLocator` of the same strategy; `createRegistryWithAccessors(page, { strictChains: true })` and the
  `PageObject` option compile, `strictChains: "yes"` does not; P18's seeded forms for every method compile (a lone
  `null`, a `null` key, a primary with `null`), and its 8 negatives are `@ts-expect-error`s (`getByRole(null, null)`,
  `null` for `getByTestId`, `getById` and `frameLocator`, unseeded `add` with `null` options or a `null` key, unseeded
  `locator(null)`, `createReusable` with `null` options).
  [publicTypes.emit.ts](../test/tests/packaging/publicTypes.emit.ts): a block-bodied function that chains `describe`
  after a path reuse emits; a function returning a strict standalone registry emits.
- The existing sparse-chain spec
  ([registry.verify.spec.ts:157-161](../test/tests/locatorRegistry/registry/registry.verify.spec.ts#L157-L161)) stays as
  it is: it is the default.
- No change for 3.1, 3.3 or the debug-step record: the existing suites are the proof (P2, P12).

### 4.3 Docs (`docs/v3` only)

- [locator-registry.md](../docs/v3/locator-registry.md):
  - *Sparse chain behavior* (L640-644) becomes *Unregistered segments*: a segment without a registration is a name
    that groups paths and is left out of the chain; the locator is as specific as its registered ancestors; a looser
    locator that matches more than one element fails with Playwright's strict-mode violation naming the chain, one that
    matches exactly one element passes; `skip` is the per-query way to leave out a registered ancestor; the chain is in
    the call log, or `getLocatorSchema(p).describe("").getNestedLocator().toString()`; the terminal path is always
    registered. Then *`strictChains`*: the opt-in, the factory parameter and the `PageObject` option (set once in a
    domain base class), the message, enforcement by `verify()` only (a standalone registry calls it), `skip` unchanged,
    an any-frame path a root path. *Verifying a registry* (L648-704) names the option; the best-practice line (L1171)
    presents both styles.
  - *Default descriptions* (L975-996) and the comments at L561 and L575: P6's table of where the path shows and where
    the chain shows; `getLocator` and `getNestedLocator` share the description; a locator chained further prints its
    chain.
  - *Reuse by existing path string* (L907-919): copies the strategy, the steps and an explicit description; returns
    `filter`, `nth` and `describe`, chained after the copied steps; the note at L919 goes; no override and no
    `clearSteps` after a path: a different base is its own path, a variant with other options is a seed; path reuse is
    the preferred way to share across locator modules, `createReusable` mainly a tool inside one module that can still
    be exported and imported; a copy of an any-frame path takes no steps and sits where any any-frame path may (7.15).
    *Reuse patch rules* (L921-942): the table of the three forms from 1.1; the override takes `update`'s argument shapes
    and Merge Patch (`null` key, lone `null`, primary with `null`; 7.16); a primary is never `null` (7.14); corrected
    (P15): the override is the first call and at most one (L931 says "before or after", L929 says a second override
    throws a message), and the error reference drops the unreachable "only one matching override" line (L1067); L932's
    frame-seed note adds that a hand-made any-frame seed takes no steps or description (7.15).
  - *Seed immutability* (L967-969): seeds are values like Playwright locators; `filter`, `nth` and `describe` return a
    new seed; deriving variants from one base; `definition` and `steps` are copies.
  - *Error reference* (L1039-1089): the reuse message, the any-frame steps messages, the `strictChains` message, the
    missing-value message for a `null` or wrong-type primary; *Strategy method requirements* and the `update` section:
    `null` is never a primary, a lone `null` is the options (7.14);
    *Tested behavioral guarantees* (L1091-1110): seeds, path reuse and `strictChains`; *Migrating from 2.x to 3.0*
    (L1114): seeds and path reuse.
- [overview.md](../docs/v3/overview.md): L205 (where the description shows), L282-298 (path reuse returns steps; seeds
  are values; L298's "createReusable … as base for creating multiple variations, and reuse by path to reuse an exact
  locator definition" rewritten: reuse by path, narrowed with `filter`/`nth`/`describe`, is the preferred way to share
  across modules, `createReusable` mainly a tool inside one module), and one line on `strictChains`.
- [composing-locator-modules.md](../docs/v3/composing-locator-modules.md): the section on what a module may return
  (L250-270, a module that exports a seed) keeps the seed export as valid and says first that reuse by path, narrowed
  with `filter`, `nth` and `describe`, is the preferred way to share a locator between modules; an example of a shared
  module's path reused and narrowed in a page module.
- [PageObject.md](../docs/v3/PageObject.md): *Constructor and generics* (L15-34) and *Constructor options* (L134-143)
  gain `locators: { strictChains }`, with the example of 3.4 (every constructor option and every type option on one
  class) and a domain base class that sets it once; *Verification* (L183-216) names the strict message.

### 4.4 Changesets

`.changeset/seeds-and-path-reuse.md`, `"pomwright": major`, under *Breaking changes*:

- A seed from `createReusable` no longer changes: `filter`, `nth` and `describe` return a new seed. Migration: use the
  result, `add(p, { reuse: seed.filter(f) })` instead of `seed.filter(f); add(p, { reuse: seed })`.
- `add(path, { reuse: "other" })` returns `filter`, `nth` and `describe` (refused on a copy of an any-frame path).
  Migration: code that typed the result as `void` drops the annotation; a module compiled with `declaration: true` that
  returns it from an expression-bodied arrow uses a block body or `: void`.

Under *Fixes*: variants derived from one seed no longer share steps or a description; a reuse value that is neither a
path nor a seed throws a message instead of a `TypeError`; a `null` first argument from JavaScript throws at the call
(7.14), and so does a number, an object or a RegExp where Playwright takes none, on every builder; a hand-made seed
that brings steps or a description to an any-frame definition throws at `add` (7.15); a seeded override's `null` key
is deleted instead of stored, and its lone `null` and `(primary, null)` clear the options, as `update`'s do, now typed
(7.16). Under *Internal*: one strategy table for the ten strategies; the unused debug-step record removed.

`.changeset/strict-chains.md`, `"pomwright": minor`: `createRegistryWithAccessors(page, { strictChains: true })` and the
`PageObject` constructor option `locators: { strictChains: true }` make `verify()` require every ancestor of every path
to be registered; without them nothing changes. No migration.

### 4.5 Analysis, release notes, decisions, AGENTS.md, PLANS.md

At agreement: [DECISIONS.md](DECISIONS.md) gets this plan's section; [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)
gets, marked *planned*: breaking items for seeds and path reuse, an addition for `strictChains`, bug-fix lines for the
reuse check, the primaries Playwright cannot take, the seeded options and the hand-made any-frame seed, documentation
lines for descriptions, unregistered
segments and the seeded-override corrections, a cleanup line for the table and the record, a tests line, and upgrade
checklist items (use a seed method's result; drop `void` on a path reuse); [PLANS.md](PLANS.md) row 9 reads "written
2026-10-15, decisions taken 2026-10-16, awaiting implementation".

At execution (last step): tick 3.1, 3.3, 3.4, 3.5 and 3.8 (*Fix* or *Skip* with notes, per the decisions) and the
section 2 `debugSteps` bullet; flip the release-note items to *done*; append execution-time decisions.
[AGENTS.md](../AGENTS.md): the revision line; section 2 (`utils.ts` holds `STRATEGIES`, `locatorRegistry.ts` the
`strictChains` check, `pageObject.ts` the `locators` option); section 5, rules: per-strategy
rules live in the `STRATEGIES` table and a new strategy is a row plus its builder methods; a seed never changes, its
methods return new seeds; reuse by path copies the record and returns `filter`/`nth`/`describe`; unregistered segments
are namespaces unless `strictChains` is set, which `verify()` enforces; an any-frame definition takes no steps or
description from any source, checked at the call, and its position is checked by `verify()`; a primary is never `null`
or a value Playwright cannot take, a lone `null` is the options, and a seeded override merges as `update` does;
section 6 (plan 9 executed, next plan 10); section 7 (the ninth and tenth pending changesets); section 8 (no
per-strategy `switch` outside the table, no seed method that changes the seed, no steps or description on an any-frame
definition, never make `strictChains` the default). [PLANS.md](PLANS.md) row 9 to executed.

---

## 5. Tests

### 5.1 Unit tests (vitest, typecheck mode)

- [utils.test.ts](../src/locators/utils.test.ts): the table's rows (method, primary field, options, empty-string rule,
  the any-frame row); `assertStrategyPrimary` gives, for each strategy, exactly the message the builders gave
  (`getByRole requires a role value for "x".`, `getById requires a non-empty id for "x".`, the empty-string messages);
  `createLocator` with an unknown type throws `Unknown locator strategy`; a primary Playwright cannot take throws the
  missing-value message on every builder (7.14), and `update().getByRole(null)` still deletes the options;
  `isReusableLocator` over a seed, a hand-made seed-shaped object, `{}`, `42`, `null`, an array and a definition with an
  unknown type. The existing `createLocator`, clone, patch and `methodForStrategy` tests stay as they are, except where
  7.16 changes a seeded patch's result (none in the current suite, P17).
- [locatorUpdateBuilder.test.ts](../src/locators/locatorUpdateBuilder.test.ts) and
  [locatorRegistrationBuilder.test.ts](../src/locators/locatorRegistrationBuilder.test.ts): type tests that the update
  builder, the seed factory and the pre-definition registration builder each have exactly the methods of
  `StrategyMethod` (`Pick<…, StrategyMethod>` and `expectTypeOf<keyof …>`); the existing merge and replacement tests
  stay.
- [locatorRegistrationBuilder.test.ts](../src/locators/locatorRegistrationBuilder.test.ts), seeds: each method returns a
  new seed and leaves the original's steps and description; a variant of a variant; `definition` returns a copy;
  `describe`'s check unchanged.
- [locatorRegistry.test.ts](../src/locators/locatorRegistry.test.ts), with the fake page: path reuse returns the view,
  whose `filter`, `nth` and `describe` apply to the new path and not to the source; the reuse check's message for `{}`,
  `42` and `null`, with nothing registered; the array message unchanged; P11's base-and-variants case as recorded
  chains; path reuse copies the source's steps and an explicit description, and the new path is the default
  description (P15); 7.15 (P16's five unit tests): a copy of an any-frame path is registered without steps, its
  `filter`, `nth` and `describe` throw, and it passes `verify()` at a root path; a hand-made any-frame seed without
  steps registers as `add(path).frameLocator()`; one with steps or a description throws at `add` and registers nothing;
  the override `.frameLocator("iframe")` makes it a frame segment that takes `nth`; `add(path).frameLocator()` still
  returns nothing; and the position cases of 1.3 (`add` passes, `verify()` reports).
- [locatorRegistry.test.ts](../src/locators/locatorRegistry.test.ts), `strictChains` (the four tests of P14, extended):
  no option and `false` leave a sparse chain alone; `true` names every unregistered ancestor, one line per path, with
  `is`/`are` and the list form; a complete chain passes; `skip` still leaves a registered ancestor out; an any-frame path
  with a registered and an unregistered ancestor gets both messages on its line, one below a registered root only the
  any-frame message; a non-boolean from JavaScript leaves it off; the terminal path stays required in both modes.
- [locatorRegistry.test.ts](../src/locators/locatorRegistry.test.ts), primaries and seeded options (P17's seven tests):
  a seeded lone `null` clears the options, as `update`'s; a seeded `null` key is deleted from the record; a primary with
  `null` options; `null` as the first of two arguments throws on a seeded override and on `update`; `null` for
  `getByTestId`, `frameLocator` and `getById` on `add`, a seeded override, `replace` and `createReusable`; omitting
  still inherits on a seed and gives the any-frame form on `add`; a number or a RegExp role throws, a RegExp text does
  not. Plus one table-driven test from P18: for every strategy and each of its argument forms, `update()` on a
  registered definition and a seeded override on the same definition store equal records or throw the same message, with
  the expected record asserted for the forms of P18's table on one strategy with options and one without.
  [utils.test.ts](../src/locators/utils.test.ts): `assertStrategyPrimary` over `null`, `42`, `{}`, a RegExp per
  strategy. The existing `parseUpdateArguments` and `mergeOptions` tests stay where they are (the re-export).
- [pageObject.test.ts](../src/pageObject.test.ts): `locators: { strictChains: true }` reaches the registry (a sparse
  definition fails the scheduled check with the labelled strict message), and its absence does not.

### 5.2 Harness

Per 4.2. The existing specs stay green on all three browsers apart from
[add.reuseExisting.spec.ts:7-22](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L7-L22). Red first: the new
reuse and seed specs fail on HEAD (P9, P11 and P16 are the red evidence), the `strictChains` specs fail on HEAD because
the option is ignored there and `verify()` passes (P14), and the type probe's new negatives compile on HEAD or name a
method or option HEAD lacks (P10, P14).

### 5.3 Probes at execution

Re-run against the final tarball, in the scratchpad: P3 (HEAD against the final build: the 632 differing lines of P17
and no others, in its three classes; path reuse and seeds are not exercised by P3 beyond creation), P4 (the same two
classes, nothing else), P5, P6 (unchanged), P9, P10 (types and emit), P11, P14 (the flag off and on in the harness's
base class, as in the review), P15 (unchanged), P16 (the any-frame copy and the hand-made seed refuse steps at the call,
the position cases as in 1.3, the describe cases unchanged), P17 (the seeded options and the primaries), P18 (130 of
130 equal; the type probe clean). Recorded in the execution note, not added to CI.

---

## 6. Versioning

Two changesets, riding 3.0.0. `seeds-and-path-reuse` is `major`. Breaking by the book: a seed method no longer changes
the seed (code that relied on a statement `seed.filter(f);` loses the filter; none in the survey or the repository);
path reuse is no longer `void` (a `void` annotation fails, and an expression-bodied arrow that returns it fails
declaration emit; none in the survey). The reuse check and the primary check are fixes (each replaces a `TypeError`, a
nonsense locator such as `locator('null')`, or a call that did nothing); the seeded options follow `update` (7.16), a
fix for JavaScript callers and new typed forms for TypeScript ones, which could not write them before; the strategy
table and the deleted record are internal; 3.3 changes docs only. `strict-chains` is `minor`: an optional parameter and
an optional option, off by default.

---

## 7. Decisions

Taken in the review on 2026-10-16. The decided option is stated first in each, the rejected ones after "Rejected".

- [x] 7.1 3.1 strategy table: one `STRATEGIES` table in `utils.ts` (method, primary field, options, empty-string rule,
  optional primary, `create`); `createLocator`, the clone, the seeded patch, the `update` merge and the `replace` build
  generic over it; `methodForStrategy`, `STRATEGY_METHODS`, `TextLikeType`, `LocatorMethodForType` and the
  pre-definition `Pick` derived; one `assertStrategyPrimary`; the builders' public methods unchanged. Proven by P2 and
  P3. Each row keeps its own `create` with Playwright's signature, so a Playwright change to one method is one row plus
  that method's explicit builder signatures. Rejected: generating the builder methods from the table; keeping the
  switches.
- [x] 7.2 3.1 the two helper-level differences of P4 are accepted: a `null` primary in a role or text-like seeded patch
  is stored as given (the rule of the other four strategies; unreachable from the DSL), and a definition of no known
  strategy throws `Unknown locator strategy "<type>".` instead of being returned as it is. Rejected: a per-row rule
  that keeps `??` for six rows.
- [x] 7.3 3.1 completeness: the update builder, the seed factory and the pre-definition registration builder are pinned
  to the table by unit type tests, so a strategy without its method on any builder is a compile error.
- [x] 7.4 3.1 plan 1.10-2's hand-over: records are not rendered as DSL calls; the duplicate-registration message keeps
  its JSON. Rejected: a renderer over the table for that message.
- [x] 7.5 3.3 the default description stays the path, with no option; the docs state where Playwright shows the
  description and where the chain (P6). Rejected: an option `description: "path" | "none"` on
  `createRegistryWithAccessors` and the `PageObject` constructor; no default; the analysis's four modes.
- [x] 7.6 3.3 `has` inners keep their description: P6 shows it is printed nowhere. Rejected: not describing them.
- [x] 7.7 3.3 and section 2: the debug-step record is deleted, its nullable index with it; `buildLocatorChain` returns
  the `Locator`. Rejected: `registry.explain(path)`.
- [x] 7.8 3.4 sparse chains stay the default, documented as namespace segments (Playwright's strict mode as the net for
  a loosened locator, `skip` as the explicit form, how to see a chain); an opt-in `strictChains`, off unless set to
  `true`: `createRegistryWithAccessors(page, { strictChains })` and the `PageObject` constructor option `locators: {
  strictChains }` (not `PageObjectTypeOptions`, which is type-only); checked by `verify()` only, every proper ancestor
  of every path registered, one line per path naming every unregistered ancestor, every failing check of a path on its
  line; enforced for a standalone registry only when it calls `verify()` (documented); `skip`/`unskip` unchanged; under
  the option an any-frame path is a root path (documented); typed `strictChains?: boolean`, default `false`, so only
  `true` enables it; no new exported type; the terminal
  path is required in both modes, as today. Proven by P14. Changed in review from "no strict mode". Rejected: no
  option; strict by default; a warning per sparse path; a check at resolution.
- [x] 7.9 3.5 `add(path, { reuse: "other" })` returns `filter`, `nth` and `describe`, through the same seeded builder as
  seed reuse; the copy keeps the source's strategy, steps and explicit description, as today (P15), and the chained
  steps follow the copied ones; no override and no `clearSteps` after a path (reuse is reuse: a different base is its
  own path); a copy of an any-frame path takes no steps (7.15). The expectation at
  [add.reuseExisting.spec.ts:7-22](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L7-L22) changes.
  Rejected: the full seeded builder with ten overrides; `clearSteps` after a path; keeping `void`; removing path reuse.
- [x] 7.10 3.5 hand-over: a reuse value that is neither a string, an array nor a seed-shaped object (its
  `definition.type` a row of the table) throws `reuse requires a registered path or a seed from createReusable for
  "<path>".`; the array branch stays. Rejected: leaving the `TypeError`.
- [x] 7.11 3.8 seeds are immutable: `filter`, `nth` and `describe` return a new seed, `definition` returns a copy; the
  public type is unchanged; seeded `add` keeps its shape (one override of the seed's strategy as the first call, then
  steps and `describe`; its merge is 7.16's). A chain of calls makes one seed per call, each from the one before (about
  0.4 µs for four calls); sharing one copy across a chain would bring the P11 bug back. Rejected: documenting the
  mutation; freezing a seed at its first `add`.
- [x] 7.12 Tests per section 5: unit tests first, the one changed harness expectation of 7.9 listed, new reuse, seed and
  `strictChains` specs against DOM, additions to both public-type probes; no new dependency.
- [x] 7.13 Docs per 4.3, including the two seeded-override corrections P15 found (the override is the first call and at
  most one; the unreachable "only one matching override" line leaves the error reference); two changesets per 4.4,
  `seeds-and-path-reuse` (`major`) and `strict-chains` (`minor`).
- [x] 7.14 Outside the analysis items (P3, P17): a primary is always a value. `assertStrategyPrimary` gives any first
  argument Playwright cannot take for the strategy (`null`, a number, an object, a RegExp for role, `locator` or
  `frameLocator`) the missing-value message, `<method> requires a <field> value for "<path>".` (`getById requires a
  non-empty id …`), on every builder: `add`, a seeded override, `createReusable`, `update`, `replace`, as unseeded `add`
  already did for most. With two arguments the first is the primary, so `getByRole(null, null)` is valid nowhere. A lone
  `null` where options may stand is the options (on `update` it deletes them, as documented; 7.16 for seeds).
  `frameLocator(null)` throws too; the any-frame form stays an omitted selector on `add` and `replace`, and omitting
  still inherits on a seed and on `update`. A call with two mistakes from JavaScript reports the primary first.
  Rejected: rejecting `null` only (a number or an object stays stored); leaving it.
- [x] 7.15 Found in the final review (P16): an any-frame `frameLocator()` definition takes no steps and no description,
  from any source, checked when they are offered: `filter`, `nth` and `describe` on it throw at the call
  (`<method>() cannot apply to "<path>": frameLocator() without a selector has no element to filter, index or describe;
  resolve a path inside it.`), which covers a copy by path; a seed that carries steps or a description on an any-frame
  definition (only a hand-made object can) throws at `add` (`reuse cannot apply to "<path>": …`) and registers
  nothing. A valid copy or seed (nothing on it) registers; its position stays `verify()`'s first-segment check, as for
  every any-frame path (under `strictChains`, a root path); an override that gives a seed a selector makes it an
  ordinary frame segment. `add(path).frameLocator()` is unchanged. Rejected: a branch for path reuse only (leaves the
  hand-made seed); refusing every any-frame seed (rejects a valid one); a `verify()` check for steps (a later failure
  for a rule checkable at the call).
- [x] 7.16 Found in the last review (P17): a seeded override takes `update`'s argument shapes and JSON Merge Patch. It
  parses with `parseUpdateArguments` and merges with `mergeOptions` (moved to `utils.ts`): a `null` key deletes the key
  (today stored as `null`, and `{ name: null }` fails at resolution), a lone `null` clears the seed's options (today a
  no-op), and `(primary, null)` sets the primary and clears them (today keeps them). The seeded overloads type their
  options `OptionsPatch<…> | null`, as `update`'s, so the three forms compile; unseeded `add` keeps Playwright's option
  types. Proven for every method by P18: 130 of 130 strategy and argument-form cases equal to `update`'s, and the types
  per method. Rejected: keeping the spread merge and documenting it; a `null` option meaning anything but deletion.

> Notes: Review 2026-10-16. 3.8: agreed, the 2.x mutation was unintended. 3.5: the `void` of 2.x was a documented
> design (reuse is reuse, no change of the reused locator); what was missing was narrowing, which pushed shared locators
> into exported `createReusable` seeds; with `filter`/`nth`/`describe` after a path, reuse by path is the way to share
> across locator modules, and `createReusable` mainly a tool inside one module. 3.1: the per-method code was meant to
> isolate a Playwright change to one method; the table keeps that in each row's `create`. 3.3: the report's step rows
> stay readable, and the chain is in each step's call log. 3.4: the paths' unregistered segments are intended
> namespaces; `strictChains` is wanted as an opt-in for projects that register every segment, a boolean defaulting to
> `false`. Sharing a seed through export and import stays valid; the docs say reuse by path is preferred and
> `createReusable` is mainly for one locator module. Final review: 7.15 taken in its general form: throw only where an
> any-frame cannot be valid (steps, a description), never at `add` for a valid copy or seed; position stays with
> `verify()`. Last review: `null` on `update` deletes; a primary is always required and never `null`, so a lone `null`
> on `update` or a seeded override is the options and clears them, and `getByRole(null, null)` is valid nowhere;
> `frameLocator(null)` as a way to an any-frame seed was judged odd, so it throws (7.14, 7.16).

---

## 8. Execution order

1. The strategy table (4.1 steps 1 to 4 for 3.1 only, without `isReusableLocator`, the seed change and 7.14) with the
   type tests of 7.3; `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm harness:install`,
   `pnpm typecheck`, the chromium project, and P3 against the build, which must stay identical.
2. The contract changes (4.1 step 3's view after a path reuse and seeded overrides, steps 4 and 5: seeds, path reuse
   with the any-frame rule of 7.15 in the builder, the reuse check, the debug-step record; from step 1, the primary rule
   of 7.14 and the seeded Merge Patch of 7.16) with their unit tests first (red, then green); the same commands.
3. `strictChains` (4.1 step 6) with its unit tests first (red, then green); the same commands, and the chromium project
   once more with the option set in the harness's base class (P14, not committed).
4. Harness (4.2): the changed and new specs and the type probes, red first against HEAD (copied into a scratchpad
   clone of 181475e with its packed build, since the specs run against the tarball); `pnpm harness:install`,
   `pnpm typecheck`, the chromium project.
5. Docs in `docs/v3`.
6. Changesets: `seeds-and-path-reuse` and `strict-chains`.
7. Full run: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test --reporter=line` (three
   browsers), the probes of 5.3 against the final tarball; fix anything red as its own step.
8. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md`, this plan's
   execution note.
