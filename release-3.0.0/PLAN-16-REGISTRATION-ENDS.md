# Plan 16: a registration ends at the next call on the registry

Working document, kept in `release-3.0.0/`. It closes the last way a registered locator can change after its `add(…)`
statement: a registration kept in a variable, whose `filter`, `nth`, `describe` or locator method is called later. The
public API and its types do not change; a call that is accepted today throws instead. File links are relative to this
folder.

Written 2026-10-19, after the documentation review of *Registering locators* found the gap (the RegExp copies fixed the
same day close the other one, see [DECISIONS.md](DECISIONS.md), plan 1.10-2's amended row). **Reviewed 2026-10-19:
every decision in section 9 taken as recommended**, and mirrored in [DECISIONS.md](DECISIONS.md) and
[RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md). Reuse by path stays a copy (asked in the review: a reference would
only add reusing a path registered later, at the cost of following references in records, resolution, `verify()` and
queries, and of an error at `verify()` instead of at the `add` line).

**Executed 2026-10-19**, one commit per step: d2d4bed (1, the runtime, its doc comments and the unit tests), 67189a1
(2, the harness), ea7cacf (3, the docs and AGENTS.md), and the ledger commit for step 4 that carries this note; step 5
(verification) records its result below. As executed: the five text-like locator methods check in `commitTextLike`;
the *Upgrading from 2.x* grep also finds a registration kept in a `this.` field (section 7.4's draft did not); see
DECISIONS.md's execution-time rows.

Every claim below was checked on 2026-10-19 with Playwright 1.64.0 against packed builds, in a scratchpad clone, never
in the working tree: the current behaviour against the working tree's code (HEAD 508ee28 plus the uncommitted RegExp
fix), the design against a prototype of it in the clone. Line references are to the working tree.

## 1. Summary

The guarantee POMWright states is that a locator registered with `add()` does not change: *Principles* says "a
registered locator never changes after `add()`", and *Registering locators* has a section titled *Registered locators
do not change*. The registry keeps it against everything outside a registration: the objects and RegExps a caller
passed (copied), reads, queries, resolutions, `has` references, seeds and copies by path. It does not keep it against
the registration itself. The registration builder writes the registry on every call, the locator method registers the
path and each later step replaces its record, and nothing marks the end of the chain. A registration kept in a
variable therefore keeps changing its path whenever it is called: after other registrations, after the path was
resolved, verified or acted on, mid-test, from a page object's method.

The fix: a registration ends at the next call on its registry. Every method of an ended registration throws, naming the
method, the path and the fix, and changes nothing. Steps given in the chain, or on a registration kept in a variable
before the registry is called again (a conditional step, steps in a loop, plan 10's held seeded override), work as
today, because nothing has used the registry in between. In a page object, the `verify()` that runs after
`defineLocators()` ends the last registration.

## 2. How it works today

- **The builder writes on every call.** `persist()`
  ([locatorRegistrationBuilder.ts:757-775](../src/locators/locatorRegistrationBuilder.ts#L757-L775)) registers the path
  the first time and calls `this.registry.replace(this.path, record)` every time after. It runs from `commit()` (every
  locator method, [L681](../src/locators/locatorRegistrationBuilder.ts#L681)) and from `applyFilter`, `applyIndex` and
  `applyDescription` ([L697-720](../src/locators/locatorRegistrationBuilder.ts#L697-L720)), which the view after a
  locator method calls ([L777](../src/locators/locatorRegistrationBuilder.ts#L777)).
- **The registry does not know which registrations are still going on.** `add`
  ([locatorRegistry.ts:167](../src/locators/locatorRegistry.ts#L167)) hands out a builder and forgets it.
- **2.1.0 had the same mechanism**: `persist()` in `v2.1.0:src/locators/locatorRegistrationBuilder.ts` (L459-478)
  registers once and replaces after. It is a 2.x behaviour carried over, not a 3.0.0 regression.
- **The docs describe the mechanism and not its consequence.**
  [internal/builders.md](../website/src/content/docs/internal/builders.md) says "the first call registers, later ones
  replace the record), so a registration is complete whenever the chain stops". Plan 10 kept a seeded registration held
  in a variable working (DECISIONS.md, plan 10, Q2 and Q3) and checked only that the held form produces the right
  record.

## 3. Verified facts

Current behaviour (V), the packed build of the working tree; prototype (P), the design of section 5 in the clone. Each
case registers `other` and `item` (`getByRole("listitem")`, kept in `view`), makes the call in the first column, then
calls `view.nth(0)`.

| # | case | V: today | P: prototype |
| --- | --- | --- | --- |
| 1 | steps on a held registration right away (`if` and a loop) | applied | applied |
| 1b | plan 10's held seeded registration: a step, then the override | applied | applied |
| 2 | after another `add` | `item` becomes `getByRole('listitem').first()` | throws; `item` unchanged |
| 3 | after `getLocator` of another path | changed | throws; unchanged |
| 4 | after `getNestedLocator("item")` itself | changed | throws; unchanged |
| 5 | after `getLocatorSchema` | changed | throws; unchanged |
| 6 | after `verify()` | changed | throws; unchanged |
| 7 | after `createReusable.locator(…)` | changed | applied (registers nothing, does not end it) |
| 8 | `const pending = add("late")`, another `add`, then `pending.getByRole("button")` | `late` registered then, after `verify()` had run without it | throws; `late` never registered |
| 9 | a held seeded registration, another `add`, then the override | the override applied | throws |
| 10 | the source of a reuse by path, given a step after the reuse | the source changes, the copy keeps the old record, a `has` reference follows the new one | throws: the reuse ended the source |
| 11 | a page object that keeps `this.add("main.button").getByRole("button")` in a field and filters it from a method after use | `main.button` resolves differently from then on, for the rest of the test | throws: the `verify()` after `defineLocators()` ended it |
| 12 | an `add` on another registry | n/a | applied: each registry ends only its own |

Both columns: a `Locator` obtained before a late step does not change (Playwright locators are values); a second locator
method on one registration throws `only one locator type can be set` as today.

On the prototype: the 666 unit tests pass unchanged with no type errors. `pnpm pack-test` on chromium, firefox and
webkit: 1385 passed, 1 skipped (the download on WebKit, as on HEAD), 6 failed, the same two tests on each engine, both
in [add.reuseExisting.spec.ts](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts), both encoding what this
plan removes or relying on an unbound call:

- **L44** calls `registry.add` detached from the registry (`registry.add as unknown as (…) => void`), to force an
  invalid reuse value. It passed because `add` threw before it used `this`; ending the open registration first reads
  `this`, so it fails with `Cannot read properties of undefined (reading 'endOpenRegistration')`. The standalone `add`
  of `createRegistryWithAccessors` is bound, so no consumer call is affected. The test binds the method; its expected
  message is unchanged.
- **L180** keeps `copy`, a reuse of an any-frame path, registers `frames.toggleC` and resolves it, then expects
  `copy.filter(…)`, `copy.nth(…)` and `copy.describe(…)` to throw the any-frame message. With the ended check first
  (16.4) they throw `filter() cannot apply to "frames": its registration has ended; …`. The test asserts the any-frame
  refusal right after the reuse, and the ended message after the later calls.

Every other `const … = …add(` in `src/`, `test/`, `website/` and the README was read: each is used before the registry
is called again, among them plan 10's held override in `publicTypes.typecheck.ts:281` and `locatorRegistry.test.ts:748`.
No harness page object, docs example or README example keeps a registration.

## 4. Intended contract

- A registration starts at `add(path)` and ends at the next call on the same registry: `add`, `getLocator`,
  `getNestedLocator`, `getLocatorSchema`, `verify`, or the resolution of a query (`getLocator()` and
  `getNestedLocator()` on a `LocatorQueryBuilder`). `createReusable` does not end it: making a seed registers and reads
  nothing.
- Every method of an ended registration throws at the call and changes nothing: the ten locator methods, a seeded
  override, `filter`, `nth` and `describe`.
- Until then a registration works as today, in one chain or kept in a variable: a conditional step, steps in a loop, a
  seeded override before or after steps.
- So a registered locator is final once anything else has happened on its registry, and in particular before anything
  reads it. A copy by path and a `has` reference can no longer differ.
- A page object needs nothing new: inside `defineLocators()` each `this.add` ends the previous registration, and the
  `verify()` right after it ends the last one.

Message (prototype):

```text
nth() cannot apply to "item": its registration has ended; give a registration all its steps in its add(…) chain, or query the path for one use.
getByRole() cannot apply to "late": its registration has ended; give a registration all its steps in its add(…) chain, or query the path for one use.
```

## 5. Design

- **The registry** keeps the open registration, the builder the latest `add` returned, and ends it at the start of
  `add`, `getLocatorSchema`, `getLocator`, `getNestedLocator`, `verify` and `buildLocatorChain` (which every resolution
  and a query's `getLocator`/`getNestedLocator` go through). `add` then records its new builder as the open one, for
  each of its three return paths (a plain registration, reuse by path, reuse of a seed). `get`, `getIfExists`,
  `register` and `replace`, internal, do not end it: the builder's own writes go through `register` and `replace`.
- **The builder** gets `end()`, which sets a flag, and `ensureOpen(method)`, which throws once it is set. It is called
  first in each of the ten locator methods (in `commitTextLike` for the five text-like ones), and in `applyFilter`,
  `applyIndex` and `applyDescription`, which the class methods and the view share. The check comes before every other
  check, so an ended registration reports that and nothing else.
- **No type changes.** `end` is a member of the internal class only; the public types pick the strategy methods and
  the view, so neither shows it. The API coverage check is unaffected.
- **Size** (prototype): about 25 lines in `locatorRegistry.ts`, about 20 in `locatorRegistrationBuilder.ts`.

### 5.1 Options considered

| option | what it does | verdict |
| --- | --- | --- |
| a. end at the next call on the registry (recommended) | as above | closes every case of section 3 but 1, 1b, 7 and 12, which change nothing anyone has seen |
| b. end at the first use of the path | a registration ends when its own path is read (resolved, reused, referenced, verified) | leaves case 2: a held registration can still change its path after other registrations, until something reads it; "after its `add` statement" is still not true |
| c. a terminal `.register()` | the chain ends when it is called | every registration gets longer; TypeScript cannot require the call, and a forgotten one registers nothing |
| d. end in a microtask | the registration ends once the synchronous code that started it is done | `defineLocators()` is synchronous, so every held registration stays open through it |
| e. document the behaviour | keep 2.x's behaviour, reword the guarantee | the opposite of the stated intent; no use case needs a step after the registry was used (section 6) |

## 6. Use cases checked

Only steps given right after `add`, before any other registry call, need a held registration: a step under a
condition, steps from a list. Both stay (cases 1 and 1b). No case was found that needs a step after another
registration or after use: a step for every use belongs in the chain, a variant is another path (registered, or reused
and narrowed), and a step for one use is a query. Changing a registered path later, mid-test, is what queries exist to
avoid.

## 7. Implementation steps

1. **Runtime** (`src/locators/locatorRegistry.ts`, `locatorRegistrationBuilder.ts`): section 5. Doc comments: the class
   and view `filter`, `nth`, `describe` and the ten locator methods get the new `@throws`; `add`'s comment says the
   registration ends at the next call on the registry.
2. **Unit tests** (vitest, `locatorRegistry.test.ts`, `locatorRegistrationBuilder.test.ts`, `pageObject.test.ts`):
   - each ending call (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`, a query's `getLocator`
     and `getNestedLocator`) times each kind of method (`filter`, `nth`, `describe`, a locator method on an `add(path)`
     without one, a seeded override): throws with the message, and the record is unchanged;
   - steps right away on a held registration, in a loop and under a condition; plan 10's held override before and after
     a step; `createReusable` in between; another registry's `add` in between: all accepted;
   - the source of a reuse by path cannot take a step after the reuse;
   - a page object that keeps a registration in a field: a step from a method after construction throws, with the page
     object's registry unchanged.
   Written first and shown failing against the current code.
3. **Harness**: the two changed expectations of `add.reuseExisting.spec.ts` (section 3); a new spec,
   `test/tests/locatorRegistry/add/add.registrationEnds.spec.ts`, against the packed package and the `/testfilters`
   page: a held registration given a step after another `add` and after a resolution throws, and the path still finds
   the element it found before (DOM); a page object kept in a fixture whose method steps a registration it kept throws;
   contiguous steps and plan 10's held override still find the right element.
4. **Docs** (`website/`):
   - *Principles*: "A registered locator never changes after `add()`" stays, and says why: a registration ends with its
     chain, at the next call on the registry.
   - *Registering locators*: *Registered locators do not change* gains the rule and the message, with a
     held-registration example; *When locators are registered* loses nothing (the reference/copy bullets stay true).
   - *Reusing locators*: "When you keep the registration in a variable, the one change may come before or after its
     `filter`, `nth` and `describe` calls" adds "before the registry is called again".
   - *Registration* (API): the rule in the page's introduction, the message under every method's **Throws**.
   - *Error messages*: the message under *Registering*.
   - *Upgrading from 2.x*: an item, **Fails at run time**: a registration kept in a variable and continued after another
     registry call, with the grep `grep -rnE '(const|let) \w+ = .*\badd\(' --include=*.ts .` and the fix.
   - Internal *Builders*: the paragraph that says a registration "is complete whenever the chain stops" describes the
     end; *Registry records*: the end is one of the boundaries.
   - Every chain and message read back from the build (AGENTS.md section 9).
5. **AGENTS.md**: section 5's "A registered locator cannot change after registration" bullet adds that a registration
   ends at the next call on its registry; section 8 adds "let a registration take a step after its registry was called
   again".
6. **Changeset**: one bullet added to the existing `major` changeset `registration-guards-and-frames.md`, with the
   migration hint (no new changeset; 3.0.0 is unreleased and the change is a registration guard).
7. **Ledgers**: DECISIONS.md, a section *Plan 16* with section 9's decisions; RELEASE-NOTES-3.0.0.md, an item under the
   registration changes, *planned* when this plan is agreed and *done* when executed; PLANS.md's row; the analysis is
   not touched (no analysis item: the gap is a finding of the documentation review, like the RegExp copies).
8. **Verification**: lint, unit tests with no type errors, `pnpm build`, `pnpm pack-test` on chromium, firefox and
   webkit (both type checks, the snippet and coverage checks), the site build with every link valid.

## 8. Versioning

3.0.0 is a major. Against 2.1.0 this is breaking for code that keeps a registration and continues it after another
registry call (case 8 to 11), which the survey of one 2.1.0 consumer project and the harness do not do. It rides the
existing `registration-guards-and-frames` changeset.

## 9. Decisions

- [x] 16.1 A registration ends at the next call on its registry (`add`, `getLocator`, `getNestedLocator`,
  `getLocatorSchema`, `verify`, a query's resolution); every method of an ended registration throws and changes
  nothing. Rejected: options b to e of 5.1. **Recommended.**
- [x] 16.2 `createReusable` does not end a registration; each registry ends only its own; the internal `get`,
  `getIfExists`, `register` and `replace` do not end it. **Recommended.**
- [x] 16.3 The message: `<method>() cannot apply to "<path>": its registration has ended; give a registration all its
  steps in its add(…) chain, or query the path for one use.` **Recommended.**
- [x] 16.4 The ended check runs first in every method of the registration. **Recommended.**
- [x] 16.5 No change to `PageObject`: its `verify()` after `defineLocators()` ends the last registration.
  **Recommended.**
- [x] 16.6 One bullet in `registration-guards-and-frames.md` and an *Upgrading from 2.x* item; no new changeset.
  **Recommended.**
- [x] 16.7 Tests and docs as in section 7, steps 2 to 5. **Recommended.**

## 10. Execution order

1. Runtime and unit tests (7.1, 7.2), the tests shown failing first.
2. The harness spec (7.3).
3. The docs, the doc comments' API pages and AGENTS.md (7.4, 7.5).
4. The changeset and the ledgers (7.6, 7.7).
5. Verification (7.8).

The user commits; nothing is committed by the agent.
