# 2D-5: Internal → URL matching says Playwright never runs a RegExp subclass's own matching; page.waitForURL does

- **Kind**: documentation
- **Area**: `internal/url-matching.md`, *Alternatives weighed* (why `fullUrl` is a `UrlMatcher`, not a `RegExp` subclass)
- **Severity**: Low (a contributor-facing rationale states a runtime fact that is half wrong; its conclusion stands)
- **Semver of the fix**: none (docs only)
- **Pass**: 4
- **First review**: missed by the first review (the sentence dates from `7015668`, 2026-10-20, before `54cdada`)
- **Reviewed**: `d850405`, 2026-10-28T16:29:44+01:00, Opus 5.5, second review, segment 2D

## Contract

`website/src/content/docs/internal/url-matching.md`, *Alternatives weighed*:

> **A `RegExp` subclass** as `fullUrl`. Playwright sends a RegExp to the browser as its source and flags, so the
> subclass's own matching would never run.

The guide: "Every runtime or type claim in a plan, a page or a doc comment is backed by a probe or a test run"
(`AGENTS.md`, *How to work*).

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p12-regexp-subclass/zz-probe-d12.spec.ts`: a `RegExp`
subclass whose source never matches and whose overridden `test()` matches `/testnav`, passed to `page.waitForURL`,
`page.route` and `expect(page).toHaveURL` on `/testnav`. From the worktree root:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p12-regexp-subclass/zz-probe-d12.spec.ts test/tests/
pnpm -C test exec playwright test tests/zz-probe-d12.spec.ts --reporter=line --retries=0
rm test/tests/zz-probe-d12.spec.ts
```

Exit 0 (the probe records, it does not assert); output kept beside it.

## Observed / expected

```text
P12 {"browserName":"chromium","waitForURL":"its test() ran (matched)","route":"source used (not routed)","toHaveURL":"source used (did not match)"}
P12 {"browserName":"webkit","waitForURL":"its test() ran (matched)","route":"source used (not routed)","toHaveURL":"source used (did not match)"}
P12 {"browserName":"firefox","waitForURL":"its test() ran (matched)","route":"source used (not routed)","toHaveURL":"source used (did not match)"}
```

`page.waitForURL` matches in the test's own process (Playwright 1.64, `urlMatches`: `isRegExp(match)` then
`match.test(urlString)`), so the subclass's `test()` runs there; `page.route` and `toHaveURL` use the source and flags.
Expected: the sentence says where the subclass's matching would not run (`page.route()` and `toHaveURL()`, which, as
observed, match by the RegExp's source and flags; where they do it was not probed), which is enough to reject the
alternative, since both are documented uses of `fullUrl`.

## Cause

The sentence generalizes from `toHaveURL` and `route` to every Playwright call that takes a URL; `waitForURL` is the
exception (it matches in the test's process, as `urlMatches` shows).

## Fix plan

- **Intended contract**: the rationale states what Playwright does, call by call.
- **Option** (the only one): *Alternatives weighed* on `internal/url-matching.md`: "A `RegExp` subclass as `fullUrl`.
  `page.route()` and `toHaveURL()` take a RegExp by its source and flags, so the subclass's own matching would not run
  there (it would in `page.waitForURL()`, which matches in the test's process), and `fullUrl` must work in all three."
- **Tests**: none (docs only); the probe above backs the sentence.
- **Changeset**: none.
- **Decisions to tick**: none beyond the wording.
- **Relative to other findings**: none.
