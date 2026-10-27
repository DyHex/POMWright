# Plan 9: path rules as pattern checks reporting every rule; a locator method that throws changes nothing

- **Decisions**: [DECISIONS.md](DECISIONS.md) #22, #27
- **Findings**: [B-3](B-registration-and-resolution/defect-B-3-long-path-literal-ts2589.md),
  [B-2](B-registration-and-resolution/defect-B-2-failed-locator-method-keeps-definition.md); test gap #5's long-path
  and whitespace part, test gap #9's failed-persist part
- **Bump**: patch (two changesets)
- **Stop**: no
- **Depends on**: plans 7 and 8 (the same files; probed in that order)

## Contract

- A path's rules are checked with template-literal patterns, so a path literal of any length compiles. An empty path is
  its own error; otherwise four independent checks, in the order whitespace, leading dot, trailing dot, consecutive
  dots, and every broken rule is named, joined by `; `, in the `LocatorSchemaPathError<Path, Reason>` tuple (its shape
  unchanged). The runtime `validateLocatorSchemaPath` collects the broken rules in the same order: one broken rule keeps
  today's message exactly; several give one message naming them all.
- `add(path)` checks the path rules at the call (from `<string>` or JavaScript; a literal is a compile error), through an
  assertion function that also narrows the path, so the check and the type cannot be separated; `getLocatorSchema` and
  `getLocator` use the same function. The duplicate-path error stays at the locator method.
- A locator method that throws (the duplicate path today) leaves its registration as it was: the same call again
  throws the same error, never "has already been provided".

## Current behaviour

- `src/locators/types.ts:26-51`: `_LocatorSchemaPathFormat` walks the path one character per recursion, so TypeScript's
  1,000-level limit refuses well-formed paths of 999 characters or more (TS2589), and it names the first rule by
  position while the runtime (`src/locators/utils.ts:72`) checks in a fixed order: they disagree for 3 of 6 two-rule
  paths (`".a b"`, `"a..b c"`, `"a..b."`).
- `src/locators/locatorRegistry.ts`: seven `path as RegistryPath<…>` casts; `add` checks the path only when its locator
  method persists; `getLocator` checks at `:536`; the query checks again inside.
- `src/locators/locatorRegistrationBuilder.ts:770-782` (`commit`) and `:651-655` (the any-frame `frameLocator()`) assign
  `this.definition` (and `overrideApplied`) before `persist()` (`:849`), whose `register` throws for a duplicate path;
  a second call then meets `ensureDefinitionAllowed` (`:814-822`) and reports "A locator definition for "main" has
  already been provided".

## Steps

### Step 1: B-3 (one commit)

1. `types.ts`: replace `_LocatorSchemaPathFormat` with the pattern checks of `…-probes/R/walkthrough/b3/all-rules.diff`
   (whitespace as `` `${string}${UnicodeWhitespaceChar}${string}` `` over `LOCATOR_SCHEMA_PATH_WHITESPACE`, then
   leading, trailing and consecutive dots; every broken rule joined by `; `). `LocatorSchemaPathFormat`'s doc comment:
   "a tuple naming the rules it breaks".
2. `utils.ts` `validateLocatorSchemaPath`: collect the broken rules in the same order; one rule → today's message
   unchanged; several → one message naming them all, the path escaped when whitespace is among them (wording from a
   probe, for example `LocatorSchemaPath string cannot contain whitespace chars and cannot start with a dot: .a b`).
3. `locatorRegistry.ts`, from `…-probes/R/walkthrough/b3cast/variant-assert.diff`: `assertRegistryPath<Paths, P>(path:
   unknown): asserts path is P & RegistryPath<Paths>`, which runs `validateLocatorSchemaPath`, called at the start of
   `add` (after `endOpenRegistration`), `getLocatorSchema` and `getLocator` (replacing its separate check at `:536`);
   the seven casts go, no `as unknown as` enters the file. The query's own inner path check is dropped (decision 22; the
   walkthrough's patch did not include it): `LocatorQueryBuilderInternal`'s constructor (`locatorQueryBuilder.ts:66`)
   calls `expandSchemaPath`, which validates (`utils.ts:99-103`); the query gets a non-validating split, and
   `expandSchemaPath` keeps its check for its other callers (`locatorRegistry.ts:484,493,581`), unless each is shown to
   receive only checked paths (then the check moves out of it, recorded in *Execution notes*).
4. Doc comments: `add`'s `@throws` (a path that breaks a rule throws at `add`; the duplicate path at the locator method),
   `getLocatorSchema`/`getLocator` unchanged in substance.
5. **Tests**:
   - type level (`validation.locatorSchemaPath.typecheck.ts` and a vitest `expectTypeOf` in
     `src/locators/utils.test.ts`): paths of 999 characters and of 2,500 segments compile; each of the 26 characters of
     `LOCATOR_SCHEMA_PATH_WHITESPACE` is rejected (today the type test has only the plain space); U+200B, U+180E and
     U+2060 compile; the multi-rule paths `".a b"`, `".."`, `".a..b c."`, `"a..b."` name the same rules in the same
     order as the runtime;
   - runtime (`src/locators/utils.test.ts`): the same multi-rule paths; single-rule messages unchanged;
     `add("main..list")` from a `<string>` registry throws at `add` (`src/locators/locatorRegistry.test.ts`).
6. **Docs**: *Locator paths*, *The rules of a path*: a path that breaks several rules gets all of them, in that order,
   from TypeScript and at run time alike, with one example message copied from the probe; `api/errors.md`, the
   multi-rule form; `api/types.md`, *LocatorSchemaPathFormat*; `api/class-locatorregistry.md`, `add` **Throws**;
   AGENTS.md §5, the path-guarantees bullet (both checks name every broken rule in the same order; `add` checks the path
   at the call).
7. **Changeset** `long-path-literals.md` (`patch`): "A path literal of any length compiles; one of 999 characters or
   more failed with TS2589. A path that breaks several rules now names all of them, in the same order at compile time
   and at run time, and checking path types is faster. `add(path)` throws for a path that breaks a rule, where its
   locator method threw before."
8. Record the type-check cost once (`…/b3/cost.ts`, instantiations and time for 300 paths) in *Execution notes*, to
   compare with the walkthrough's 422,515 → 44,565.

### Step 2: B-2 (one commit)

1. `locatorRegistrationBuilder.ts`, as `…-probes/R/walkthrough/b2/b2-order.diff`: `persist(definition =
   this.definition)`; `commit` computes `next`, calls `this.persist(next)`, then assigns `this.definition` and, for a
   seeded registration, `overrideApplied`; the any-frame branch of `frameLocator()` persists before it assigns.
2. **Tests**: unit (`src/locators/locatorRegistrationBuilder.test.ts`): a duplicate path called twice through
   `getByRole` and through `frameLocator()` throws `A locator schema with the path "main" already exists.` both times;
   a seeded override whose persist fails (a stub registry) still accepts one override; a harness case in
   `test/tests/locatorRegistry/add/add.validation.spec.ts` against the packed package.
3. **Docs**: none; the behaviour now matches *Registering locators* ("A call that throws registers nothing and changes
   nothing that is registered").
4. **Changeset** `failed-locator-method-unchanged.md` (`patch`): "A locator method that throws because its path is
   registered already leaves the registration as it was, so calling it again reports the same error, not 'has already
   been provided'."

## Verify

The standard checks (PLANS.md, rule 5) after each step; `pnpm docs:build` after step 1.

## Commit

```text
fix: path rules checked by pattern, every broken rule named, at add

A path's type walked it one character per recursion, so a literal of 999
characters or more failed with TS2589, and it named a different rule than
the runtime for some paths. The rules are now template-literal patterns,
every broken rule is named in the same order at compile time and at run
time, and add(path) checks the rules through an assertion function that
replaces seven casts.

Plan: defect-review-result/PLAN-B-3-B-2-path-rules-and-persist.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
fix: a locator method that throws leaves its registration as it was

The definition was assigned before it was persisted, so after a duplicate
path error a second call reported "has already been provided" for a locator
never registered.

Plan: defect-review-result/PLAN-B-3-B-2-path-rules-and-persist.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
