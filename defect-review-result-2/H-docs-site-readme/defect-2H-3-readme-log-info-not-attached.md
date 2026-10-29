# 2H-3: The README's example "logs the orders to the report" with `log.info`, which the `log` fixture does not record on a test's first run, so the passing example attaches nothing

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 108 in [DECISIONS.md](../DECISIONS.md): not adopted, by the maintainer; the README stays as it is
- **Area**: the README, *Example*; the `log` fixture's levels as the README presents them
- **Severity**: Low (the README is the first thing a user reads and the example is copied as written; a user who
  copies it sees no log in the report of a passing test and is not told why, while the site states the rule correctly)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada (a49709d, "README: the example seeds and logs the orders and checks their status")
- **Reviewed**: `d850405`, 2026-10-28T19:11:53+01:00, Opus 5.5, second review, segment 2H

## Contract

- `README.md` line 74–75: "The test receives the page object as a Playwright fixture, seeds the orders and logs them to
  the report, then opens the page:", followed by the test, whose second line is
  `log.info("seeded sessionStorage", { orders });` (line 96).
- `README.md` line 117–118: "`seed` stores entries … and the `log` fixture of `pomwright`'s `test` attaches each entry it
  records to the report."
- The code and the site: `src/fixture/base.fixtures.ts` doc comment, "It records `warn` and `error` on a test's first run
  and every level on a retry"; *Logging to the report*, *Levels*: "The `log` fixture starts at `warn` on a test's first
  run and at `debug` on a retry, so a test that passes stays quiet"; *Page objects in tests*, after its `log.info` line:
  "The `log` fixture records `warn` and `error` entries on a test's first run, and every level on a retry, so this `info`
  entry shows up when the test is retried".

So the README contradicts the site and the code: the site says the same `info` call shows up only on a retry, the README
says it logs to the report.

## Reproduction

The probe is the README's `orders.page.ts` and `orders.spec.ts` test, verbatim, in one spec, with the app served by
`page.route` at `https://shop.example/orders` (a table with a caption "Orders", one row per order from
`sessionStorage.orders`, a Cancel button that sets the status). A control test calls `log.warn` with the same arguments.
The source is `/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/readme/zz-probe-H-readme.spec.ts`.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/readme
W=/home/magdys/workspace/dyhex/POMWright-second-review
cp $P/zz-probe-H-readme.spec.ts $W/test/tests/
cd $W/test && PROBE_MARK_FILE=$P/mark.txt PLAYWRIGHT_JSON_OUTPUT_NAME=$P/report.json \
  pnpm exec playwright test tests/zz-probe-H-readme.spec.ts --project=chromium --reporter=json,line
rm $W/test/tests/zz-probe-H-readme.spec.ts
node -e 'const r=require(process.argv[1]); const w=(s)=>{for(const sp of s.specs??[])for(const t of sp.tests)for(const x of t.results)console.log(JSON.stringify(sp.title),x.status,JSON.stringify(x.attachments.map(a=>a.name)));for(const c of s.suites??[])w(c)}; r.suites.forEach(w)' $P/report.json
```

Exit 1 for the run (the third test, the README's broken variant, fails as the README says it does; see *What is sound* in
`summary.md`). The README's test and the control pass.

## Observed / expected

```text
"a customer cancels an open order" passed []
"control: log.warn" passed ["07:11:26 PM 10/28/2026 - WARN : [TestCase]"]
```

The README's test passes with no log attachment; the same arguments at `warn` give one. Expected, by the README's text:
an attachment with the seeded orders. By the code and the site, none is expected on a first run, so the README's
sentence is what is wrong.

## Cause

a49709d added the seed and the `log.info` line to the README's example, with "logs them to the report", without the
qualification *Page objects in tests* gives the same kind of line.

## Fix plan

- Intended contract: the README shows what the fixture does by default.
- Option A (recommended): log at `warn`, which every attempt records, and keep the sentence: `log.warn(...)` is the
  level *Logging to the report*'s first example uses for a note a passing test should still carry. Cost: one word; the
  example still compiles (`check-doc-snippets.mjs` compiles the README).
- Option B: keep `log.info` and change the sentence to say the entry is attached when the test is retried, as *Page
  objects in tests* does. Cost: the README's one example then shows a line that does nothing in the run it describes.
- Option C: if issue #62 (record every level, attach every level when a test does not go as expected) is adopted, the
  README's line changes meaning again; whichever option is taken now, #62's migration list should name the README.
- Tests: none needed; `docsChains.spec.ts` covers the chain, not the attachment. The probe above can confirm the
  chosen wording.
- Docs: `README.md` lines 74–75 and 96 (and 117–118 if Option B). No changeset (docs only; the README ships in the
  package, so the next release carries it).
