# Plan: small fixes and dead code (analysis item 1.10, the section 2 code bullets, and one shared call-site helper)

Working document, kept in `release-3.0.0/` beside the analysis it answers: the seven open bullets of item 1.10
(`isLocatorInstance` accepting arrays; the duplicate-registration error; `remove()` then `update()`; `filter`/`nth`
on a removed sub-path; `ensureSubPath` conflating its two failures; `@step` on sync and static methods; the logger
defect and the two logger enhancements), the four open code bullets of section 2 (unreachable branches in
`locatorRegistry.ts`, `getLocator` building a full query builder, the single-element array helper with the
`any`-only branch, triple cloning per segment), and decision 7.16 of plan 1.7 (one call-site helper shared by `seed`
and `PageObject`). File links are relative to this folder.

Written 2026-10-15 and reviewed the same day. The review replaced `remove()` by `skip(subPath)`/`unskip(subPath)`, a
pure flag that deletes nothing and never applies to the terminal (3.3); added the copies at the DSL boundary after a
probe showed that a caller's options and filter objects stay live in the registry (2.10, 3.6); withdrew the reads
without a clone, so that every resolution works on a clone (3.12); added the `describe` argument check and the rules
for a skipped segment (3.4, 3.5); answered plan 1.9's `nth(null)` question by passing `nth` through to Playwright (3.5); gave the `@step` compile
error a message that says what to do (3.11); and turned the logger into "messages as given, arguments as `console.log`
prints them, timestamps in the run's locale and time zone, in call order", with no pretty-print option (3.8, 3.9).
Every decision in section 7 was taken with the user on 2026-10-15. Executed 2026-10-15, see below.

**Executed 2026-10-15** on `chore/bugfixes-quality-improvements-and-docs`, one commit per execution step: 07e7398 (1,
the locators with their unit tests, red then green, and a fake page that records chains), 87952e7 (2, the helpers:
the call-site helper, `@step`, the logger and the `log` fixture, with their unit tests and a type-only
`stepDecorator.test-d.ts`), 2fb669a (3, the harness: the four `remove(` call sites converted, the skip spec against
DOM, the copy, `nth`, `describe` and sub-path specs, the call-site and logging specs, the public-type probes; 32 of
the new and changed tests fail against the code before this plan), 495bb3a (4, `docs/v3`, the snippets compiled
against the packed package), 5d2371c (5, the changeset), 3c0dcf6 (6, the full run found one red test, on WebKit only:
the seed call-site spec ended before the seed had applied; fixed by waiting for it), and the ledger commit for step 7
that carries this note. Final run: `pnpm lint` clean, 369 unit tests with no type errors, `pnpm build`,
`pnpm pack-test` 1221 passed (407 per browser) with both type checks, and the probes of 5.3 against the final build as
planned. The execution-time decisions (the fake page, how `@step` and the log fixture are tested, the stack handoff
between two serial tests, the WebKit wait, the doc comments) are in [DECISIONS.md](DECISIONS.md).

Every claim below was verified on 2026-10-15 against HEAD b0ff3d0, never in the working tree: three fresh clones in
the session scratchpad (`head` for the current behaviour, `reach` with a marker planted in each suspect branch,
`proto` with the design of section 3 as revised in review), each with `pnpm install --frozen-lockfile`, `pnpm build`
and `pnpm harness:install`; runtime probes as Node scripts against each clone's `dist/index.js` with chromium from the
same clone's root `@playwright/test` 1.64.0 (`createRequire` of its `package.json`); runner probes as temporary specs
in the clone's `test/tests/`, run on chromium with `--retries=0` and a JSON or HTML reporter, the HTML report read back
in chromium over a local HTTP server; type probes with the repository's TypeScript 5.9.3 under the harness
`tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `moduleResolution` `bundler`), once
more with `experimentalDecorators`, every negative case a consumed `@ts-expect-error`; Node 24.19.0. API usage facts
come from one 2.1.0 consumer project, counts only. Example hosts are generic (`*.example`).

Probes cited below: **P1** values passed as `has` (an empty array, an array of locators, an object with only
`filter`, a `FrameLocator`, a `Page`, a `Locator`) through `verify()` and resolution, and the same values given to
Playwright's own `locator.filter({ has })`; **P2** the duplicate-registration message in six cases (size, lines, time,
content) and **P2b** how Playwright objects serialise (`JSON.stringify`, `String`, `util.inspect`); **P3** `remove()`
followed by `update`, `replace`, `filter`, `nth`, `describe`, `clearSteps`, `getLocator`, `getNestedLocator`, and the
sub-path errors for a sparse chain and for a path outside the chain; **P4** `add(path, { reuse })` with values that
are not a seed, `getLocator`/`getNestedLocator` with malformed paths, `nth` with `null`, `undefined`, `"2"` and `1.5`;
**P5** a throwing `update()` after `remove()`; **P6** Playwright's own `locator.nth()` with the same values; **P7**
(runner) the reported stack of a broken page object and of a never-applied seed, each defined in a consumer file named
`helpers.ts`, `pageObject.ts` and `sessionStorage.ts`; **P8** (runner) `@step` on sync, async and static methods, the
decorator mode Playwright compiles (also under a `tsconfig.json` with `experimentalDecorators`), a decorator in a `.js`
file, an un-awaited sync method (execution order, a throw), and legacy decorators emitted by `tsc` (instance and
static, `@step()` and bare `@step`); **P9** `tsc`: `@step` on a sync method, a getter, a field, an accessor and a static
method, both forms under `experimentalDecorators`, and `filter({ has: [] })`; **P10** (runner) the logger's attachments
for a message alone, an object, an array and a number, an `Error`, a `Locator`, a JSON string, `undefined` and `null`,
a circular object; **P11** reachability: a throwing marker in each suspect branch, run through the 276 unit tests and
the 374 chromium tests; **P12** clone counts and the median time per call on a five-segment chain, HEAD against the
prototype; **P13** the prototype: unit tests, `pnpm typecheck`, the chromium suite, and the probes rerun against it;
**P14** the consumer survey and the harness counts; **P15** vitest and decorators: decorator syntax in a `*.test.ts`
file at runtime, and a `*.test-d.ts` file in the type check; **P16** `tsc`: which arguments `remove`, `nth` and
`describe` accept today; **P17** `describe("")`, `describe(null)` and `describe(undefined)` on a query, and on
Playwright's own `locator.describe`; **P18** a caller's object (an options object, a filter object, a seed's step or
definition, a query's filter, an update's options) mutated after the call that took it; **P19** what can be copied:
`structuredClone` of options holding a `Locator` or a RegExp, a RegExp's `lastIndex` changed after `add`; **P20**
(runner) where a locale can come from (the `locale` and `timezoneId` fixtures, `testInfo.project.use`, Node's default,
`test.use`), the five formats, and how the HTML report shows `text/plain` and `application/json` attachments; **P21**
`util.inspect` with `console.log`'s defaults, with no depth limit, and `JSON.stringify`, on nested data, on awkward
values (`Date`, `Error`, `Map`, `Set`, RegExp, `undefined`, a `Locator`, a function), on a circular object and on a
`Page`; **P22** (runner) Playwright's clock API (`page.clock.install`, `setFixedTime`) against the logger's timestamps;
**P23** the complete duplicate-registration message for one case from the published 2.1.0 package (copied from the
surveyed project's install), HEAD and the prototype; **P24** `nth` passed through to Playwright on the prototype: the
rendered locator and match count for `null`, `undefined`, `"2"`, `1.5`, `-1`, `"first"`, `"last"` and `1` next to
Playwright's own `locator.nth()`, and the compile errors of both for `undefined` and `"2"`; **P25** `@step` with a
last overload whose parameter type is the message, under stage-3 and `experimentalDecorators`.

Out of scope, left to the plans listed in [PLANS.md](PLANS.md): `debugSteps` and `registry.explain(path)`, the
strategy table, `describe` options, strict chains, path reuse returning a builder and seed immutability (plan 9); the
documentation sweep, including the `logging.md` bullets of section 5 (the `expect` import, the undeclared
`sharedLogLevel`/`sharedLogEntry` in the fixture example) and README fixes (plan 10); the Starlight site (release
work). The debug-step record of `buildLocatorChain` and its nullable index stay exactly as they are (plan 1.9 left
them to plan 9). The shadowed `isTerminalStep` that [PLANS.md](PLANS.md) row 8 mentions was closed by plan 1.6-1.8
with the frame branch it sat in (the analysis already ticks it); nothing to do here.

---

## 1. Intended contract

### 1.1 In short, for consumers

Most of this plan is invisible: dead branches go, `getLocator` stops building a query builder it does not need, and a
nested resolution clones each segment once instead of twice. What a consumer can notice:

**`remove()` becomes `skip()` and `unskip()`, a flag that deletes nothing.** Skipping leaves an ancestor out of the
chain when the query resolves; unskipping brings it back exactly as it was. Today `remove()` deletes the segment's
definition, steps and description from the query, and a later `update()` or `replace()` brings back the definition
only (P3):

```ts
// registered: main = locator("main"), main.list = locator("ul").filter({ hasText: "Orders" }),
//             main.list.item = locator("li").nth(0).describe("first item")
const query = registry.getLocatorSchema("main.list.item");

query.skip("main.list").getNestedLocator();                    // locator('main').locator('li').first()
query.unskip("main.list").getNestedLocator();                  // locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()

// 2.1.0 and HEAD
registry.getLocatorSchema("main.list.item").remove("main.list").update("main.list").locator("ol");
// the filter on main.list is gone: locator('main').locator('ol').locator('li').first()

// 3.0.0: a skipped segment rejects changes until it is unskipped
registry.getLocatorSchema("main.list.item").skip("main.list").update("main.list");
// update() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
```

The terminal path cannot be skipped: TypeScript offers only the ancestors (`query.skip("main.list.item")` is TS2345,
`Argument of type '"main.list.item"' is not assignable to parameter of type '"main" | "main.list"'`), there is no
form without an argument, and JavaScript gets `skip() cannot skip "main.list.item": it is the path this query
resolves; skip one of its ancestors.` To take steps or a description away, the query has `clearSteps()` and
`describe("")`, which say what they do.

**`@step` decorates methods that return a Promise.** `test.step` always returns a Promise, so a decorated sync method
returns one too while its type still says otherwise, and its body runs only after the caller has moved on (P8):

```ts
class AccountPage extends PageObject<Paths> {
  @step()
  rowCount(): number {          // 2.1.0 and HEAD: compiles; the call returns a Promise typed as number
    return 3;
  }
}

// 3.0.0: a compile error
//   TS1241 Unable to resolve signature of method decorator when called as an expression.
//     Type 'number' is not assignable to type 'Promise<unknown>'.
// what was meant:
@step()
async rowCount(): Promise<number> { … }
```

A decorated static method is titled by its class (`AccountPage.create`), not `Function.create`.

**The logger keeps what it is given.** The message and every string argument are attached exactly as written; any
other argument is printed the way `console.log` prints it; the timestamps follow the run's `locale` and `timezoneId`;
the entries keep their call order:

```ts
log.info("order", { id: 7, total: 42 });
// 2.1.0 and HEAD: "order\n\n[object Object]"
// 3.0.0:          "order\n\n{ id: 7, total: 42 }"           (as console.log prints it; deeper levels show [Object])

log.info("order", JSON.stringify(order, null, 2));             // the full object, exactly as stringified, as today

log.info('{"id":7}');
// 2.1.0 and HEAD: re-formatted to '{\n  "id": 7\n}'
// 3.0.0:          '{"id":7}', as written (still attached as application/json)

log.info("ready");
// 2.1.0 and HEAD: "ready\n\n"            3.0.0: "ready"

// the attachment name: 2.1.0 and HEAD always nb-NO, "08:19:55 15.10.2026 - INFO : [TestCase]"
// 3.0.0 in the configured locale: Playwright's default en-US gives "08:19:55 AM 10/15/2026 - INFO : [TestCase]",
//       use: { locale: "nb-NO" } gives the 2.x form
```

**A registered locator cannot change after registration.** Today the registry keeps the caller's own objects: an
options object or a filter object changed after `add()` changes the registered locator (P18). In 3.0.0 every builder
stores copies.

**`nth` behaves exactly like Playwright's.** `nth(null)` and `nth(undefined)` from JavaScript (both compile errors in
TypeScript, in POMWright as in Playwright) are dropped today, so the locator matches every element, where Playwright's
own `nth(null)` matches nothing (P4, P6). In 3.0.0 every index except POMWright's `"first"` and `"last"` goes to
Playwright's `nth` as given, so the result is Playwright's: `nth(undefined)` matches nothing, `nth("2")` is `nth(2)`
(P24). `describe(null)` and `describe(undefined)` from JavaScript throw; `describe("")` stays the way to remove a
description.

**Smaller items.** A sub-path that is a segment of the query's path but has no registration keeps its message and
gains the reason. An array in `has` (a compile error, so JavaScript or a cast) is reported as an unsupported filter
reference instead of Playwright's misleading `Inner "has" locator must belong to the same frame.`. The
duplicate-registration message shows a `Locator` in a step as Playwright prints it (`locator('b')`) instead of its
internals. An error raised by a page object's scheduled check or by a pending `seed` points at the consumer's own line
even when the consumer's file is named `pageObject.ts` or `sessionStorage.ts`.

What a consumer can notice:

| where | 2.1.0 and HEAD | 3.0.0 |
| --- | --- | --- |
| `remove(subPath?)` | deletes definition, steps and description from the query; the terminal by default | gone; `skip(subPath)`/`unskip(subPath)`, a flag, ancestors only (7.3, 7.4) |
| `update`/`replace`/`filter`/`nth`/`clearSteps` on a removed or skipped segment | `update`/`replace` rebuild the definition only; `filter`/`nth` accepted, then dropped or wiped (P3) | throw at the call, naming `unskip` (7.5) |
| `@step` on a method that does not return a Promise | compiles; returns a Promise; body deferred, throws escape (P8) | compile error TS1241 naming `"@step decorates methods that return a Promise: make the method async"` (7.11) |
| `@step` on a static method | step titled `Function.<name>` (P8) | `<Class>.<name>` (7.12) |
| bare `@step` on a static method under `experimentalDecorators` (forced past TS1241, or precompiled) | silently not wrapped (P8) | wrapped (7.12) |
| a logged message or string argument | JSON re-formatted; `"42"`, `"true"` tagged JSON; `\n\n` appended without arguments (P10, P20) | as written; JSON only for an object or array message (7.13) |
| a logged object, array, `Error`, `undefined` | `[object Object]`, `1,2`, the first line, an empty string (P10) | as `console.log` prints it (7.13) |
| attachment names | always `nb-NO`, the machine's time zone | the `locale` and `timezoneId` fixtures (7.14) |
| attachment order and count | sorted by wall-clock time, one per entry | call order, one per entry (7.14) |
| a caller's options or filter object changed after the call | changes the registered or queried locator (P18) | no effect: builders store copies (7.8) |
| `nth(null)`, `nth(undefined)` from JavaScript | the step is dropped; the locator matches every element (P4) | passed to Playwright: matches nothing, as Playwright's own (7.10, P24) |
| `describe(null)`, `describe(undefined)` from JavaScript | the path as description (P17) | throws at the call; `describe("")` removes the description (7.9) |
| a sub-path that is an unregistered segment of the path | `"a.b" is not a valid sub-path of "a.b.c".` | the same sentence plus the reason (7.6) |
| `has: []`, `has: [locator]`, an object with only `filter` | `verify()`: `Inner "has" locator must belong to the same frame.` (P1) | `verify()`: `Unsupported filter reference while resolving "<path>". …` (7.1) |
| duplicate registration with a `Locator` in a step | `"has": { "_apiName": "Locator", "_frame": { "_type": "Frame", "_guid": "frame@…" }, "_selector": "b" }` (P2) | `"has": "locator('b')"` (7.2) |
| a page object in `pageObject.ts`, a `seed` in `sessionStorage.ts` | the stack skips the consumer's frame; the code frame is the caller's caller (P7) | the consumer's own line (7.15) |
| `getLocator(path)` | builds a query builder, clones every segment twice | resolves a clone of the record, about twice as fast (P12, 7.17) |

### 1.2 Principles for this plan

- **A registered locator cannot change after registration.** Builders store copies of what the caller passes; every
  resolution (`getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`, `has` paths) works on a clone; each
  `getLocatorSchema` call is a new, independent clone.
- **A flag is a flag.** `skip` hides a segment and deletes nothing; `update` and `replace` change the definition and
  nothing else; `clearSteps` and `describe("")` are the way to take steps and a description away.
- **A call that can have no effect fails at the call.** A change to a skipped segment, like `filter` before a strategy
  on `add` (plan 1.6-1.8) and like the any-frame rule; a `describe` argument the types already reject when it comes
  from JavaScript.
- **A throwing DSL call changes nothing** (AGENTS.md section 5); P5 is a case that breaks it today.
- **Mirror Playwright and Node.** `@step` claims what `test.step` returns; `nth` hands its index to Playwright, so a
  future change there applies without a change here; the logger prints arguments as `console.log` does; a `Locator` is
  shown as Playwright prints it; timestamps use the locale and time zone Playwright runs with.
- **Validate at runtime; add compile-time checks only where they cost users nothing.** The two new compile errors
  (`@step` on a sync method, `skip` on the terminal) are code that misbehaves at runtime today (P8, P3); none in the
  survey or the harness's typed code (P14).
- **Behaviour-preserving where the bullet is about code.** The section 2 bullets change no observable result (P11,
  P13, P4).
- **No new dependency.** The logger uses Node's built-in `util` (bundled as `require("util")`, P13).

### 1.3 Edge cases, with the decided answer

| case | today (verified) | 3.0.0 |
| --- | --- | --- |
| `skip("main.list")`, then `unskip("main.list")` | n/a | the chain exactly as registered (P13) |
| `filter("main.list", …)`, `skip("main.list")`, `unskip("main.list")` | n/a | the registered filter and the added one both apply (P13) |
| `skip("main")` then `getLocator()` | n/a | terminal-only, so skipping changes nothing (P13) |
| `skip("main.list.item")` (the terminal) from JavaScript | (`remove` accepted it) | throws (P13) |
| `skip()` without an argument from JavaScript | (`remove()` meant the terminal) | throws `"undefined" is not a valid sub-path of "main.list.item".` (P13) |
| `skip` twice, `unskip` without `skip` | n/a | throws (P13) |
| `skip` on a one-segment query | (`remove()` accepted the terminal) | compile error: nothing to skip (P13) |
| `skip("main.list").update("main.list")`, `replace`, `filter`, `nth`, `clearSteps` | n/a | throws at the call, naming `unskip` (P13) |
| `remove(…)` in existing code | works | TS2339 `Property 'remove' does not exist`; JavaScript: `remove is not a function` (P13) |
| a throwing `update()` after `remove()` | throws, and the segment is back in the query (P5) | n/a: `update` on a skipped segment throws before anything changes |
| `describe("")` on a query | no description: Playwright shows the chain (P17) | unchanged |
| `describe(null)` / `describe(undefined)` from JavaScript | the path (P17); Playwright's own: none, and a broken selector `internal:describe=undefined` | throws `describe requires a string for "<path>"; pass "" to remove the description.` (P13) |
| `nth(null)`, `nth(undefined)` from JavaScript | dropped (P4); Playwright's own matches nothing (P6) | `nth(null)` and `nth(undefined)` as in Playwright: the locator matches nothing, so the test fails at the first action after its timeout, the call log showing `.nth(undefined)`; `verify()` cannot see it (no DOM) (P24) |
| `nth(-1)`, `nth("2")`, `nth(1.5)` from JavaScript | passed to Playwright | unchanged: `last()`, `nth(2)`, `nth(1.5)`, as Playwright (P24) |
| an optional index (`i` may be `undefined`) | `nth(i)` is a compile error; from JavaScript the step is dropped | a conditional call, `if (i !== undefined) query.nth(i)`: `nth(undefined)` is not "no index" in Playwright either |
| an options object changed after `add(…).getByRole("button", options)` | the registered locator changes (P18) | no effect (P13) |
| a filter object changed after `filter(f)` on `add`, a seed or a query | the locator changes (P18) | no effect (P13) |
| `seed.steps[0].filter` changed after `add(path, { reuse: seed })` | the registered locator changes (P18) | no effect (P13) |
| a RegExp in options or a filter whose `lastIndex` changes after `add` | no effect (P19) | unchanged: a RegExp is kept by reference, its pattern is fixed |
| `filter("a.b", …)` on `a.b.c` with `a.b` unregistered | `"a.b" is not a valid sub-path of "a.b.c".` | the same sentence, then `It is a segment of that path, but no locator schema is registered for it.` (7.6) |
| `filter("main", …)` on `a.b.c` (from JavaScript) | `"main" is not a valid sub-path of "a.b.c".` | unchanged (7.6) |
| `getLocator("list..item")` from JavaScript | the path-format error (P4) | unchanged (P13) |
| `add("x", { reuse: ["reason"] })` forced at runtime | `Invalid reuse path configuration for "x": reason` (P4), pinned by a spec | unchanged (7.16) |
| `add("x", { reuse: {} })`, `{ reuse: 42 }`, `{ reuse: null }` from JavaScript | `TypeError` (P4) | unchanged; not in the analysis |
| `has: page.frameLocator("iframe")` | `Unsupported filter reference …` (P1); Playwright itself renders `internal:has=undefined` | unchanged (7.1) |
| `@step` on a getter, field or accessor | compile errors already (P9); from JavaScript, decorators do not load at all (P8) | compile errors; a cast throws `@step decorator can only be applied to methods.` in both decorator modes (7.12) |
| `@step()` on a method returning `Promise<T>` without `async` | compiles | compiles (P13) |
| `log.info("x", locator)` | `locator('b').filter(…)` | the same (Playwright's custom inspect) |
| `log.info("x", nested)` with data deeper than two levels | `[object Object]` | `[Object]` below the second level, as `console.log`; `JSON.stringify(nested, null, 2)` for all of it (P21) |
| `log.info("x", page)`, or a page object | `[object Object]` | about 36k characters, as `console.log` (P21) |
| `log.info("42")`, `log.info("true")` | `application/json` (P20) | `text/plain` (P13) |
| `page.clock.install()`, `setFixedTime()` in the test | the page's `Date` changes; the log timestamps do not (P22) | unchanged |
| a test that fakes Node's own `Date` (sinon fake timers, for example) | the timestamps follow the fake | unchanged; documented |
| a consumer subclass of `SessionStorage` whose `seed` calls `super.seed` | n/a | the site starts at the subclass's `super.seed` line, the consumer's code (7.15) |
| a page object behind a domain base class | the domain base's `super(...)` line, then the page object's (plan 1.7) | unchanged (P13) |

### 1.4 2.1.0 and 3.0.0 side by side

`@step`, the logger, the `log` fixture and `isLocatorInstance` are unchanged since v2.1.0 (`git diff v2.1.0 HEAD` is
empty for those files), so HEAD's behaviour is 2.1.0's there. The query builder and the registry were rewritten by
plans 1.6-1.8 and 1.9; the 2.1.0 facts below come from the analysis.

| aspect | 2.1.0 | HEAD | 3.0.0 |
| --- | --- | --- | --- |
| `isLocatorInstance` | `filter` is a function, [utils.ts:429-431](../src/locators/utils.ts#L429-L431) | same | `filter`, `nth` and `locator` are functions (7.1) |
| duplicate-registration details | the whole record through `stringifyForLog` | same, [locatorRegistry.ts:210-220](../src/locators/locatorRegistry.ts#L210-L220) | locators rendered by `String()`, the dead branch gone (7.2) |
| hiding a segment in a query | `remove`: delete plus tombstone | same, [locatorQueryBuilder.ts:326-341](../src/locators/locatorQueryBuilder.ts#L326-L341) | `skip`/`unskip`: a flag (7.3) |
| bringing it back | `update`/`replace`: the definition only | same, [L241-260](../src/locators/locatorQueryBuilder.ts#L241-L260), [L299-311](../src/locators/locatorQueryBuilder.ts#L299-L311) | `unskip`: everything (7.3) |
| hiding the terminal | allowed, and `remove()`'s default | same | not allowed (7.4) |
| changes to a hidden segment | accepted, lost | same | rejected (7.5) |
| sub-path message | one sentence for two failures | [L407](../src/locators/locatorQueryBuilder.ts#L407) | the reason appended (7.6) |
| caller objects | kept by reference | same, [locatorRegistry.ts:86-93](../src/locators/locatorRegistry.ts#L86-L93), [utils.ts:178-180](../src/locators/utils.ts#L178-L180) | copied at the boundary (7.8) |
| `describe` argument | not checked at runtime | same | a string (7.9) |
| `nth(null)`, `nth(undefined)` | dropped | same, [utils.ts:202-205](../src/locators/utils.ts#L202-L205) | passed to Playwright (7.10) |
| `@step` types | any method, [stepDecorator.ts:17-27](../src/helpers/stepDecorator.ts#L17-L27), [L90-93](../src/helpers/stepDecorator.ts#L90-L93) | same | methods returning a Promise (7.11) |
| `@step` static titles, kind check, legacy detection | [L49-51](../src/helpers/stepDecorator.ts#L49-L51), [L62-65](../src/helpers/stepDecorator.ts#L62-L65), [L29-30](../src/helpers/stepDecorator.ts#L29-L30) | same | class name; `context.kind` checked; detected by shape (7.12) |
| logger output | `args.join`, JSON re-formatted, [playwrightReportLogger.ts:75](../src/helpers/playwrightReportLogger.ts#L75), [L179-188](../src/helpers/playwrightReportLogger.ts#L179-L188) | same | as given; `console.log` for non-strings (7.13) |
| logger timestamps and order | `nb-NO`, sorted, [L163-175](../src/helpers/playwrightReportLogger.ts#L163-L175) | same | Playwright's `locale`/`timezoneId`, call order (7.14) |
| call-site capture | `seed` only | two helpers filtering by file name, [sessionStorageSeed.ts:168-182](../src/helpers/sessionStorageSeed.ts#L168-L182), [pageObject.ts:51-64](../src/pageObject.ts#L51-L64) | one helper with a V8 boundary, `src/helpers/callSite.ts` (new) (7.15) |
| unreachable branches | the analysis's list | D1 to D6, D8, D9 (2.8) | removed (7.16) |
| `getLocator` | a full query builder | same, [locatorRegistry.ts:448-450](../src/locators/locatorRegistry.ts#L448-L450) | a clone of the record, terminal-only (7.17) |
| clones per segment on a nested resolution | three | two (plan 1.6-1.8 removed the per-type cache) | one (7.18) |

---

## 2. How it works today (verified)

### 2.1 `isLocatorInstance` (1.10, first bullet)

[utils.ts:429-431](../src/locators/utils.ts#L429-L431) accepts any object whose `filter` is a function; its only
caller is `resolveFilterLocator` ([locatorRegistry.ts:273](../src/locators/locatorRegistry.ts#L273)), which passes
such a value to Playwright as `has`/`hasNot`. In TypeScript `has: []` and `has: [locator]` are compile errors (P9:
both directives consumed), so the case is JavaScript or a cast. P1, each value registered as `has` on `list.item`:

| value | `verify()` today | Playwright's own `locator.filter({ has: value })` |
| --- | --- | --- |
| `[]`, `[page.locator("b")]`, `{ filter() {} }` | fails: `"list.item": Inner "has" locator must belong to the same frame.` | the same error |
| `page.frameLocator("iframe")` | fails: `Unsupported filter reference while resolving "list.item". …` | no error: renders `li >> internal:has=undefined` |
| `page` | fails: `Unsupported filter reference …` | (not tried) |
| `page.locator("b")` | passes; resolves `locator('ul').locator('li').filter({ has: locator('b') })`, one match | n/a |

Nothing is silent: an array fails in `verify()`, so at fixture setup, but with Playwright's message about frames. A
`Locator` has `filter`, `nth` and `locator`; an array has only `filter`, a `FrameLocator` has `nth` and `locator` but
no `filter`, a `Page` has `locator` only.

### 2.2 The duplicate-registration error (1.10, second bullet)

[locatorRegistry.ts:205-222](../src/locators/locatorRegistry.ts#L205-L222): `register` checks `schemas.has`, then
reads the record and checks it again (`if (!existing)`, [L212-214](../src/locators/locatorRegistry.ts#L212-L214),
unreachable: a `Map` never holds `undefined` here), and throws with `stringifyForLog({ existing, attempted })`
([utils.ts:182-200](../src/locators/utils.ts#L182-L200)), which handles cycles and RegExps. The attempted record holds
only the strategy, because the registration builder registers at the strategy call and the steps follow it.

P2, against a real page:

| case | characters | lines |
| --- | --- | --- |
| `locator("li")` registered twice | 364 | 19 |
| the existing record has a path reference, a filter, an `nth` and a description | 579 | 32 |
| the existing record has a `Locator` in `has` | 671 | 33 |
| two `Locator`s (`has`, `hasNot`) | 950 | 41 |
| reuse by path onto an existing path | 662 | 33 |
| a RegExp value | 439 | 23 |

Each took under 2 ms. The analysis's 5.7k characters came from a fake page: P2b shows that a real `Locator` has no
`toJSON` but its `Frame` has one (`{"_type":"Frame","_guid":"frame@…"}`), so `JSON.stringify(locator)` is three
internal fields, `_apiName`, `_frame` and `_selector` (Playwright's internal selector syntax, for example
`b >> internal:has-text="x"i`). `String(locator)` and `util.inspect(locator)` both give
`locator('b').filter({ hasText: 'x' })`. So the size problem does not reproduce with Playwright 1.64; what remains is
internals in the message. The harness pins only the first sentence ([add.spec.ts:97](../test/tests/locatorRegistry/add/add.spec.ts#L97),
[pageObject.test.ts:310-313](../src/pageObject.test.ts#L310-L313)).

P23, the complete message for `add("item").locator("li").filter({ has: page.locator("b") })` followed by
`add("item").locator("li")`; the second call throws at its strategy, so the attempted record has no steps. The published
2.1.0 package and HEAD print the same text (only the frame id differs):

```
A locator schema with the path "item" already exists.
Existing Schema: {
  "existing": {
    "locatorSchemaPath": "item",
    "definition": {
      "type": "locator",
      "selector": "li"
    },
    "steps": [
      {
        "kind": "filter",
        "filter": {
          "has": {
            "_apiName": "Locator",
            "_frame": {
              "_type": "Frame",
              "_guid": "frame@a06e21ad64a8fc871da5a9cb7d574b77"
            },
            "_selector": "b"
          }
        }
      }
    ]
  },
  "attempted": {
    "locatorSchemaPath": "item",
    "definition": {
      "type": "locator",
      "selector": "li"
    },
    "steps": []
  }
}
```

The prototype prints the same message with the `has` value as `"has": "locator('b')"`, everything else unchanged.

### 2.3 `remove()` and the query builder (1.10, third and fourth bullets)

`remove(subPath?)` ([locatorQueryBuilder.ts:326-341](../src/locators/locatorQueryBuilder.ts#L326-L341)) deletes the
sub-path's definition, steps and description from the query and adds a tombstone; without an argument it removes the
terminal. Its type is the query's chain paths, terminal included (P16: `remove("main.list.item")`, `remove()` and, on
a one-segment query, `remove()` all compile). Resolution skips a segment without a definition
([locatorRegistry.ts:479](../src/locators/locatorRegistry.ts#L479)); a removed terminal throws
`No locator schema registered for path "<path>".` ([L481-483](../src/locators/locatorRegistry.ts#L481-L483), and
[locatorQueryBuilder.ts:357](../src/locators/locatorQueryBuilder.ts#L357) for `getLocator`). `ensureSubPath`
([L405-409](../src/locators/locatorQueryBuilder.ts#L405-L409)) admits a tombstone, and `ensureStepTarget`
([L411-417](../src/locators/locatorQueryBuilder.ts#L411-L417)) checks only the any-frame rule, so `filter`
([L155-159](../src/locators/locatorQueryBuilder.ts#L155-L159)) and `nth` ([L216-220](../src/locators/locatorQueryBuilder.ts#L216-L220))
record steps on a removed segment. `applyUpdate` ([L246-251](../src/locators/locatorQueryBuilder.ts#L246-L251))
rehydrates a removed segment from the registered definition and sets its steps to `[]`; `applyReplacement`
([L304-307](../src/locators/locatorQueryBuilder.ts#L304-L307)) sets the steps to `[]` too. Neither touches the
description.

P3, registered: `main` = `locator("main")`, `main.list` = `locator("ul").filter({ hasText: "one" }).describe("the list")`,
`main.list.item` = `locator("li").nth(0).describe("first item")`; the query is `getLocatorSchema("main.list.item")`:

| chain | chain resolved | description | matches |
| --- | --- | --- | --- |
| (none) | `locator('main').locator('ul').filter({ hasText: 'one' }).locator('li').first()` | `first item` | 1 |
| `.update().locator("li")` | the same | `first item` | 1 |
| `.remove().update().locator("li")` | `….locator('li')` | `main.list.item` | 2 |
| `.remove().replace().getByRole("listitem")` | `….getByRole('listitem')` | `main.list.item` | 2 |
| `.remove().describe("d").update().locator("li")` | `….locator('li')` | `d` | 2 |
| `.remove().nth(1).update().locator("li")` | `….locator('li')`: the `nth(1)` wiped | `main.list.item` | 2 |
| `.remove("main.list")` | `locator('main').locator('li').first()` | `first item` | 1 |
| `.remove("main.list").filter("main.list", { hasText: "three" })` | the same: the filter dropped | `first item` | 1 |
| `.remove("main.list").nth("main.list", 5)` | the same: the index dropped | `first item` | 1 |
| `.remove("main.list").filter("main.list", …).update("main.list").locator("ol")` | `locator('main').locator('ol').locator('li').first()`: the new filter wiped, and the registered `hasText: 'one'` gone | `first item` | 1 |
| `.remove().getLocator()`, `.remove().getNestedLocator()` | throws `No locator schema registered for path "main.list.item".` | | |

The registered steps and description of a removed segment cannot be brought back within the query.
[locator-registry.md:766-781](../docs/v3/locator-registry.md#L766-L781) says steps and descriptions survive `update`
and `replace`; [L787-814](../docs/v3/locator-registry.md#L787-L814) says a removed segment can be "repopulated"
without saying what comes back. P5: on a path registered as `getByRole("listitem")`, `remove().update().locator("li")`
throws `update("list.item") cannot change the strategy …`, and the next `getNestedLocator()` resolves
`locator('ul').getByRole('listitem')`: `applyUpdate` restored the segment before the merge threw.

Usage: no `remove(` in the surveyed project; four in the harness
([getLocatorSchema.remove.spec.ts:16](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.remove.spec.ts#L16),
[L29](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.remove.spec.ts#L29),
[getLocatorSchema.clearSteps.spec.ts:102](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.clearSteps.spec.ts#L102),
[add.frameLocator.spec.ts:160](../test/tests/locatorRegistry/add/add.frameLocator.spec.ts#L160)); in the docs,
[locator-registry.md](../docs/v3/locator-registry.md) (L49, L83, L645, L672, L702, L787-814, L962, L994, L1012) and
[overview.md](../docs/v3/overview.md) (L249, L272).

### 2.4 `ensureSubPath` (1.10, fifth bullet)

One message, `"<subPath>" is not a valid sub-path of "<path>".` ([L407](../src/locators/locatorQueryBuilder.ts#L407)),
for two different failures (P3): a path outside the chain (`filter("main", …)` on `a.b.c`) and a segment of the chain
that has no registration (`filter("a.b", …)` on `a.b.c` with `a.b` unregistered, a sparse chain). In TypeScript the
first is a compile error; the second compiles when `a.b` is in the path union. Six harness assertions pin the
sentence, two of them for a segment of the chain that is not registered
([validation.sub-path.spec.ts:12](../test/tests/locatorRegistry/validation/validation.sub-path.spec.ts#L12),
[getLocatorSchema.getNestedLocator.spec.ts:165-167](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.getNestedLocator.spec.ts#L165-L167)),
all with the sentence's final period (`toThrow` matches a substring).

### 2.5 `@step` (1.10, sixth bullet)

[stepDecorator.ts](../src/helpers/stepDecorator.ts) supports stage-3 decorators (`(value, context)`) and legacy ones
(`(target, key, descriptor)`); the wrapper returns `test.step(title, () => original.apply(this, args), options)`
([L52](../src/helpers/stepDecorator.ts#L52)) cast to the original return type.

P8, in the runner:

- Playwright compiles decorators as stage-3 (`context.kind === "method"`), also when the spec's directory has a
  `tsconfig.json` with `experimentalDecorators: true`. A decorator in a `.js` file is a `SyntaxError` (`Support for the
  experimental syntax 'decorators' isn't currently enabled`). Legacy decorators reach `@step` only through code that
  `tsc` compiled beforehand.
- A sync method returns a Promise: `typeof` is `object`, `await` gives the value. For `@step() record(): void` called
  without `await`, the order is `before | after call | body a | after one microtask`: the body runs after the caller's
  next line. `@step() boom(): void { throw … }` inside `try { po.boom() } catch {}` is not caught; the test fails in
  the step `Po.boom`.
- A static method is titled `Function.staticOne`: the title is `this.constructor.name`
  ([L49-51](../src/helpers/stepDecorator.ts#L49-L51)), and in a static method `this` is the class.
- `tsc`-emitted legacy decorators: `@step()` wraps instance and static methods (`Legacy.a`, `Function.s`); a bare
  `@step` wraps an instance method but leaves a static one silently unwrapped (the analysis's
  [L29-30](../src/helpers/stepDecorator.ts#L29-L30) finding: `typeof target === "function"` for a static method, so the
  call falls through to the factory branch and its return value is ignored).

P9, `tsc`: under stage-3, `@step()` and `@step` on a sync method and `@step()` on a static method compile; on a getter,
a field and an `accessor` they are errors (three directives consumed), so the missing `context.kind` check
([L62-65](../src/helpers/stepDecorator.ts#L62-L65)) is reachable only through a cast. Under `experimentalDecorators`,
`@step()` compiles on instance and static methods; bare `@step` is TS1241 on both, so the static fall-through needs a
`@ts-ignore` or precompiled JavaScript.

### 2.6 The logger (1.10, seventh and eighth bullets)

`log` ([playwrightReportLogger.ts:64-77](../src/helpers/playwrightReportLogger.ts#L64-L77)) stores
`` `${message}\n\n${args.join("\n\n")}` `` ([L75](../src/helpers/playwrightReportLogger.ts#L75)); the `log` fixture
([base.fixtures.ts](../src/fixture/base.fixtures.ts)) calls `attachLogsToTest`
([L162-195](../src/helpers/playwrightReportLogger.ts#L162-L195)) when the test ends, which sorts the entries by
timestamp ([L163](../src/helpers/playwrightReportLogger.ts#L163)), names each attachment
`HH:MM:SS DD.MM.YYYY - LEVEL : [prefix]` in `nb-NO` and the machine's time zone
([L166-175](../src/helpers/playwrightReportLogger.ts#L166-L175)), and, when the message parses as JSON, attaches it as
`application/json` re-formatted with `JSON.stringify(parsed, null, 2)`, otherwise as `text/plain`
([L179-188](../src/helpers/playwrightReportLogger.ts#L179-L188)). One attachment per entry, only on the test that
logged it: the fixture is test-scoped with a fresh entry list per test.

P10 and P20, the attachment bodies:

| call | body today |
| --- | --- |
| `log.info("message only")` | `message only\n\n` |
| `log.info("plain text\nsecond line\n    indented\ttab")` | the same plus `\n\n` |
| `log.info("with object", { a: 1, nested: { b: [1, 2] } })` | `with object\n\n[object Object]` |
| `log.info("with array and number", [1, 2], 3)` | `with array and number\n\n1,2\n\n3` |
| `log.info("with error", new Error("boom"))` | `with error\n\nError: boom` (no stack) |
| `log.info("with locator", locator)` | `with locator\n\nlocator('b').filter({ hasText: 'x' })` |
| `log.info('{"compact":true,"list":[1,2]}')` | `application/json`, re-formatted over seven lines |
| `log.info("42")`, `log.info("true")` | `application/json` |
| `log.info("with undefined and null", undefined, null)` | `with undefined and null\n\n\n\n` |
| `log.info("with circular", circular)` | `with circular\n\n[object Object]` |

P20, the HTML report, read back in chromium: each entry is a collapsed row in the test's Attachments section, titled
with its name; expanded, a `text/plain` body and an `application/json` body look the same, plain text in a
`white-space: pre-wrap` block, so newlines, indentation and tabs show as written. A compact JSON body attached as
`application/json` stays compact: the report does not format JSON; the formatting in today's attachments is the
logger's.

P20, locales: the `locale` fixture is `en-US` when the config sets none (Playwright's default) and follows
`test.use({ locale })`; `testInfo.project.use.locale` is `undefined` unless the config sets it and ignores
`test.use`; Node's default here is `en-US` (from `LANG`) in `Europe/Oslo`. One instant in five locales:
`08:19:55 15.10.2026` (`nb-NO`, `de-DE` gives the same), `08:19:55 AM 10/15/2026` (`en-US`, and the machine),
`08:19:55 15/10/2026` (`en-GB`). P22: after `page.clock.install({ time: 2001-02-03 })` and
`page.clock.setFixedTime(1999-12-31)` the page's `Date` reads 1999, Node's and both log timestamps read the real time:
the logger runs in the test process, which the clock API does not touch. Entries are pushed in call order, so the sort
only reorders them if the system clock steps backwards during the test.

The harness has no logger test and no `log.<level>(` call.

### 2.7 Call sites (decision 7.16 of plan 1.7)

Two helpers capture where a POMWright API was called, so that an error raised later (in a microtask or a listener)
points at the consumer's code: `captureCallSite` and `atSite` for `seed`
([sessionStorageSeed.ts:168-182](../src/helpers/sessionStorageSeed.ts#L168-L182), called at
[sessionStorage.ts:299](../src/helpers/sessionStorage.ts#L299)), which formats the stack eagerly into a string, and
`atConstructionSite` for `PageObject` ([pageObject.ts:51-64](../src/pageObject.ts#L51-L64), site captured at
[L156](../src/pageObject.ts#L156)), which keeps an `Error` and formats on failure. Both drop frames by file name:
`/[\\/]sessionStorage(Seed)?\.(ts|js|mjs|cjs)/` and `/[\\/]pageObject\.(ts|js|mjs|cjs)/`, each plus POMWright's
bundle path.

P7, a broken page object (a `has` typo) and a never-applied `seed`, each defined in three consumer files:

| defined in | page object: code frame | `seed`: code frame |
| --- | --- | --- |
| `helpers.ts` | `helpers.ts:6`, the `super(...)` line | `helpers.ts:13`, the `seed` line |
| `pageObject.ts` | `probe.spec.ts:12`: the consumer's frame is dropped | `pageObject.ts:13` |
| `sessionStorage.ts` | `sessionStorage.ts:6` | `probe.spec.ts:26`: dropped |

So a consumer file that shares a name with one of POMWright's source files loses its frame, and a single helper with
the union of both patterns would drop more. In the published package all of POMWright is one file,
`pomwright/dist/index.js`, which the bundle pattern already matches; the name patterns matter only for the source-level
unit tests and specs, and they are what misfires for consumers.

### 2.8 Section 2: unreachable branches (P11)

P11 planted a marker that throws in each suspect branch of the `reach` clone (through a `void` helper, so TypeScript's
narrowing is unchanged) and ran the 276 unit tests and the 374 chromium tests against it:

| id | where | why it looks unreachable | reached? |
| --- | --- | --- | --- |
| D1 | `if (!existing)` in `register`, [locatorRegistry.ts:212-214](../src/locators/locatorRegistry.ts#L212-L214) | follows `schemas.has(path)` | no |
| D2 | `return undefined as never` in `getIfExists`, [L255](../src/locators/locatorRegistry.ts#L255) | reachable; the cast is needless | (not a branch) |
| D3 | the tombstone half of `tombstones?.has(path) \|\| !definitions.has(path)`, [L481](../src/locators/locatorRegistry.ts#L481) | definitions and tombstones are disjoint | no (marker: both true) |
| D4 | the tombstone branch in the loop, [L501-506](../src/locators/locatorRegistry.ts#L501-L506) | `registeredChain` is filtered by `definitions.has`, [L479](../src/locators/locatorRegistry.ts#L479) | no |
| D5 | `if (!definition)`, [L508-510](../src/locators/locatorRegistry.ts#L508-L510) | the same filter | no |
| D6 | the null-locator checks, [L314-316](../src/locators/locatorRegistry.ts#L314-L316), [locatorQueryBuilder.ts:380-382](../src/locators/locatorQueryBuilder.ts#L380-L382), [L398-401](../src/locators/locatorQueryBuilder.ts#L398-L401), and the `else` of [locatorRegistry.ts:562](../src/locators/locatorRegistry.ts#L562) | the terminal is always in the chain and either sets the locator or throws (any-frame); not in the analysis, the same kind | no (four markers) |
| D7 | `Array.isArray(reuse)`, [L175-178](../src/locators/locatorRegistry.ts#L175-L178) | the analysis: only via `any` | **yes**: [add.reuseExisting.spec.ts:44-62](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L44-L62) forces the tuple on purpose and pins the message |
| D8 | `if (resolvedFilter)` and the empty-list early return around the single-element call, [L538-542](../src/locators/locatorRegistry.ts#L538-L542), [L330-332](../src/locators/locatorRegistry.ts#L330-L332) | the helper takes an array to resolve one filter | no (two markers) |
| D9 | `if (!current)` in `applyUpdate`, [locatorQueryBuilder.ts:253-256](../src/locators/locatorQueryBuilder.ts#L253-L256) | `ensureSubPath` admits only a definition or a tombstone, and the tombstone branch sets the definition; not in the analysis | no |

All 276 unit tests passed; 373 chromium tests passed and the one D7 spec failed with its marker. P4 adds what the
branches around them must keep: `getLocator("list..item")`, `getLocator("list.")` and `getLocator("")` from JavaScript
throw the path-format errors, because `getLocator` reaches `expandSchemaPath` through the query builder's constructor;
`add("x", { reuse })` with `{}`, `42` or `null` throws a `TypeError`, with `"nope"` `No locator schema registered for
path "nope".`

### 2.9 `getLocator` and cloning (section 2)

`getLocator(path)` ([locatorRegistry.ts:448-450](../src/locators/locatorRegistry.ts#L448-L450)) is
`getLocatorSchema(path).getLocator()`: the query builder's constructor clones every registered segment of the chain
([locatorQueryBuilder.ts:58-79](../src/locators/locatorQueryBuilder.ts#L58-L79)) from records that `getIfExists` has
already cloned ([locatorRegistry.ts:250-264](../src/locators/locatorRegistry.ts#L250-L264)), and its `getLocator` then
clones the terminal's steps once more ([L360-371](../src/locators/locatorQueryBuilder.ts#L360-L371)). The analysis's
third clone, the per-type cache, went with plan 1.6-1.8. A clone today is shallow below the step: `normalizeSteps`
([utils.ts:178-180](../src/locators/utils.ts#L178-L180)) copies each step but not its filter object (2.10).

P12, a five-segment chain like the surveyed project's (median registered depth 4 to 5, P14): `app`, `app.main`,
`app.main.orders` with a filter, `app.main.orders.table` with a `has` path reference, and
`app.main.orders.table.row` with a filter, `nth(0)` and a description; counts from counters injected into a copy of
each `dist`, times the median of seven rounds of 20,000 calls after a warm-up, two runs each:

| operation | clones, HEAD (definitions, step lists) | clones, prototype | µs per call, HEAD | prototype |
| --- | --- | --- | --- | --- |
| `getNestedLocator(path)` | 11, 12 | 6, 6 | 4.51, 4.62 | 4.37, 4.61 |
| `getLocator(path)` | 10, 11 | 1, 1 | 2.94, 2.92 | 1.52, 1.64 |
| `getLocatorSchema(path).filter(…).getNestedLocator()` | 11, 12 | 6, 6 | 4.86, 4.82 | 4.60, 4.90 |
| `verify()` (six paths) | 1, 8 | 7, 7 | 6.05, 6.54 | 6.39, 6.42 |

The prototype's sixth clone in a nested resolution is the `has` path reference, resolved from a clone of its record.
Clones are not what a nested resolution spends its time on (Playwright's locator construction is); the measurable gain
is `getLocator`, which stops building a query builder. Reading the terminal record without a clone measured 1.42 to
1.49 µs instead of 1.58 to 1.60: the clone costs about 0.1 µs, so every resolution keeps one.

### 2.10 Caller objects in the registry

The registry stores what the builders give it: `normalizeRecord` ([locatorRegistry.ts:86-93](../src/locators/locatorRegistry.ts#L86-L93))
keeps `record.definition` as it is, and the registration builder builds that definition around the caller's options
object (for example [locatorRegistrationBuilder.ts:136-145](../src/locators/locatorRegistrationBuilder.ts#L136-L145));
`normalizeSteps` copies a step but keeps its filter object, which is the caller's
([L442-448](../src/locators/locatorRegistrationBuilder.ts#L442-L448), [reusableLocatorBuilder.ts:44](../src/locators/reusableLocatorBuilder.ts#L44),
[locatorQueryBuilder.ts:158](../src/locators/locatorQueryBuilder.ts#L158)). P18, each object changed after the call
that took it:

| changed after the call | effect today |
| --- | --- |
| the options of `add("btn").getByRole("button", opts)` | the registered locator becomes `getByRole('button', { name: 'Other' })` |
| the filter of `add("row").locator("li").filter(f)` | the registered locator becomes `filter({ hasText: 'Other' })` |
| `seed.steps[0].filter` after `add("seeded", { reuse: seed })` | the registered locator changes |
| `seed.definition.options` after `add(…, { reuse: seed })` | no effect: reuse clones the definition |
| the filter of `getLocatorSchema(p).filter(f)` | that query changes; the registry does not |
| the options of `update().getByRole(opts)` | no effect: the merge copies |

No POMWright method changes a registered record (clone-on-read holds, [add.get.clone.spec.ts](../test/tests/locatorRegistry/add/add.get.clone.spec.ts)),
but the caller's objects stay live in it. P19, what a copy has to cover: options and filters are one level of plain
object whose values are strings, numbers, booleans, RegExps and `Locator`s. `structuredClone` of options holding a
`Locator` throws (the `Locator` carries functions and its frame); a RegExp's `source` and `flags` are read-only, and
changing its `lastIndex` after `add` changed neither the resolved locator nor the match count (Playwright serialises
the pattern when it builds the locator); a `Locator`'s public API never changes it. A shallow copy of each options
and filter object covers everything a caller can change.

### 2.11 `nth` and `describe` arguments

P16, `tsc`: `nth(null)`, `nth(undefined)`, `nth(maybe)` with `maybe: number | undefined`, and `describe(null)` are
compile errors today. At runtime nothing checks them (P4): `nth(null)` and `nth(undefined)` record a step that
`applyIndexSelector` ([utils.ts:202-213](../src/locators/utils.ts#L202-L213)) skips, so the locator matches every
element, while Playwright's own `locator.nth(null)` and `nth(undefined)` match nothing (P6); `nth("2")` and `nth(1.5)`
pass through as in Playwright. P17, on a path registered with `describe("hello")`: the query's `describe("")` gives no
description (Playwright then shows the chain), and `describe("").describe(null)` gives the path, `list.item`, not
`hello`; a query starts from the registered description, and a new `getLocatorSchema()` call starts from it again.
Playwright's own `locator.describe(null)` gives no description and `describe(undefined)` renders
`li >> internal:describe=undefined`.

### 2.12 Harness and survey

- Harness (P14): 9 `@step` methods, all `async`
  ([testPage.page.ts](../test/page-object-models/testApp/pages/testPage.page.ts)), exercised by
  [step.spec.ts](../test/tests/step/step.spec.ts), which checks return values only ("verified manually by checking
  the test report"); no `log.<level>(` call and no logger test; `remove(` 4 times (2.3); `getLocator(` 131 times.
  `pnpm typecheck` and the chromium suite pass on HEAD (374 tests, plan 1.9's execution note; P11's run).
- P14, one 2.1.0 consumer project (124 TypeScript files, the project of the earlier surveys): 60 `@step` decorators,
  all written `@step(…)`, all on `async` methods, none static, none on a getter; no `experimentalDecorators`; 12 logger
  calls (9 with a message only, 3 with extra arguments), 5 of them pass `JSON.stringify(…)` output, the callers'
  workaround for `[object Object]`; `PlaywrightReportLogger` 60 times, `getNewChildLogger` 5, `attachLogsToTest` once
  (its own fixture); no `remove(`; no `has:`/`hasNot:`; 100 `getLocatorSchema(`, 617 `getNestedLocator(`, 6
  `getLocator(`; no file named `pageObject.ts`, `sessionStorage.ts` or `sessionStorageSeed.ts`; registered path depth
  1 to 9, 205 of depth 1 and 146 of depth 5 the largest groups. Its own log fixture calls `attachLogsToTest(testInfo)`
  without a locale, so its timestamps follow the machine's locale under 3.0.0 unless it passes one (3.9); nothing else
  in it needs an edit.

### 2.13 What is sound

Clone-on-read for every POMWright method (the registry never shares state with a query:
[add.get.clone.spec.ts](../test/tests/locatorRegistry/add/add.get.clone.spec.ts) and the reuse clone test pass on the
prototype); cycle detection and its messages; the any-frame rules; the path-format validation; the tested reuse-tuple
message; `@step`'s title and options handling for instance methods; the logger's levels, child loggers, test scoping
and one attachment per entry; the construction-site and `seed`-site technique itself (a stack rewritten once, the
original as `cause` for page objects).

---

## 3. Design

### 3.1 `isLocatorInstance` (1.10, first bullet)

| option | arrays and `filter`-only fakes | `FrameLocator`, `Page` | cost |
| --- | --- | --- | --- |
| **A. require `filter`, `nth` and `locator` to be functions** (decided, 7.1) | `Unsupported filter reference …` (P13) | unchanged | three conditions |
| B. exclude arrays only (`!Array.isArray`) | arrays as A; a `filter`-only fake still reaches Playwright | unchanged | one condition |
| C. leave it | Playwright's frame message in `verify()` | unchanged | none |

A follows the analysis's suggestion and still accepts a `Locator` from any Playwright copy (Playwright then reports a
foreign frame itself). A Playwright `Locator` cannot be checked with `instanceof`: the class is not exported.

### 3.2 The duplicate-registration message (1.10, second bullet)

| option | message | cost |
| --- | --- | --- |
| **A. `stringifyForLog` renders a `Locator` with `String()`; D1 goes** (decided, 7.2) | the same layout, `"has": "locator('b')"`; 671 to 473 characters and 950 to 539 in P2's cases (P13) | two lines |
| B. no details: `A locator schema with the path "x" already exists.` | one line; the reader no longer sees which definition was first | a deletion |
| C. render both records as DSL calls (`locator("li").filter({ has: "list" }).nth(0)`) | the shortest readable form | a renderer per strategy; belongs with the strategy table (plan 9) |

### 3.3 `skip` and `unskip` replace `remove` (1.10, third and fourth bullets; decided)

A skipped segment is a flag on the query, not a deletion. `skip(subPath)` adds the sub-path to the query's set of
skipped segments; resolution leaves a skipped segment out of the chain exactly as it leaves out an unregistered one;
`unskip(subPath)` removes it from the set. The segment's definition, steps and description are never touched, so
unskipping restores the state it had when it was skipped: the registered one, or the one `update`, `replace`,
`filter`, `nth` or `clearSteps` gave it before. `getLocator()` is terminal-only, so skipped ancestors do not affect it.

```ts
/** Leaves an ancestor out of the chain when this query resolves, as if it were not registered. … */
skip<SubPath extends SkippablePaths<Paths, Path>>(subPath: SubPath): LocatorQueryBuilder<Paths, Path>;
/** Puts a segment left out with `skip` back into the chain, exactly as it was. */
unskip<SubPath extends SkippablePaths<Paths, Path>>(subPath: SubPath): LocatorQueryBuilder<Paths, Path>;

type SkippablePaths<Paths, Path> = Exclude<LocatorChainPaths<RegistryPath<Paths>, Path>, Path>; // the ancestors
```

Names considered in review: `tombstone`/`restore` (describes the mechanism, not the effect), `exclude`/`include`
(`include` reads as adding something), `tombstone(subPath, false)` (a boolean argument is unclear at the call). The
chosen pair says what happens to the chain. `remove` is not kept as an alias: 3.0.0 is a major, the survey has no
call, and its meaning (a deletion) is the one this design removes. Usage of the chain paths type, `SkippablePaths`, is
internal; the public builder type `LocatorQueryBuilder` carries the two methods.

### 3.4 What a skipped segment accepts, and the terminal (decided)

| call | on a skipped segment | why |
| --- | --- | --- |
| `update(sub)`, `replace(sub)`, `filter(sub, …)`, `nth(sub, …)`, `clearSteps(sub)` | throws `<method>() cannot apply to "<sub>": it is skipped in this query; call unskip("<sub>") first.` | a change to a hidden segment has no effect until `unskip`, and is lost if `unskip` never comes |
| `skip(sub)` again | throws `skip() cannot skip "<sub>": it is already skipped in this query.` | the second call names the wrong path or repeats the first |
| `unskip(sub)` when it is not skipped | throws `unskip() cannot unskip "<sub>": it is not skipped in this query.` | the same |
| `describe(…)` | n/a: it applies to the terminal, which cannot be skipped | |

The terminal path cannot be skipped. A query resolves its terminal, so a skipped terminal could only fail at
resolution or be unskipped again. `SkippablePaths` excludes it (P13: `skip("main.list.item")` on a `main.list.item`
query is TS2345, `skip()` is a compile error, a one-segment query accepts no argument), and from JavaScript
`skip(<terminal>)` throws `skip() cannot skip "<path>": it is the path this query resolves; skip one of its ancestors.`

Consequences: `update` and `replace` no longer deal with tombstones at all (the rehydration in `applyUpdate` and
`applyReplacement` goes), so P5's state change after a throwing `update()` cannot happen; the removed-terminal message
of the first draft is not needed (a terminal is never missing from a query); `ensureSubPath` admits only registered
segments of the chain and returns their definition. P13: on the prototype the chromium suite passes except the four
tests that call `remove(` (2.3), which 4.2 converts.

### 3.5 `describe` and `nth` arguments (decided; answers plan 1.9's `nth(null)` question)

The default description (the path when none is set) stays as it is; making it an option is analysis item 3.3, plan 9.

- `describe` takes a string, on all four builders (`add`, seeded `add`, `createReusable`, the query). `describe("")`
  removes the description (Playwright's own meaning, P17) and is the documented way to do so; there is no
  `describe(null)`: it would only give back the path label, which `describe("<path>")` gives as well, and never the
  registered description. From JavaScript `null`, `undefined` or any non-string throws
  `describe requires a string for "<path>"; pass "" to remove the description.` (seeds:
  `createReusable.describe requires a string; …`).
- `nth` mirrors Playwright: `"first"` and `"last"` are POMWright's own and become `first()` and `last()`; every other
  value goes to Playwright's `nth` as given. `applyIndexSelector` ([utils.ts:202-213](../src/locators/utils.ts#L202-L213))
  loses its `null`/`undefined` branch, which is what drops the step today. The types are unchanged (`number | "first" |
  "last"`), so TypeScript rejects `nth(undefined)` and `nth("2")` where Playwright's `nth(index: number)` does (P24:
  TS2345 in both, naming `IndexSelector` and `number`). From JavaScript the result is Playwright's (P24): `nth(null)`
  and `nth(undefined)` match nothing, `nth("2")` is `nth(2)`, `nth(-1)` is `last()`. A bad index is no longer
  silent, but it fails at the first action after its timeout rather than at the call, and `verify()` cannot see it.
  Rejected in review: a POMWright check that throws at the call (faster to fail, but code of its own that would have
  to follow any change to Playwright's `nth`, for a case TypeScript already rejects). An optional index is a
  conditional call: query methods change the query and return it, so `const query = getLocatorSchema(p); if (i !==
  undefined) query.nth(i);` composes; `nth(undefined)` means "match nothing" in Playwright, not "no index".

The `describe` check follows `assertPrimaryValue` ([utils.ts:149-161](../src/locators/utils.ts#L149-L161)) and sits at
the call, before anything is recorded.

### 3.6 Copies at the boundary (decided)

Every DSL call that keeps an object the caller passed in keeps a copy, one level deep (2.10, P19):

- the registry copies on write: `register` and `replace` store `cloneLocatorStrategyDefinition(record.definition)`
  (its options copied) and `normalizeSteps(record.steps)`, and `normalizeSteps` copies each filter object as well as
  the step; that covers `add`, seeded `add`, and reuse by path or seed;
- the registration builder, the seed and the query copy a filter at `filter()`, and the seed copies its definition at
  creation, so the copy happens when the call is made, not when the chain is persisted;
- every read clones (3.12), so a copy never shares an object with the registry or another copy.

P13: all six cases of P18 leave the registered and the queried locator unchanged, and the unit and harness suites
pass. A RegExp and a `Locator` are kept by reference: their observable content cannot change (P19).

> **Amended 2026-10-19, after the documentation review.** P19 holds for a `Locator` but not for a RegExp:
> `RegExp.prototype.compile()` rewrites its source and flags in place, and after `add` it changed the registered
> locator (a first argument, an option, a filter value, and a seed through `seed.definition`). A plain registration
> also kept the caller's options object, which a later `filter`, `nth` or `describe` on the same registration
> registered again. Both are fixed without a plan of their own: `copyValue` copies every RegExp leaf inside
> `cloneLocatorStrategyDefinition` and `copyFilter`, and the registration builder keeps a copy of its definition.
> DECISIONS.md carries the amended row; unit tests in `utils.test.ts` and `locatorRegistry.test.ts` and the harness
> spec `add.get.clone.spec.ts` pin it.

### 3.7 Messages (1.10, fifth bullet)

| case | today | **decided** (7.6) | alternative |
| --- | --- | --- | --- |
| a path outside the chain | `"x" is not a valid sub-path of "a.b.c".` | unchanged | `"x" is not a segment of "a.b.c".` |
| a segment of the chain with no registration | the same sentence | the same sentence, then (after a space) `It is a segment of that path, but no locator schema is registered for it.` | `No locator schema registered for "a.b", a sub-path of "a.b.c".` |

(decided, 7.6)

Keeping the first sentence where it is true keeps all six sub-path assertions green (P13: a variant with new first
sentences failed two of them). The skip messages are in 3.4.

### 3.8 The logger's output (1.10, seventh bullet; decided)

The message and every string argument are kept exactly as given; any other argument is printed the way `console.log`
prints it, through `util.inspect` with its defaults; the parts are joined with a blank line, as today, and a message
without arguments is attached alone. The attachment body is the stored message unchanged; its content type is
`application/json` when the message alone is a JSON object or array, `text/plain` otherwise.

P21, why `console.log`'s form and not a full stringification:

| approach | nested plain data | `Error`, `Map`, `Set`, RegExp, `undefined` inside | a `Locator` inside | a `Page`, or a page object | circular |
| --- | --- | --- | --- | --- | --- |
| **`util.inspect` with `console.log`'s defaults** | `{ order: { id: 7, lines: [ [Object] ] } }` (depth 2) | shown properly | `locator('li')` | about 36k characters | `[Circular *1]` |
| `util.inspect` without a depth limit | everything | shown properly | `locator('li')` | about 134 MB | shown |
| `JSON.stringify(x, null, 2)` | everything | `{}` for `Error`, `Map`, `Set`, RegExp; `undefined` dropped | `_frame`, `_guid` internals | small (`Page` has `toJSON`) | throws |

No single automatic form is complete and safe, and any mix is a rule users would have to learn. `console.log`'s is the
one they know; for nested data the caller passes `JSON.stringify(data, null, 2)`, which the surveyed project already
does and which is attached exactly as written. `logging.md` shows both. P13: on the prototype a multi-line message is
attached as written, `'{"compact":true,"list":[1,2]}'` stays compact as `application/json`, `"42"` is `text/plain`,
an object prints as `{ id: 7, lines: [ { sku: 'A', qty: [Object] } ] }`, and the stringified form arrives verbatim.
`util.format` is not used: it would interpret `%s`, `%d` and `%o` in messages. `undefined` and `null` print as
`undefined` and `null` instead of nothing. Rejected in review: a pretty-print option. It would have to choose one of
the forms of the table above, with its pitfalls, for every argument of every call; `JSON.stringify(data, null, 2)` per
call already says exactly what the attachment shows.

### 3.9 The logger's timestamps and attachments (1.10, eighth bullet; decided)

- Timestamps use Playwright's `locale` and `timezoneId` fixtures: the `log` fixture passes them to
  `attachLogsToTest(testInfo, { locale, timeZone })`, a new optional second parameter. With no config the locale is
  Playwright's default, `en-US`, and the time zone the machine's; `use: { locale: "nb-NO" }` gives the 2.x names
  (P13: `08:19:55 AM 10/15/2026` by default, `10:45:51 15.10.2026` under `test.use({ locale: "nb-NO", timezoneId:
  "UTC" })`). A custom fixture that calls `attachLogsToTest(testInfo)` without the second argument gets the machine's
  locale; `logging.md` shows how to pass the fixtures. Rejected: the machine's locale for the fixture (reports differ
  between machines), ISO 8601 (a new format nobody asked for).
- One attachment per entry, on the test that logged it, as today: each entry stays a titled row in the report that
  can be scanned without opening it. Rejected: one attachment per test.
- No sort: the entries are attached in call order. Playwright's clock API does not affect the timestamps (P22); a test
  that fakes Node's `Date` itself gets fake timestamps, which `logging.md` mentions.

### 3.10 One call-site helper (plan 1.7, decision 7.16; decided)

**What it does, in short.** Two errors surface after the consumer's line has finished running: a page object's
registry check, which runs in a microtask right after construction (plan 1.7), and a `seed` that was never applied,
reported when the page closes (plan 1.5). Their own stack would point into POMWright or at nothing useful. So at the
call (`new X(page)`, `seed(…)`) POMWright captures where it was called from, and when the error is raised it rewrites
the error's stack to that place, so the report's code frame is the consumer's line. Consumers never call the helper;
what they see is the right line.

**What changes.** Two copies of this logic become one module, and the bug of 2.7 goes: today the helpers drop stack
lines by file name, including the consumer's own when the file is called `pageObject.ts` or `sessionStorage.ts`.

| option | consumer frame in `pageObject.ts`/`sessionStorage.ts` | source-level tests | cost |
| --- | --- | --- | --- |
| **A. one module, `src/helpers/callSite.ts`: `captureCallSite(boundary)` returns an `Error` whose stack V8 starts below `boundary` (`Error.captureStackTrace`); `atCallSite(error, site)` rewrites the stack, dropping only frames in POMWright's bundle** (decided, 7.15) | kept (P13: all six cases of P7 point at the consumer's line) | the boundary removes POMWright's own frames, whatever the file is named | `PageObject` passes `PageObject`, `seed` passes `SessionStorage.prototype.seed` |
| B. one module that keeps the file-name filters (the union of both patterns) | dropped for both names, in both helpers | as today | worse than today |
| C. two helpers, each with its name pattern | dropped (P7) | as today | today |

A in shape:

```ts
/** POMWright's published bundle: its frames never point at the consumer's code. */
const BUNDLE_FRAME = /[\\/]pomwright[\\/]dist[\\/]index\.(js|mjs|cjs)/;

export const captureCallSite = (boundary: Boundary): Error => {
	const site = new Error();
	Error.captureStackTrace(site, boundary); // V8 leaves out boundary's frame and everything above it
	return site;                             // formatted only when used
};

export const atCallSite = (error: Error, site: Error): Error => { … }; // name: message + the site's frames
```

`Boundary` is the second parameter type of `Error.captureStackTrace` (biome rejects `Function`). The `seed` site
becomes an `Error` formatted on failure, like the page object's (plan 1.7 measured the capture as cheap). Node's
`Error.captureStackTrace` is V8's; Playwright's test runner is Node-only.

### 3.11 `@step` (1.10, sixth bullet)

A decorator cannot change the declared type of the method it decorates, so a wrapper that always returns a Promise can
only be honest by accepting methods that already return one.

| option | sync method | cost to consumers |
| --- | --- | --- |
| **A. both decorator signatures accept only methods returning `Promise<T>`** (decided, 7.11) | TS1241 `Type 'number' is not assignable to type 'Promise<unknown>'` (P13), in both modes | none in the survey (60 of 60 async) or the harness (9 of 9); a sync method becomes `async` |
| B. document that `@step` makes a method async | compiles; the type lies; deferred body, uncatchable throw (P8) | none now, bugs later |
| C. run sync methods synchronously, outside `test.step` | no step in the report | a decorator that silently does nothing for some methods |

A method declared `(): Promise<T>` without `async` compiles (P13). TypeScript prints the reason in its own words
unless a signature carries it, so each decorator form gets a last overload whose parameter type is the message,
the technique `LocatorSchemaPathFormat` uses for paths:

```ts
type StepRequiresPromise = "@step decorates methods that return a Promise: make the method async";
// last overloads: stage-3 (value: StepRequiresPromise, context) and legacy (target, key, descriptor: StepRequiresPromise)
```

P25: under stage-3 and under `experimentalDecorators`, `@step()` and bare `@step` on a sync method report
`Argument of type '() => number' is not assignable to parameter of type '"@step decorates methods that return a
Promise: make the method async"'` (legacy: `TypedPropertyDescriptor<() => number>`) after TS1241; `async`, static async
and Promise-returning methods compile. The implementation signature admits the message tuple and the factory is cast
once; nothing changes at runtime. No runtime check is possible: whether a method returns a Promise is known only when
it is called, and a non-`async` method may return one. JavaScript callers keep today's behaviour.

The runtime branches (decided, 7.12):

- titles: the owner is `this` when `this` is a function (a static method), otherwise `this.constructor`, so a static
  method is `AccountPage.create` in both modes (P13);
- stage-3: `context.kind !== "method"` throws the existing `@step decorator can only be applied to methods.`, as the
  legacy branch already does for a non-function descriptor; reachable only through a cast (P9);
- legacy: a call is recognised by its shape (three arguments, a string or symbol key), the target an object
  (prototype) or a function (class), so a bare `@step` on a static method is wrapped (P13).

### 3.12 Section 2: dead code, `getLocator` and cloning

Dead code (decided, 7.16): D1 goes (`register` reads the record once); D2's cast goes and `get` is `getIfExists` plus
the throw; D3, D4 and D5 go with the tombstones (3.3), and `buildLocatorChain` takes the terminal definition as an
argument and resolves the registered ancestors that are not skipped, in chain order, before it, so no lookup can miss
and it returns a `Locator`, not `Locator | null`, which removes D6; `resolveFiltersForTarget([filter])` becomes
`resolveFilter(filter)` returning one filter (D8), and a filter without `has`/`hasNot`, or a non-object from
JavaScript, passes through untouched as today; D9 goes with `ensureSubPath` returning the definition. The debug-step
record is built exactly as today (plan 9). D7 stays: it is reachable by design and a spec pins its message (2.8); the
analysis bullet is ticked *Fix* for L498 and *Skip* for L180-183 with that reason. Generalising D7 to every value that
is not a seed (`{}`, `42`, `null` throw a `TypeError` today, P4) is not in the analysis and not proposed.

`getLocator` (decided, 7.17): it validates the path (keeping P4's messages), takes a clone of the record (`get`) and
resolves it terminal-only, through one private `resolveRecord(path, record, context?)` that `verify()` and the
`has`-path resolution share; cycle messages are unchanged (P13).

Cloning (decided, 7.18): every read is a clone. A query takes ownership of the clones `getIfExists` returns
instead of cloning them again (one clone per segment instead of two); `getLocator`, `verify()` and the `has`-path
resolution each resolve a clone; the merge clone in `applyUpdate`/`applyReplacement` and the registration copies stay.
P12 records the result: fewer clones on every query and on `getLocator`, more in `verify()` (every record once), no
measurable time cost anywhere, `getLocator` about twice as fast.

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. [utils.ts](../src/locators/utils.ts): `isLocatorInstance` per 3.1 (L429-431) with a doc comment; `stringifyForLog`
   renders a `Locator` with `String()` (L182-200); `copyFilter`, and `normalizeSteps` copying filter objects (L178-180);
   `assertDescription` beside `assertPrimaryValue` (L149-176); `applyIndexSelector` without its `null`/`undefined`
   branch (L202-213), and `buildLocatorChain` passes the recorded index to it as recorded.
2. [locatorRegistry.ts](../src/locators/locatorRegistry.ts): `normalizeRecord` clones the definition (L86-93);
   `register` (L205-222), `get`/`getIfExists` (L235-264), `resolveFilter` (L323-365), `resolveRecord`,
   `getLocatorWithContext` (L294-321), `verify` (L406-436), `getLocator` (L448-450) and `buildLocatorChain` (L466-567,
   the terminal as a parameter, a `skipped` set instead of `tombstones`) per 3.12.
3. [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts): `remove` (L313-341) replaced by `skip` and
   `unskip` with `SkippablePaths` and the doc comments of 3.3; `tombstones` replaced by `skipped` (L52); the chain kept
   as a set for the messages; the constructor without the second clone (L58-79); `ensureSubPath` returns the
   definition and appends the reason (L405-409); `ensureNotSkipped` called by `update`, `replace`, `filter`, `nth` and
   `clearSteps` (L112, L155, L184, L216, L291); `filter` copies its filter; `describe` checks its argument
   (L235-239); `applyUpdate` and `applyReplacement` without the rehydration (L241-260, L299-311);
   `getLocator` and `getNestedLocator` without null checks and without `resolve()` (L353-427).
4. [locatorRegistrationBuilder.ts](../src/locators/locatorRegistrationBuilder.ts): `applyFilter` copies, `applyIndex`
   is unchanged (L442-454); one `applyDescription` with the check, used by `describe` and the post-definition view
   (L111-116, L526-530). [reusableLocatorBuilder.ts](../src/locators/reusableLocatorBuilder.ts): the constructor clones
   the definition, `filter` copies, `describe` checks (L32-56).
5. New `src/helpers/callSite.ts` per 3.10; [sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts) drops
   `INTERNAL_FRAME`, `captureCallSite` and `atSite` (L168-182) and uses `atCallSite`; `PendingSeed.site` and
   `SeedRegistry.add` take an `Error` (L40, L265); [sessionStorage.ts](../src/helpers/sessionStorage.ts) captures with
   `captureCallSite(SessionStorage.prototype.seed)` (L15, L299); [pageObject.ts](../src/pageObject.ts) drops
   `INTERNAL_FRAME` and `atConstructionSite` (L50-64) and uses `captureCallSite(PageObject)` and `atCallSite`
   (L156, L164).
6. [stepDecorator.ts](../src/helpers/stepDecorator.ts) per 3.11: an `AsyncMethod` type for the factory interface and
   the stage-3 overload (L17-27, L90-93), and the `StepRequiresPromise` overloads last in both (the implementation
   signature admits the message tuple, the factory is cast once); `isMethodDecoratorArgs` by shape (L29-30); the owner for titles (L49-51); the
   kind check (L62-65); the doc comment says methods must return a Promise and why.
7. [playwrightReportLogger.ts](../src/helpers/playwrightReportLogger.ts) per 3.8 and 3.9: `import { inspect } from
   "node:util"`; the stored message (L75); `attachLogsToTest(testInfo, format?)` without the sort, with the locale and
   time zone, the body as stored and the content-type check (L162-195); the doc comments of the level methods and of
   `attachLogsToTest`. [base.fixtures.ts](../src/fixture/base.fixtures.ts): the fixture takes `locale` and
   `timezoneId` and passes them; its `biome-ignore` for the empty pattern goes with the pattern.

`LocatorQueryBuilder` gains `skip` and `unskip` and loses `remove`; `step`'s signatures change (7.11);
`attachLogsToTest` gains an optional parameter. `index.ts`, the exported names and the ESM entry are unchanged (seven
runtime names).

### 4.2 Harness (`test/`)

- The four `remove(` calls (2.3). P13: on the prototype these are the only existing tests that fail.
  - [getLocatorSchema.remove.spec.ts](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.remove.spec.ts)
    is renamed `getLocatorSchema.skip.spec.ts` (one spec file per DSL method). Its non-terminal test becomes `skip`
    with the same expectation; its terminal test becomes "the terminal cannot be skipped" (a `@ts-expect-error` on the
    call and the runtime message).
  - [getLocatorSchema.clearSteps.spec.ts:101-107](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.clearSteps.spec.ts#L101-L107)
    (remove without an argument) becomes `clearSteps` rejecting a skipped ancestor, and the "no argument" case moves to
    the skip spec as a `@ts-expect-error`.
  - [add.frameLocator.spec.ts:160](../test/tests/locatorRegistry/add/add.frameLocator.spec.ts#L160): `skip("shell")`,
    the same expectation.
- `getLocatorSchema.skip.spec.ts` gains, against DOM: `skip`/`unskip` round trips (the chain, the description, the
  match count); steps added before `skip` come back with `unskip`; each of the five mutating calls on a skipped segment
  throws; `skip` twice and a stray `unskip` throw; `getLocator()` ignores skipped ancestors; the any-frame segment
  becomes first when its ancestor is skipped.
- [validation.sub-path.spec.ts](../test/tests/locatorRegistry/validation/validation.sub-path.spec.ts) gains the
  appended reason for an unregistered segment, and that a path outside the chain gets no reason.
- [registry.verify.spec.ts](../test/tests/locatorRegistry/registry/registry.verify.spec.ts) gains an array and a
  `filter`-only object as `has`, reported as unsupported references; [add.spec.ts](../test/tests/locatorRegistry/add/add.spec.ts)
  gains a duplicate whose existing record has a `Locator` in `has`, the message showing `locator('…')` and no `_guid`,
  and P18's mutations, each leaving the registered locator unchanged against DOM.
- The `describe` specs ([add.describe.spec.ts](../test/tests/locatorRegistry/add/add.describe.spec.ts),
  [getLocatorSchema.describe.spec.ts](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.describe.spec.ts),
  the reuse spec for seeds) gain `describe("")` against the rendered locator, and `null`/`undefined` as
  `@ts-expect-error` calls that throw. [getLocatorSchema.nth.spec.ts](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.nth.spec.ts)
  and [add.spec.ts](../test/tests/locatorRegistry/add/add.spec.ts) gain the pass-through against DOM:
  `nth(undefined)` and `nth(null)` (as `@ts-expect-error` calls) match nothing, `nth("2")` matches the third element,
  each next to the same call on a plain Playwright locator.
- [getLocator.spec.ts](../test/tests/locatorRegistry/getLocator/getLocator.spec.ts) gains malformed paths from
  JavaScript (P4's messages) and a cycle reported as before.
- New `test/tests/pageObject/callSite/`: a broken page object and a pending `seed` in modules named `pageObject.ts`
  and `sessionStorage.ts`, and `callSite.spec.ts` asserting that each error's first frame is the module's line (the
  page object's through a first use after the check has failed, the seed's through the stored stack).
- New `test/tests/logging/logging.spec.ts`: the `log` fixture's attachments for P10's calls (bodies as given, content
  types, call order), a `test.use({ locale, timezoneId })` group for the names, and a clock-API test; the attachments
  read back through `test.info().attachments` after the fixture's teardown, the mechanism settled at execution.
- [testPage.page.ts](../test/page-object-models/testApp/pages/testPage.page.ts) gains a static `@step` method and
  [step.spec.ts](../test/tests/step/step.spec.ts) its call.
- [publicTypes.typecheck.ts](../test/tests/packaging/publicTypes.typecheck.ts): `@step` on a sync method is an error,
  on an async, a Promise-returning and a static async method it compiles; `skip` and `unskip` accept the ancestors and
  reject the terminal, `skip()` and `remove`; `describe(null)`, `nth(null)` and `has: []` are errors; the `@step`
  error names the message type.
  [publicTypes.emit.ts](../test/tests/packaging/publicTypes.emit.ts): a class with an `@step` async method and a
  module returning `getLocatorSchema(p).skip(…)` emit.

### 4.3 Docs (`docs/v3` only)

- [locator-registry.md](../docs/v3/locator-registry.md): the table of contents and the overview list (L49, L83); *Clone
  semantics* (L641-652) states the guarantee of 1.2, the copies included; *Sub-path scope rules* (L654-660): the two
  cases and their messages; *Method-by-method reference* and the default sub-path table (L662-705): `skip`/`unskip`
  instead of `remove`, no default; *Duplicate path behavior* (L351-353) says what the details show; *Accepted
  `has`/`hasNot` reference forms* (L463-484): anything else, an array included, is reported by `verify()`; *Steps and
  descriptions are untouched* (L766-781) unchanged in substance, plus `describe("")`; *`remove` and tombstones*
  (L787-814) replaced by *Skipping a segment: `skip` and `unskip`*: what is hidden, what comes back, what a skipped
  segment rejects, why the terminal cannot be skipped, examples; `describe` (L903-955): `describe("")` removes a
  description, the argument is a string; *Error reference* (L957-998): the skip messages, the `describe` and `nth`
  messages, the appended reason; the troubleshooting list (L994); *Tested behavioral guarantees* (L1000-1019);
  *Migrating from 2.x to 3.0* (L1022-1047): `remove` to `skip`/`unskip`, the terminal, the checks.
- [overview.md](../docs/v3/overview.md): the query-builder list and example (L249, L272); *2.10 `step` decorator*
  (L391-407): methods that return a Promise, why, the title of a static method.
- [logging.md](../docs/v3/logging.md): *Log methods* (L48-62): what a message and the arguments become, with examples
  (a string, a multi-line string, an object, a nested object passed as `JSON.stringify(data, null, 2)`, an `Error`);
  *Attaching logs to the report* (L92-110): one attachment per entry in call order, the name format, the content type,
  the locale and time zone from the `locale` and `timezoneId` fixtures, the clock API, `attachLogsToTest`'s second
  argument in a custom fixture (L133-157). The two section 5 bullets on this page stay with plan 10.

### 4.4 Changeset

`.changeset/small-fixes-and-cleanup.md`, `"pomwright": major`, under *Breaking changes*:

- The query builder's `remove(subPath?)` is replaced by `skip(subPath)` and `unskip(subPath)`, a flag that leaves an
  ancestor out of the chain and deletes nothing; the terminal path cannot be skipped; `update`, `replace`, `filter`,
  `nth` and `clearSteps` on a skipped segment throw. Migration: `remove("ancestor")` becomes `skip("ancestor")`;
  `remove()` followed by `update()`/`replace()` on the terminal becomes `update()`/`replace()`, plus `clearSteps()` and
  `describe("")` where the old deletion of steps and description was wanted.
- `@step` accepts only methods that return a Promise. Migration: make the method `async` (it always returned a
  Promise at runtime).
- The logger keeps messages and string arguments as given (no JSON re-formatting, no trailing blank lines), prints
  other arguments as `console.log` does, and names attachments in the `locale` and `timezoneId` of the run (Playwright's
  default `en-US` instead of the fixed `nb-NO`). Migration: set `use: { locale: "nb-NO" }` for the old names; pass
  `JSON.stringify(data, null, 2)` for a pretty JSON body.
- From JavaScript, `describe` throws for an argument the types reject (`null`, `undefined`), and `nth(null)` and
  `nth(undefined)` go to Playwright, which matches nothing, instead of being dropped (which matched every element).
  Migration: call `nth` only when there is an index.

Under *Fixes*: a caller's options and filter objects can no longer change a registered locator; static step titles; a
bare `@step` on a static legacy-decorated method; arrays in `has`; the duplicate-registration message; call sites in
consumer files named like POMWright's; the sub-path message gives its reason. Under *Internal*: dead branches,
`getLocator` without a query builder, one clone per segment, one call-site helper.

### 4.5 Analysis, release notes, decisions, AGENTS.md, PLANS.md

At agreement: [DECISIONS.md](DECISIONS.md) gets this plan's section; [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)
gets, marked *planned*: breaking items for `skip`/`unskip`, `@step` and the logger, bug-fix lines for 1.10's bullets
and the caller-object copies, a cleanup line for section 2 and the call-site helper, tests and docs lines, and upgrade
checklist items (`remove` to `skip`; make `@step` methods `async`; `use.locale` for the old log names;
`JSON.stringify` for nested log data; call `nth` only with an index); [PLANS.md](PLANS.md) row 8 reads "written 2026-10-15, decisions taken,
awaiting implementation".

At execution (last step): tick 1.10's open bullets (*Fix* with notes) and section 2's four code bullets (D7 *Skip* with
its reason); flip the release-note items to *done*; append execution-time decisions. [AGENTS.md](../AGENTS.md): the
revision line; section 1 (the query builder's methods); section 2 (`callSite.ts`, the new unit-test files, the new
spec folders); section 4 (the skip, logging and call-site specs); section 5, rules: builders copy what callers pass and
every read is a clone; `skip` is a flag on ancestors only; a deferred error points at the consumer through the
call-site helper; and the fluent API list (`skip`/`unskip` instead of `remove`); section 7 (the eighth pending
changeset); section 8 (`remove` and its deletion semantics added to the removed behaviour). [PLANS.md](PLANS.md) row 8
to executed, and its `isTerminalStep` wording corrected (closed by plan 1.6-1.8).

---

## 5. Tests

### 5.1 Unit tests (vitest, typecheck mode)

- [utils.test.ts](../src/locators/utils.test.ts): `isLocatorInstance` over a `Locator`-shaped object, an array, a
  `filter`-only object, a `FrameLocator`-shaped object, a `Page`-shaped object, `null`; `stringifyForLog` renders a
  `Locator`-shaped value through its `toString`; `normalizeSteps` copies filter objects; `assertDescription` accepts
  and rejects per 3.5; `applyIndexSelector` maps `"first"`/`"last"` and hands every other value to a recording stub's
  `nth`, `null` and `undefined` included.
- New `src/locators/locatorRegistry.test.ts` with a stub page: the duplicate message's first sentence and a rendered
  locator; `getLocator` with malformed paths throws the path-format errors before a lookup; a caller's options and
  filter objects changed after `add` leave the stored record unchanged.
- [locatorQueryBuilder.test.ts](../src/locators/locatorQueryBuilder.test.ts): its type block (L24, L45) uses `skip`;
  `skip`/`unskip` types (ancestors only, `remove` gone); a runtime block with a stub page: the skip rules of 3.4, the
  sub-path reasons, `filter` copying, the `describe` check.
- [locatorRegistrationBuilder.test.ts](../src/locators/locatorRegistrationBuilder.test.ts): the `describe` check on
  `add` and on seeds; a seed's definition and filters copied.
- New `src/helpers/callSite.test.ts`: the boundary's frame and the frames above it are left out, a caller in a
  function named like a POMWright module is kept; `atCallSite` drops bundle frames and keeps name and message.
- [sessionStorageSeed.test.ts](../src/helpers/sessionStorageSeed.test.ts): its `site` fixture becomes an `Error` with
  a fixed stack (L269 and the error-builder block at L582-596), the `captureCallSite` block (L149-156) moves to
  `callSite.test.ts`; the assertions on the rewritten stacks stay.
- [pageObject.test.ts](../src/pageObject.test.ts) unchanged; its construction-site assertions (L306-315) pass on the
  prototype (P13).
- New `src/helpers/stepDecorator.test.ts` (runtime) with `@playwright/test` mocked (`vi.mock`) to record titles: the
  decorator called directly with hand-made contexts, since vitest's transform does not lower decorator syntax (P15: a
  `SyntaxError` at runtime): instance and static titles, an explicit title, options passed through, the kind check, the
  legacy shape with a class target. New `src/helpers/stepDecorator.test-d.ts` (types only; the type check reports its
  errors, P15): `@step` on sync methods is an error (consumed `@ts-expect-error`), on async, Promise-returning and
  static async methods it compiles, in decorator syntax. [vitest.config.ts](../vitest.config.ts) adds
  `src/**/*.test-d.ts` to `typecheck.include`, so the file is enforced by name rather than only because
  `tsconfig.vitest.json` covers it.
- New `src/helpers/playwrightReportLogger.test.ts` with a fake `TestInfo`: bodies as given for strings, `console.log`
  forms for other arguments, no trailing separator, the content-type rule (`"42"` text, a JSON object JSON), call order
  without sorting, level filtering, the attachment name in a given locale and time zone.

### 5.2 Harness

Per 4.2. The existing specs stay green on all three browsers apart from the four `remove(` conversions of 4.2. Red
first: the new skip, sub-path, `has`, duplicate, mutation, `describe`/`nth`, call-site, logging and static-step specs
fail on HEAD (P3, P1, P2, P18, P4, P7, P10, P20, P8 are the red evidence); the type probe's new negatives compile on
HEAD or name a method HEAD lacks (P9, P16).

### 5.3 Probes at execution

Re-run against the final tarball, in the scratchpad: P1, P2, P3 (as `skip`), P4, P7, P8, P10, P12 (counts and times),
P18, P20 (the report and the locales), P22, P23, P24, P25 (both decorator modes), and the P11 markers on the remaining branches of `buildLocatorChain`.
Recorded in the execution note, not added to CI.

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: `remove` is gone and the terminal cannot be skipped (none in the
survey, four calls in the harness); changes to a skipped segment throw; `@step` on a sync method stops compiling (none
in the survey or the harness, and it never behaved as typed); the logger's attachment names and bodies change for
everyone who relied on `nb-NO` names or re-formatted JSON; `describe` throws for arguments the types reject and
`nth(null)`/`nth(undefined)` match nothing as in Playwright (JavaScript only). Everything else is a fix (the caller-object copies, messages that gain information, step titles,
call sites) or internal.

---

## 7. Decisions

Taken with the user on 2026-10-15, in two review rounds; the chosen option is stated first in each.

- [x] 7.1 1.10 `isLocatorInstance`: require `filter`, `nth` and `locator` to be functions, so arrays and `filter`-only
  objects are reported as unsupported references (Playwright's `has` takes one `Locator`). Rejected: excluding arrays
  only; leaving Playwright's frame message.
- [x] 7.2 1.10 duplicate registration: `stringifyForLog` renders a `Locator` with `String()` (P23); D1 removed; the
  size claim is recorded as not reproducing with Playwright 1.64 (P2b). Rejected: no details; DSL rendering (plan 9).
- [x] 7.3 1.10 `remove()` becomes `skip(subPath)`/`unskip(subPath)`: a flag on the query that leaves an ancestor out
  of the chain and deletes nothing; `unskip` restores the segment exactly as it was; no `remove` alias. Rejected:
  documenting today's deletion; `update()` without arguments as the way back; `tombstone`/`restore`,
  `exclude`/`include`, `tombstone(subPath, false)`.
- [x] 7.4 The terminal path cannot be skipped: excluded from the types (`SkippablePaths`), no form without an argument,
  rejected at runtime.
- [x] 7.5 `update`, `replace`, `filter`, `nth` and `clearSteps` on a skipped segment throw at the call and name
  `unskip`; `skip` on a skipped segment and `unskip` on one that is not skipped throw. `update`/`replace` no longer
  deal with tombstones, so a throwing call after `skip` changes nothing (P5).
- [x] 7.6 1.10 sub-path message: the sentence kept, with the reason appended for an unregistered segment of the
  chain; no existing expectation changes. Rejected: new first sentences (two expectations change).
- [x] 7.7 A registered locator cannot change after registration: every resolution works on a clone, and each
  `getLocatorSchema` call is a new one (7.18).
- [x] 7.8 Builders store copies of the options and filter objects callers pass, one level deep (a deep clone breaks
  `Locator`s and is not needed, P19); `normalizeSteps` copies filter objects. Amended 2026-10-19 (section 3.6): every
  RegExp is copied too, and the registration builder keeps a copy of its definition.
- [x] 7.9 `describe` takes a string on all four builders; `describe("")` removes a description and is documented; no
  `describe(null)`; a non-string from JavaScript throws. The default description stays the path when none is set;
  making the default an option is plan 9 (analysis 3.3). Rejected: `""` meaning "use the path".
- [x] 7.10 `nth` mirrors Playwright: `"first"`/`"last"` stay POMWright's, every other value goes to Playwright's `nth`
  as given; `applyIndexSelector` loses its `null`/`undefined` branch; the types are unchanged, so TypeScript rejects
  what Playwright's `nth(index: number)` rejects. From JavaScript `nth(null)`/`nth(undefined)` match nothing, as in
  Playwright (P24). Answers plan 1.9's question. Rejected: a POMWright runtime check (code of its own to keep in step
  with Playwright, for a case TypeScript already rejects); treating `undefined` as "no index".
- [x] 7.11 1.10 `@step` types: both decorator signatures accept only methods returning `Promise<T>`, and a last
  overload per decorator form whose parameter type is `"@step decorates methods that return a Promise: make the
  method async"` puts the reason into the compile error (P25). No runtime check (not possible before the call).
  Rejected: documenting only; running sync methods outside `test.step`.
- [x] 7.12 1.10 `@step` runtime: static methods titled by their class; `context.kind` checked in the stage-3 branch;
  legacy calls recognised by shape, so static methods are wrapped.
- [x] 7.13 1.10 logger defect: the message and string arguments kept exactly as given; other arguments as
  `console.log` prints them (`util.inspect` with its defaults); no separator without arguments; the body attached as
  stored, `application/json` only when the message alone is a JSON object or array. Rejected: JSON for everything;
  `util.inspect` without a depth limit (P21); a pretty-print option.
- [x] 7.14 1.10 logger enhancements: timestamps in Playwright's `locale` and `timezoneId` (the fixture passes them to
  a new optional argument of `attachLogsToTest`); one attachment per entry, as today; no sort, call order. Rejected:
  the machine's locale; ISO 8601; one attachment per test.
- [x] 7.15 Plan 1.7 decision 7.16: one `src/helpers/callSite.ts` with `captureCallSite(boundary)` (V8's
  `Error.captureStackTrace`) and `atCallSite`, which drops only frames in POMWright's bundle; `PageObject` and `seed`
  use it, the `seed` site becomes a lazily formatted `Error`. Rejected: one helper with both name patterns; two helpers
  as today.
- [x] 7.16 Section 2 unreachable code: D1 to D6, D8 and D9 removed (D3 to D5 with the tombstones), D2's cast dropped,
  `buildLocatorChain` takes the terminal and returns a `Locator`, the debug-step record untouched; D7 kept (tested by
  design) and ticked *Skip*. The internal signatures that change are not on any exported type.
- [x] 7.17 Section 2 `getLocator`: validates the path, then resolves a clone of the record terminal-only through one
  `resolveRecord` shared with `verify()` and the `has`-path resolution.
- [x] 7.18 Section 2 cloning: a query owns the clones `getIfExists` returns (one per segment instead of two); every
  read clones, including `getLocator`, `verify()` and the `has` paths; the merge and registration copies stay. The
  measurement (P12) is recorded. Rejected: reads without a clone (0.1 µs saved, the guarantee weakened).
- [x] 7.19 Tests per section 5: existing specs updated where a decision changes them and extended, every new
  behaviour covered by unit tests and harness specs, including the new `*.test-d.ts` file for decorator syntax (added
  to vitest's `typecheck.include`) and the skip, logging and call-site specs; no new dependency.
- [x] 7.20 Docs per 4.3; one `major` changeset, `small-fixes-and-cleanup`, per 4.4.

> Notes:

---

## 8. Execution order

1. Locators (4.1 steps 1 to 4) with the unit tests of 5.1 for them first (red, then green); `pnpm format`,
   `pnpm lint`, `pnpm test:unit`, `pnpm build`.
2. Helpers (4.1 steps 5 to 7) with their unit tests first (red, then green); the same commands.
3. Harness (4.2): the converted and new specs and the probes; `pnpm harness:install`, `pnpm typecheck`, the chromium
   project.
4. Docs in `docs/v3`.
5. Changeset.
6. Full run: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test --reporter=line` (three
   browsers), the probes of 5.3 against the final tarball; fix anything red.
7. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md`, this plan's
   execution note.
