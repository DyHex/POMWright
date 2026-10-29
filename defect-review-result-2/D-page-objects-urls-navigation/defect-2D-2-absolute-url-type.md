# 2D-2: On a RegExp baseUrl, goto(target) compiles for a relative target that has a colon, which the runtime rejects

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 90 in [DECISIONS.md](../DECISIONS.md) (AbsoluteUrl starts with a letter; a changeset); planned in the page objects and URLs plan
- **Area**: Navigation types: `NavigationFor<RegExp, …>`'s `goto(target)` (`AbsoluteUrl`, `GotoTarget` in `src/helpers/navigation.ts`)
- **Severity**: Low (a type that accepts an input the runtime always rejects; the call fails at once with a clear message, and the input, a relative target with a `:` on a page object whose base is a RegExp, is uncommon)
- **Semver of the fix**: patch (a type corrected to what the docs promise and the runtime does, docs/versioning.md; the only code that stops compiling is code that throws on every run)
- **Pass**: 1
- **First review**: considered and not filed by the first review (D's summary, *Observations, not findings*; `report.md` §9, *Considered and not filed*: "the runtime throws the documented message"), left for this review by `PLAN-release-gates-and-audit.md`; filed here because the docs say that message comes only "from JavaScript" (see *Contract*). Present since v3.0.0 (`4bdc347`)
- **Reviewed**: `d850405`, 2026-10-28T16:08:36+01:00, Opus 5.5, second review, segment 2D

## Contract

- `website/src/content/docs/api/class-navigation.md`, intro: "on a RegExp `baseUrl` `goto(target)` takes an absolute
  URL only"; *NavigationFor* table: RegExp `baseUrl` takes `goto(absoluteUrl)`; *goto()* **Throws**: the relative-target
  message comes "from JavaScript, on a page object whose URL is a RegExp".
- `website/src/content/docs/api/errors.md`, *Navigation*: "Thrown by `goto()`: from JavaScript on a page object whose
  URL is a RegExp".
- `src/helpers/navigation.ts:92-98`, the `@throws` of `goto`: "on a RegExp `baseUrl`, for a relative target (from
  JavaScript): `AccountPage: goto("/account") needs an absolute URL because baseUrl is a RegExp.`"
- `test/tests/packaging/publicTypes.typecheck.ts:733-734` asserts that `regExpBasePage.navigation.goto("/orders")` does
  not compile.

So TypeScript is promised to reject a relative target on a RegExp base, and the message is promised to reach only
JavaScript callers.

## Reproduction

Type side: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p05-types/zz-probe-d05.typecheck.ts`. From the
worktree root:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p05-types/zz-probe-d05.typecheck.ts test/tests/
pnpm exec tsc --noEmit -p test
rm test/tests/zz-probe-d05.typecheck.ts
```

Exit 0, no output: `goto("/orders?at=12:00")`, `goto("/orders/a:b")`, `goto("?at=12:00")`, `goto("1:2")` and, through
the documented "any page object's helper" type `NavigationFor<RegExp, UrlMatcher>`, `goto("/relative:yes")` all
compile; the `@ts-expect-error` on `goto(fromEnvironment)` (a `string`) is used (a string variable holding an absolute
URL does not compile, a separate consequence of the same type, noted below).

Runtime side: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p05-types/runtime.mjs` (the built package,
a stub page; the throw comes before Playwright's step):

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p05-types/runtime.mjs
```

Exit 0.

## Observed / expected

Observed (copied):

```text
"/orders?at=12:00" -> RegExpBase: goto("/orders?at=12:00") needs an absolute URL because baseUrl is a RegExp.
"/orders/a:b" -> RegExpBase: goto("/orders/a:b") needs an absolute URL because baseUrl is a RegExp.
"?at=12:00" -> RegExpBase: goto("?at=12:00") needs an absolute URL because baseUrl is a RegExp.
"1:2" -> RegExpBase: goto("1:2") needs an absolute URL because baseUrl is a RegExp.
```

Every one of these compiled. Expected, by the pages above: a compile error, as for `goto("/orders")`.

## Cause

`src/helpers/navigation.ts:14`: `` type AbsoluteUrl = `${string}:${string}` `` accepts any string with a colon anywhere,
while the runtime check is `isAbsoluteUrl` (`src/helpers/url.ts:131`, `/^[a-z][a-z0-9+.-]*:/i`, a scheme at the start).
A query value with a time, a path segment with a colon or a port-like `1:2` passes the type and fails at run time.

Related, not a defect on its own: the same type makes `goto(url)` with `url: string` (an absolute URL from the
environment) a compile error on a RegExp base, where the runtime accepts it; a caller needs a cast. The docs do not say
so.

## Fix plan

- **Intended contract**: the type of `goto(target)` on a RegExp base rejects what `isAbsoluteUrl` rejects, as far as a
  template literal type can say it.
- **Options**:
  1. *(recommended)* `` type AbsoluteUrl = `${SchemeStart}${string}:${string}` `` with `SchemeStart` the 52 ASCII letters:
     rejects every target that starts with `/`, `?`, `#`, `.` or a digit, which are the relative forms in use. Still
     accepts `a/b:c` (no template type can require "letters, digits, `+`, `.`, `-` up to the colon"); say so in the doc
     comment. Code that stops compiling always threw. Patch. Checked on its own:
     `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p05-types/option1/option1.ts`, run from the worktree
     root with `pnpm exec tsc --ignoreConfig --noEmit --strict --target es2022 <that file>`, exit 0: `"/orders?at=12:00"`,
     `"?at=12:00"`, `"1:2"` and a `string` are rejected (each `@ts-expect-error` used); `"https://shop.example/x"`,
     `"HTTPS://shop.example/x"`, `` `https://${host}/x` ``, `"about:blank"` and `"a/b:c"` are accepted.
  2. Keep the type and correct the docs: drop "(from JavaScript)" from the three places, and say that the type checks
     only for a colon. Semver none.
- **A source sketch is proposed** for option 1:
  `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/sketch/2D-2.diff` (`src/helpers/navigation.ts` only:
  `AbsoluteUrl` built from a `Characters<"abcdefghijklmnopqrstuvwxyz">` letter union, lower and upper case, with the
  doc comment saying what the type cannot check) and
  `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/sketch/2D-2.run.sh`, which compiles `test/` with
  `sketch/2D-2.typecheck.ts` added (four `@ts-expect-error` for relative targets with a colon, through the page object
  and through `NavigationFor<RegExp, UrlMatcher>`; accepted: an upper-case scheme and `` `https://${host}/orders` ``).
  At `d850405` it exits 2, the four directives unused (`sketch/2D-2.run-at-d850405.txt`); `git apply --check` passes;
  the type alone is checked by `sketch/2D-2.type-alone.ts` (tsc exit 0). Not run with the diff applied (the
  orchestrator's step); `publicTypes.typecheck.ts` compiles in the same run, so the helper matrix is checked too.
- **Implementation**: `src/helpers/navigation.ts`, `AbsoluteUrl` (not exported from the root, so no public name
  changes; `NavigationFor`'s declaration changes), as the sketch.
- **Tests**: `test/tests/packaging/publicTypes.typecheck.ts`, *navigationCalls*: `@ts-expect-error` lines for
  `"/orders?at=12:00"`, `"?at=12:00"` and `"1:2"` on `regExpBasePage` and through `NavigationFor<RegExp, UrlMatcher>`;
  an accepted `"HTTPS://shop.example/x"` and `` `https://${host}/x` ``. The helper matrix keeps passing (a string
  base's `goto(target: string)` still fits).
- **Docs**: none for option 1 beyond the doc comment of `AbsoluteUrl`; for the string-variable case, a sentence on
  *URLs and navigation* → *Pages whose URL varies* (an absolute URL held in a `string` is narrowed with a template type,
  `` url as `https://${string}` ``, since `AbsoluteUrl` is not exported).
- **Changeset**: patch, "On a page object whose `baseUrl` is a RegExp, `goto(target)` no longer compiles for a relative
  target that contains a colon, which it always rejected at run time."
- **Decisions to tick**: option 1 or 2; whether to export the target type so a `string` can be narrowed without a
  template literal cast (that would be a minor, and a separate decision).
- **Relative to other findings**: none.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium (`tests/pageObject`, `testNav`, `testPath`, `color`, `urlForms`, `urlHosts`); then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/sketch/2D-2.gate.out`.

- At `d850405`: `2D-2.run.sh` exit 2 (TS2578, four unused `@ts-expect-error` directives: the relative targets with a colon compile). With the sketch: exit 0, `tsc --noEmit -p test` over all of `test/`, `publicTypes.typecheck.ts` included. Unit tests 904 passed; the area's specs on chromium 99 passed.
- **Verdict: approved; a narrow fix suffices.** For the fix plan: the narrowed type still accepts strings the run-time check rejects (`"a/b:c"`), as the sketch's doc comment says; the changeset gives the migration for code that passed such a target.
