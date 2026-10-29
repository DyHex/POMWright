# 2H-6: *Installation* says session storage values are checked at runtime as the types check them; a value for a key with a codec is not checked at all, as *Session storage* itself says

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 102 in [DECISIONS.md](../DECISIONS.md); planned in the session storage plan (docs)
- **Area**: *Installation*, *Requirements* (what a JavaScript user can rely on), against *Session storage* and
  *Principles*
- **Severity**: Low (a broad claim on the first page a JavaScript user reads; the narrower pages state the truth, and
  the stored value is what the caller passed, so nothing is lost silently, but a wrongly typed value is stored and read
  back without an error where the claim promises one)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: missed by the first review. The sentence is at 54cdada (ffcc23f, 2026-10-22); *Installation* was
  scope F's page there, and H-7 (decision 40) rewrote the same broad claim on *Principles* only
- **Reviewed**: `d850405`, 2026-10-28T19:20:30+01:00, Opus 5.5, second review, segment 2H

## Contract

- *Installation* (`docs/installation.md`, lines 25–28): "POMWright also works from JavaScript: paths, the first argument
  of every locator method, URLs and session storage values are checked at runtime as the types check them. An index is
  not: `nth` hands it to Playwright as given".
- *Session storage* (`docs/session-storage.md`, lines 68–69): "A key that is not declared must be a string, at compile
  time and at runtime. `T` in `json<T>()` is not checked against the parsed value, exactly like `JSON.parse(…) as T`."
- *Principles*, *Check at runtime; types where they cost nothing*: "The rules about types themselves are TypeScript's
  alone, since types do not exist at run time: a storage schema's type and its value agree".

*Installation* names one exception (`nth`); the session storage page names another (a declared key's value), which
*Installation*'s list contradicts.

## Reproduction

Two probes in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/install/`, against the packed package:

- `types.typecheck.ts`: a `SessionStorage` with `{ user: json<{ name: string; age: number }>(), count: json<number>() }`
  and four `set` calls under `// @ts-expect-error`: `{ user: 42 }`, `{ user: "Ada" }`, `{ count: "five" }`,
  `{ token: 7 }`.
- `zz-probe-H-install.spec.ts`: the same four calls on an untyped helper (as JavaScript makes them), on
  `http://localhost:9000/teststorage`, printing the stored string and what `get` returns.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/install
W=/home/magdys/workspace/dyhex/POMWright-second-review
cp $P/types.typecheck.ts $W/test/tests/zz-probe-H-install.typecheck.ts
cp $P/zz-probe-H-install.spec.ts $W/test/tests/
(cd $W && pnpm exec tsc --noEmit -p test); echo "tsc exit $?"
cd $W/test && PROBE_OUT=$P/out.txt pnpm exec playwright test tests/zz-probe-H-install.spec.ts --project=chromium --reporter=line
rm $W/test/tests/zz-probe-H-install.typecheck.ts $W/test/tests/zz-probe-H-install.spec.ts
cat $P/out.txt
```

`tsc` exits 0, so every `@ts-expect-error` held: the types reject all four values. The spec exits 0.

## Observed / expected

```text
set user=42: stored "42"; get -> 42
set user="Ada": stored "\"Ada\""; get -> "Ada"
set count="five": stored "\"five\""; get -> "five"
set count={"n":5}: stored "{\"n\":5}"; get -> {"n":5}
set token=7: THROWS Probe.SessionStorage.set: value for "token" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)
```

At runtime only the undeclared key is checked. A declared key takes whatever its codec's `stringify` takes, and `get`
returns whatever its `parse` returns, typed as the codec's `T`. That is the decided contract (*Session storage*,
*Principles*); *Installation*'s sentence says otherwise.

## Cause

The sentence lists "session storage values" with the inputs that are checked against their types at runtime; for
storage, only "is a string" for an undeclared key is.

## Fix plan

- Intended contract: *Installation* lists what JavaScript callers get checked, with the exceptions the concept pages
  state.
- Recommended: "…paths, the first argument of every locator method, URLs, and that a session storage key without a codec
  gets a string are checked at runtime as the types check them. Two things are not: an index, which `nth` hands to
  Playwright as given (…), and a value for a key with a codec, which its codec stores as given (see
  [codecs](/POMWright/docs/session-storage/#codecs-for-structured-values))."
- No code change: checking `T` at runtime is impossible for `json<T>()` without a validator, which *Session storage*
  rules out by design.
- No changeset (docs only).
