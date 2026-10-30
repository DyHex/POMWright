# 2E-1: For a POSIX locale name such as `en_US.UTF-8`, the locale check's hint names a value the same check rejects

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 94 in [DECISIONS.md](../DECISIONS.md) (the codeset dropped, no hint for a modifier); planned in the steps and logging plan; done 2026-10-30 in `dad687e`
- **Area**: E12 `checkDateFormat`; E19 the fixture's locale check; E26 messages (inventory-blind.md)
- **Severity**: Low (a misleading message on an uncommon input: the fix it names fails the same way; nothing is lost and
  the test fails either way)
- **Semver of the fix**: patch (the message is brought in line with what *Error messages* promises, "what to change"; no
  accepted input or type changes)
- **Pass**: 1
- **First review**: new since 54cdada (`b28686b`, which added the check and its hint)
- **Reviewed**: `d850405`, 2026-10-28T16:53:37+01:00, Opus 5.5, second review, segment 2E

## Contract

- `website/src/content/docs/api/errors.md`, intro: "Every message POMWright throws, by the call that throws it, with
  what it means and what to change." Its *Logging* section: "write the tag with hyphens".
- `src/helpers/playwrightReportLogger.ts:349-352` builds the hint: an underscore locale gets
  `; write it with hyphens, such as <the value with every "_" replaced by "-">`.
- The same function serves the `log` fixture at setup (`src/fixture/base.fixtures.ts:37`) and `attachLogsToTest`
  (`playwrightReportLogger.ts:298`).

## Reproduction

Through the public `attachLogsToTest`, with Node and the built package: `E/2E-1/check-hint.mjs` in the probes folder
(`/home/magdys/workspace/dyhex/POMWright-second-review-probes/E/2E-1/`). It calls `attachLogsToTest` with several
underscore locales, then with the value each hint names, and exits 1 when a hinted value is rejected.

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/E/2E-1/check-hint.mjs   # exit 1
```

Through the `log` fixture: `E/2E-1/zz-probe-E-2E-1.spec.ts`, copied to `test/tests/`, run from the worktree root with
`pnpm -C test exec playwright test tests/zz-probe-E-2E-1.spec.ts --project=chromium --workers=1 --reporter=line`, then
deleted (exit 1, both tests fail; output in `E/2E-1/fixture-run.txt`):

```ts
import { test } from "pomwright";

for (const locale of ["en_US.UTF-8", "en-US.UTF-8"]) {
  test.describe(`locale ${JSON.stringify(locale)}`, () => {
    test.use({ locale });
    test("requests log", async ({ log }) => {
      log.warn("x");
    });
  });
}
```

The same result on Node 20.20.2 and 24.22.0 (`E/locale/locale-hints.mjs`).

## Observed / expected

```text
"en_US.UTF-8": attachLogsToTest: locale "en_US.UTF-8" is not a BCP 47 language tag; write it with hyphens, such as "en-US.UTF-8"
  -> HINT REJECTED ("en-US.UTF-8": attachLogsToTest: locale "en-US.UTF-8" is not a BCP 47 language tag)
"nb_NO.utf8": … such as "nb-NO.utf8"
  -> HINT REJECTED ("nb-NO.utf8": attachLogsToTest: locale "nb-NO.utf8" is not a BCP 47 language tag)
"de_DE@euro": … such as "de-DE@euro"
  -> HINT REJECTED ("de-DE@euro": attachLogsToTest: locale "de-DE@euro" is not a BCP 47 language tag)
```

The fixture:

```text
ERROR: Error: log fixture: locale "en_US.UTF-8" is not a BCP 47 language tag; write it with hyphens, such as "en-US.UTF-8"
ERROR: Error: log fixture: locale "en-US.UTF-8" is not a BCP 47 language tag
```

`en_US` and `zh_Hant_TW` get hints that are accepted (`en-US`, `zh-Hant-TW`). Expected: a hint names a value the check
accepts (`en-US` for `en_US.UTF-8`), or no hint. A POSIX locale name (`language_TERRITORY.codeset@modifier`) is the
form of `LANG` and `LC_ALL`, the likeliest source of an underscore locale in a config (`locale: process.env.LANG`).

## Cause

`playwrightReportLogger.ts:349-351`: the hint is `checkedLocale.replaceAll("_", "-")`, never checked, so the codeset
(`.UTF-8`) and modifier (`@euro`) of a POSIX name stay in it.

## Fix plan

- **Intended contract**: a hint, when given, names a locale the check accepts.
- **Options**:
  1. *(recommended)* Derive the suggestion from the POSIX name's language and territory (drop `.codeset` and
     `@modifier`, hyphenate), and give the hint only when that passes `Intl.getCanonicalLocales`. `en_US.UTF-8` gets
     `such as "en-US"`; the `en_US` message is unchanged. Breaks nothing.
  2. Give the hint only when the plain hyphenation passes; `en_US.UTF-8` gets no hint. Smaller, less helpful.
- **Implementation**: `src/helpers/playwrightReportLogger.ts`, `checkDateFormat`, plus two private helpers
  (`isLanguageTag`, `hyphenated`). A source sketch is proposed: `E/sketch/2E-1.diff` and `E/sketch/2E-1.run.sh` (the run
  exits 1 at `d850405` through `check-hint.mjs`, 0 with the sketch).
- **Tests**: `src/helpers/playwrightReportLogger.test.ts`, *the locale and the time zone*: `en_US.UTF-8`, `nb_NO.utf8`
  and `de_DE@euro` give a hint whose value `checkDateFormat` accepts. No harness change needed.
- **Docs**: none required (the documented `en_US` message is unchanged); `api/errors.md` *Logging* may add "a POSIX name
  such as `en_US.UTF-8` is hinted as its tag, `en-US`".
- **Changeset**: patch, "The locale check's hint for a POSIX locale name such as `en_US.UTF-8` names its BCP 47 tag,
  `en-US`, instead of `en-US.UTF-8`, which the check rejects too."
- **Decisions to tick**: none.
- **Relation**: same function as the first review's locale-check plan (`b28686b`); no other finding touches it.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium (`tests/logging`, `tests/step`); then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/E/sketch/2E-1.gate.out`.

- At `d850405`: `2E-1.run.sh` exit 1 (`check-hint.mjs`: the hints for `en_US.UTF-8`, `nb_NO.utf8` and `de_DE@euro` name values the check rejects; `en_US` and `zh_Hant_TW` are hinted correctly). With the sketch: exit 0 (every hint accepted: `en-US`, `zh-Hant-TW`, `en-US`, `nb-NO`, `de-DE`; the logger's unit tests 36 passed; `logging.spec.ts` on chromium 12 passed). Unit tests 904 passed; the area's specs on chromium 22 passed.
- **Verdict: approved; a narrow fix suffices.**
