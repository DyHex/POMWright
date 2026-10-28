# 2H-8: *Upgrading from 2.x* does not say that a project `locale` Playwright accepts but `Intl` rejects (`"en_US"`) now fails every test that requests `log`; 2.x's fixture never read the locale

- **Kind**: documentation
- **Area**: *Upgrading from 2.x*, *Reports → Log attachments keep what was logged* (the page's completeness), against
  *Logging to the report*, *Names in your locale*
- **Severity**: Low (a configuration Playwright accepts in Chromium; on upgrade every test that requests `log` fails at
  its start, with a message that names the fix, but the page that promises every change a 2.x project meets marks the
  item **Compiles** and says nothing of a failure)
- **Semver of the fix**: none (docs only)
- **Pass**: 4
- **First review**: missed by the first review. The failure exists since 3.0.0, as a `RangeError` at teardown once
  something was logged (the changeset `log-locale-check.md` says so; not re-run on 3.0.1 here); b28686b (after 54cdada)
  moved the check to the test's start with the message below. The page's item is from before 54cdada.
- **Reviewed**: `d850405`, 2026-10-28T19:40:35+01:00, Opus 5.5, second review, segment 2H

## Contract

- *Upgrading from 2.x*: "this page lists everything that does not [keep working]"; step 4: "Run the suite. What is left
  fails with a message that names the fix … Those items are marked **fails at run time**."
- The item, lines 662–673, marked **Compiles.**: "Attachment names use Playwright's `locale` and `timezoneId`, where 2.x
  always wrote them in `nb-NO`. … POMWright's `log` fixture passes the test's `locale` and `timezoneId`." Nothing about
  a value the fixture rejects.
- *Logging to the report*, lines 85–90, states the rule: "Playwright passes `locale` to the browser unchecked, and an
  underscore form works in Chromium only, so with `locale: "en_US"` a test that uses `log` fails at once".
- 2.x: `git show v2.1.0:src/fixture/base.fixtures.ts` uses neither `locale` nor `timezoneId` (the names are formatted
  with `nb-NO` in `playwrightReportLogger.ts`), so the same project ran with `log` on 2.x.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/locale/zz-probe-H-locale.spec.ts`: three tests with
`use({ locale: "en_US" })`: Playwright's `test` alone, POMWright's `test` without `log`, POMWright's `test` with `log`.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/locale
W=/home/magdys/workspace/dyhex/POMWright-second-review
cp $P/zz-probe-H-locale.spec.ts $W/test/tests/
cd $W/test && PROBE_OUT=$P/out.txt pnpm exec playwright test tests/zz-probe-H-locale.spec.ts --project=chromium --reporter=line
rm $W/test/tests/zz-probe-H-locale.spec.ts
```

Exit 1: one of three fails.

## Observed / expected

```text
playwright alone: navigator.language=en-US
pomwright test without log: body ran
  1) [chromium] › tests/zz-probe-H-locale.spec.ts:28:7 › POMWright's test, log requested › with the log fixture
    Error: log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"
```

Chromium accepts the locale and the plain test passes; the test that requests `log` fails before its body. On 2.x the
same test passed. Expected: the upgrade page names this case, as *Logging to the report* does, so a 2.x project with
such a locale knows before its suite fails.

## Cause

The item was written for the attachment names; the fixture's check (b28686b, and the `RangeError` before it) was
documented on *Logging to the report* and in its changeset only.

## Fix plan

- Add to *Log attachments keep what was logged*, and mark the item "**Compiles**; **fails at run time** with a locale
  `Intl` rejects": "The fixture checks both values when the test starts: a `locale` that is not a BCP 47 tag, such as
  `en_US`, which Chromium accepts, fails every test that requests `log`. Write it with hyphens (`en-US`)." With a search:
  `grep -rnE "locale: *['\"][a-z]{2}_" --include=*.ts --exclude-dir=node_modules .`, and a link to
  [Names in your locale](/POMWright/docs/logging/#names-in-your-locale).
- Tests: none. No changeset (docs only).
- Sits with 2H-5 (the page's other completeness gaps); one pass over the page fixes both.
