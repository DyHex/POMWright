# Plan: a seed on `about:blank` writes only into the document that inherited the origin (2R-7)

- **Decision**: [123](DECISIONS.md), agreed 2026-10-30 with every recommendation
- **Finding**: [2R-7](R-triage/defect-2R-7-seed-writes-into-an-arrived-document.md) (defect, Medium)
- **Bump**: patch, no new changeset. The write at once on an inherited `about:blank` is unreleased (`52f2d4c`, the
  pending `.changeset/seed-inherited-origin.md`), and *Internal → Seed registry* already promises the behavior this
  restores
- **Stop**: after the commits, a report. The maintainer pushes
- **Depends on**: [PLAN-2R-5-2R-6-retries-under-load.md](PLAN-2R-5-2R-6-retries-under-load.md) (done; `currentUrl`
  and its pauses). It comes before PLAN-2B-locators, which waits for the maintainer's word

## Contract

A `seed` called while the page's URL has no origin writes at once only into a document that inherited the seeded
origin, and it writes into that document. The decision rests on the answering document's own URL, not on the URL
Playwright's client last heard.

1. In its turn, the call takes a handle to the page's document and asks that document for its `self.origin` and
   `location.href`.
2. What the document answers decides what the call does:

   | The document's answer | The call |
   | --- | --- |
   | `location.href` without an origin, and `self.origin` the seeded origin | writes at once, through the same handle, so every key goes to that document |
   | `location.href` on the seeded origin (the document arrived during the call) | fails with the in-flight message `register` already throws: `… the page committed a document on <origin> while seed() was registering, so the app may have started without the entries; …` |
   | any other URL, or another origin | registers, as now |
3. **The document is replaced while it is asked.** The call asks the page's current document for its URL (`currentUrl`,
   decisions 118 and 121). On the seeded origin it fails with the in-flight message; anywhere else it registers.
4. **Any other error of the question** registers the seed, as today's `.catch(() => "null")` does.
5. **The document is replaced during the write.** The write's existing check fails the call with the navigation message.
   It is never silent.
6. **No message changes.** `inFlightError` already exists. The *Internal → Seed registry* promise, "a page that arrives
   while the call waits fails the call", holds again.

## Current behavior (verified 2026-10-30 at `d1ab2a5`)

- `SeedRegistry.add` ([sessionStorageSeed.ts:302](../src/helpers/sessionStorageSeed.ts#L302),
  [line 316](../src/helpers/sessionStorageSeed.ts#L316)): on a page without a URL origin at the call and in the turn,
  it calls `writeOnOrigin`.
- `writeOnOrigin` ([sessionStorage.ts:862-872](../src/helpers/sessionStorage.ts#L862-L872)) asks
  `page.evaluate(() => self.origin)` and then writes with `this.write("seed", …)`. Each runs in whichever document is
  current at that moment: the question can be answered by a document that arrived on the origin, and the write can go
  into a later one.
- The registry's commit watch (`snapshot.committed`) covers `register` only.
- *Internal → Seed registry* says: "A call made away from the origin keeps its commit watch from the call on, so a page
  that arrives while the call waits fails the call, as before."

## The probes

All runs used the packed build, the test server's pages, the runner and `--retries=0`. The prototype is saved as a
patch in the scratchpad and was reverted.

**A prototype of option A:**
- `CallDocument.ask(question)`, which evaluates through the call's handle;
- `write` and `eachKey` taking the call's document;
- `writeOnOrigin`'s no-origin branch as in the contract.

| Run | Today | With the prototype |
| --- | --- | --- |
| the overlay test, Firefox, 16 workers | 5 of 200 failed (4 of 200 at `908c816`) | 600 of 600 |
| the overlay test, Chromium and WebKit, 16 workers, 100 each | 0 of 200 failed (at `908c816`) | 200 of 200 |
| the inherited-popup tests and the unawaited seed, three browsers, 50 each | not run | 1050 of 1050 |
| the deterministic case (below), three browsers, 10 each | 30 of 30 failed: the call resolved and the arrived document's storage held the entry | 30 of 30: the in-flight message, storage empty |
| unit tests | 970 | 970 (the turns test's fake handle answers the question) |

**The deterministic case** wraps Playwright's `page.evaluate` and `page.evaluateHandle` so that the page commits on the
seeded origin (`page.goto(…, { waitUntil: "commit" })`) right before the seed's first evaluation.
- It is a stand-in for the timing only, as the existing "the page commits on the other origin between two calls" tests
  wrap `page.sessionStorage`. The page, the commit and the storage are real.
- It could hide how often real timing lands there, which is what the overlay test shows: about 2.5% of runs on Firefox.
- It shows that every browser writes into the arrived document once the timing lands. The overlay hit it on Firefox
  alone.

## Options

- **A, recommended: ask through the call's document handle, decide by the answering document's URL, write through the
  same handle.**
  - The answer comes from the document that answers, so it does not depend on when Playwright's client hears the
    commit (decision 118's reasoning).
  - The handle pins the write to that document (decision 114's mechanism).
  - It costs nothing: the handle the write takes anyway is taken before the question instead of after.
- **B: consult the registry's commit watch before writing.** That relies on the client hearing the commit before the
  new document answers, which Playwright does not promise (decision 118 rejected the same for the destination). It
  also leaves a commit between the question and the write unseen.
- **C: read `page.url()` again after the question.** It relies on the same order, and leaves the same gap.
- **D: always register on a page without a URL origin.** That reverts `52f2d4c`: an earlier `seed` would again overwrite
  a later `set` when the popup arrives, and Firefox would again fail the test.

## Implementation (one commit, then the record)

1. **The fix (decision 123), with its tests and records.**
   - `sessionStorage.ts`:
     - `CallDocument.ask(question)` evaluates in the document its handle holds, taking the handle first.
     - `write` and `eachKey` take the call's document when the caller already holds one.
     - The no-origin branch of `writeOnOrigin` does what the contract says, and its comment says why.
   - Unit tests, with fake pages standing in for the documents, which their comment says. Each scenario and its
     outcome:
     - a document that answers from the seeded origin fails with the in-flight message and writes nothing;
     - an inherited document gets every key through the one handle, taken once;
     - a document replaced while asked, with the current document on the origin, fails with the in-flight message;
     - a document replaced while asked, with the current document elsewhere, registers;
     - another error of the question registers;
     - a replacement between the question and the write fails with the navigation message.

     The turns test's fake handle answers the question.
   - Harness: the deterministic case in `sessionStorage.spec.ts`, beside *a seed not awaited before the hop …*. Its
     comment names the stand-in and the overlay test, which meets the timing for real.
   - Docs:
     - *Internal → Seed registry*: one sentence saying that the inherited case is decided by the answering document's
       URL, and that the write stays in that document;
     - the doc comment of `writeOnOrigin`.

     No Docs or API page changes: they say the call writes at once on an inherited popup, which stays true.
   - The records: decision 123, 2R-7's status, the ledger.
2. **The execution notes**, and the statuses set to done.

## Tests

- **Unit:** the six cases. Those that a fake can show failing fail on today's code; the inherited write and the other
  error pass both ways, and are there so the change keeps them.
- **Harness**, with `--retries=0`:

  | Test | Shape | Runs | Must |
  | --- | --- | --- | --- |
  | the deterministic case | three browsers | 10 each | pass all (fails 30 of 30 today) |
  | the overlay test | Firefox, 16 workers | 600 | pass all (5 of 200 fail today) |
  | the overlay test | Chromium and WebKit | 100 each | pass all |
  | the inherited-popup tests and the unawaited seed | three browsers | 50 each | pass all |
  | the storage specs | three browsers | once | pass all |

## Docs

*Internal → Seed registry* and the doc comment (step 1).

## Verification

- `pnpm lint`, `pnpm test:unit`, `pnpm docs:build`, `pnpm lint:guide`.
- The full `pnpm test:constrained --reporter=line` and the full `pnpm pack-test --reporter=line`; both must pass.
- The grep for the external consumer projects' names.

## Decisions checklist

Each item has a default, so "agreed" settles them all.

1. [x] Decision 123, option A: ask through the call's document handle, decide by the answering document's URL, and
   write through the same handle. Default: yes.
2. [x] An arrived document fails with the existing in-flight message; no new message. Default: yes.
3. [x] The deterministic harness case, with its stand-in named in its comment. Default: yes.
4. [x] No new changeset (unreleased), and no Docs or API page change; *Internal → Seed registry* gets the sentence.
   Default: yes.

## Execution

Step 1, then step 2, each verified and committed with the trailer. Then a report; anything unexpected is reported with
a recommendation.

## Execution notes

- 2026-10-30. The plan was committed in `5723d6f`, step 1 in `83d483b`, and this record is step 2.
- **Built from the prototype's patch, tidied:**
  - `CallDocument.ask` and `enter` share a private `taken()`, which takes the handle once;
  - `write` and `eachKey` take the call's document as `held`;
  - the write-at-once path has a comment in place of the prototype's marker.
- **Unit:** five tests in `storageTurns.test.ts` cover the plan's six cases (the document replaced while asked is one test
  with both outcomes). Four failed on the code before the change; the inherited write passes both ways, as intended.
  The other error of the question fails on the old code only because the fake raises it through the handle, which the
  old code did not use. The fake page gained the document's own URL, hooks around the question, `addInitScript` and an
  answer to the Navigation API check. 980 unit tests.
- **Harness** (the packed build, `--retries=0`):

  | Run | Result |
  | --- | --- |
  | the storage specs, three browsers, with the new deterministic case | 360 passed, 3 skipped; error messages unchanged |
  | the deterministic case, three browsers, 10 each | 30 of 30 (30 of 30 failed before) |
  | the overlay test, Firefox, 16 workers | 600 of 600 (5 of 200 failed before) |
  | the overlay test, Chromium and WebKit, 100 each | 200 of 200 |
  | the inherited-popup tests and the unawaited seed, three browsers, 50 each | 1050 of 1050 |

- **Full runs:**
  - `pnpm test:constrained --reporter=line`: 1845 passed and 3 skipped in 275 s; 980 unit; 33 step locations; 27
    test-server tests.
  - `pnpm pack-test --reporter=line` at rest: 1845 passed and 3 skipped in 149 s.
  - `pnpm lint`, `pnpm docs:build` and `pnpm lint:guide` pass, and no name of the external consumer projects appears on
    the branch.
- Nothing unexpected.
