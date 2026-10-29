# 2E-4: *Upgrading from 2.x* does not list that a project whose `locale` is not a BCP 47 tag (`en_US`) now fails every test that uses `log`

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 101 in [DECISIONS.md](../DECISIONS.md) (the upgrade guide: four fixes and the sentence that a project meets only some items); planned in its own docs plan
- **Area**: E19 the fixture's locale check; E40 the pages (inventory-blind.md); *Upgrading from 2.x*, *Reports*
  (inventory-reconciled.md, first only)
- **Severity**: Low (the migration guide misses an item that makes 2.x code fail; the failure is immediate, on the
  first run, and its message names the value and the fix)
- **Semver of the fix**: none (docs only)
- **Pass**: 4
- **First review**: new since 54cdada (`b28686b`, decision #10, which listed *Names in your locale*, *Error messages*
  and the doc comment as the docs to change, not the upgrade page). The first review's E-2 already noted that "a 2.x
  project with `locale: "en_US"` starts failing on upgrade", then from a `RangeError` at teardown
- **Reviewed**: `d850405`, 2026-10-28T17:04:30+01:00, Opus 5.5, second review, segment 2E

## Contract

- `website/src/content/docs/docs/upgrading-from-2x.md:8-10`: "POMWright 3 is a major release. Most of what a 2.x project
  wrote keeps working; this page lists everything that does not, grouped by area."
- Same page, *How to upgrade*, step 4: "Run the suite. What is left fails with a message that names the fix [...]
  Those items are marked **fails at run time**."
- Same page, *Reports*, *Log attachments keep what was logged* (lines 662-673): marked **Compiles**; says the names now
  use Playwright's `locale` and `timezoneId`, where 2.x always wrote `nb-NO`, and nothing about a check.
- Decision #46 (first review): "*Upgrading from 2.x* describes 3.x, and every item that needs a change gives its search".

## Reproduction

The 2.x side: `pomwright@2.1.0` from npm's registry, its `PlaywrightReportLogger.attachLogsToTest(testInfo)` called as
2.1.0's own `log` fixture calls it (`git show v2.1.0:src/fixture/base.fixtures.ts`: no `locale` read), with a project
locale `en_US`. Probe `E/upgrade/v210-attach.cjs` in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/`
(the package is extracted beside it, `E/upgrade/pkg-2.1.0/`):

```sh
cd /home/magdys/workspace/dyhex/POMWright-second-review-probes/E/upgrade
NODE_PATH=/home/magdys/workspace/dyhex/POMWright-second-review/node_modules node v210-attach.cjs   # exit 0
```

```text
2.1.0 with project locale "en_US": attached ["17:04:17 28.10.2026 - WARN : [TestCase]"]
```

(`dist/index.js:148,153` of 2.1.0 format with `"nb-NO"` always.)

The 3.x side, at `d850405`: the first review's E-2 probe re-run in pass 2 (`E/run1/E-2/locale.spec.ts`, chromium,
firefox and webkit, exit 1 by design): with `test.use({ locale: "en_US" })`, every test that requests `log` fails at
setup, on the first run and the retry:

```text
Error: log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"
```

The page: `grep -n "locale\|en_US\|BCP" website/src/content/docs/docs/upgrading-from-2x.md` finds only lines 664-668
(the names now follow `locale`; a fixture of one's own passes it).

## Observed / expected

Observed: a 2.x suite that sets `locale: "en_US"` (Chromium accepts it, and 2.x ignored `locale` for the log) and uses
`log` passes on 2.1.0 and fails every such test on 3.0.2; the upgrade page, which says it lists everything that does
not keep working, marks the logging item **Compiles** and does not mention the check.

Expected: the item, or a new one, marked **fails at run time**, says that the `log` fixture checks `locale` and
`timezoneId` when a test starts and fails a test that uses `log` when either is not a value Node's `Intl` accepts
(`en_US` → `en-US`), with the search for the setting.

## Cause

Decision #10's docs list (*Names in your locale*, `api/errors.md`, the doc comment) left out the upgrade page, and the
later rewrite of the page (`e571381`, decision #46) did not add it.

## Fix plan

- **Intended contract**: *Upgrading from 2.x* lists every change that makes 2.x code fail.
- **Options**:
  1. *(recommended)* Under *Reports*, a sentence in *Log attachments keep what was logged* or a short item of its own,
     marked **fails at run time**: "The `log` fixture checks `locale` and `timezoneId` with Node's `Intl` when a test
     starts. A locale Chromium accepts but that is not a BCP 47 tag, such as `en_US`, fails every test that uses `log`:
     `log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"`. Write it with
     hyphens. Find it with `grep -rn 'locale\|timezoneId' --include=*.ts --exclude-dir=node_modules .`."
  2. Nothing: step 4's general sentence covers it. Leaves the page's "lists everything" untrue.
- **Implementation**: the page only.
- **Tests**: the docs checks (`pnpm typecheck`'s snippet and error-message checks: the message must match
  `api/errors.md`).
- **Docs**: `website/src/content/docs/docs/upgrading-from-2x.md`, *Reports*.
- **Changeset**: none (docs only; the change itself has `log-locale-check.md`).
- **Decisions to tick**: none.
- **Relation**: 2E-1 (the hint for POSIX names): if both are done, the example can stay `en_US`.
