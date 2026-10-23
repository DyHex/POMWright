# Decisions — 3.0.2

Decisions in force, each with date and reason. A reversed decision is replaced. Open questions are at the bottom.

1. **2026-10-22. The release is a patch, 3.0.2.** None of the defects found so far needs more (the user's assessment).
2. **2026-10-22. One branch, `fix/review-3.0.2`, for all of it.** The defects, the README and docs work, and the
   confirmed findings of the two reviews. Not one branch per fix.
3. **2026-10-22. One commit per defect or fix**, carrying its code, tests, docs and changeset.
4. **2026-10-22. Two independent reviews** (Opus 5.5 and Codex 6 Astra) of the 3.0.1 repository, with
   [REVIEW-PROMPT.md](REVIEW-PROMPT.md). Their findings are reported in this session and triaged here: reproduced,
   then confirmed, rejected or raised as a design question. Every confirmed one records its bump.

5. **2026-10-22. Findings that need a minor are fixed on this branch.** The release then becomes 3.1.0, and the branch
   and this folder are renamed to match.
6. **2026-10-22. Findings that need a major are recorded and deferred.** `AGENTS.md` section 6, rule 6: breaking changes
   ride one major. Before the merge they move into `AGENTS.md` section 7, the work left for later.
7. **2026-10-22. This folder stays uncommitted**, as `release-3.0.1/` did.
8. **2026-10-22. The reviews run one at a time**, each in its own worktree at `v3.0.1`, so each one's findings are
   judged on their own and the two never share the harness server.
9. **2026-10-22. PLAN-D1, option B**: every `SessionStorage` call for one origin takes its turn, in call order.
10. **2026-10-22. PLAN-D4, option A**: a skipped segment is never changed by `update`, `replace`, `filter`, `nth` or
    `clearSteps`; the skip check for `update` and `replace` also runs when the change is applied.
11. **2026-10-22. Plans for confirmed reviewer findings are agreed in batches.**

12. **2026-10-22. Intake of both reviews.** 33 reviewer findings (19 from Opus, 14 from Codex) triaged and reproduced;
    12 new defects (D5–D16), two docs plans (R2, R3), 7 duplicates of D1–D4 and of each other, 1 rejected (opus-S2),
    1 not reproduced (codex-S1), 1 already listed for later (codex-Q1), 2 design questions (below). Nothing found needs a major. See the intake table in [PLANS.md](PLANS.md).

13. **2026-10-22. PLAN-D1: the chain lives in an internal per-page turns helper**, keyed by the Playwright `Page`, not
    exported and not part of `PageObject`; every helper on a page shares it.
14. **2026-10-22. PLAN-D3, option A**: the check resolves the path and compares origins; the message names the known
    causes (a second `/` or a `\` after the first `/`, also with a tab or line break between them).
15. **2026-10-22. PLAN-D5: step locations get an automated check**, a reporter in the harness.
16. **2026-10-22. PLAN-D11: keep the rule, fix the message.** The error names the call that ended the registration and
    gives both fixes (a path, or a locator resolved before `add(…)`); the docs show the three ways to filter by
    another locator. opus-Q1 (narrowing the rule) is not adopted.
17. **2026-10-22. opus-Q2: no change to `nth`.** It behaves exactly as Playwright's `locator.nth` (probed).

18. **2026-10-22. Agreed as planned**: D4, D5 (an `async` wrapper for boxed steps; the syntax for users unchanged),
    D6, D7, D9 (option A: `|` and `%7C` compare equal for a string path; B, `decodeURI`, equates far more than the
    browser difference), D10 (throw, as Playwright's `page.goto` does), D13, D14 (option A; the benchmarks are rerun
    after every code change), D15, D16, R2 items 1–4 and 6–8 (D12 as its own commit), R3.
19. **2026-10-22. PLAN-D8, option B** for 3.0.2. Option C (the schema written once) becomes a GitHub issue for the next
    major.
20. **2026-10-22. PLAN-R2 item 5: mirror Playwright** (option B), executed as D17, a patch. Option C (a page-object
    option to treat an empty `?` or `#` as the same page) becomes a GitHub issue.
21. **2026-10-22. Work for later is tracked as GitHub issues**, not in `AGENTS.md` section 7, which gets one
    instruction to read them (PLAN-R3, item 7). Drafts in [ISSUES.md](ISSUES.md).
22. **2026-10-22. PLAN-R1**: the outline and the orders page; the README keeps the 2.x docs link and adds the
    1.x-to-2.x migration guide, both at the `v2.1.0` tag.

23. **2026-10-22. PLAN-D2, option A+**: a null-prototype object in `encodeEntries`, and pairs for the trip to the
    browser.
24. **2026-10-22. PLAN-D9: the sweep runs first**, on all three browsers, and option A covers every difference it
    finds.
25. **2026-10-22. The user creates the GitHub issues by hand**, from one file per issue in [issues/](issues/).
26. **2026-10-22. Execution**: the plans one after the other, in the order of [PLANS.md](PLANS.md); a plan that meets
    something unforeseen, or needs the user, is skipped, updated with the case, and asked about at the end. Commits
    carry no co-author line.
27. **2026-10-23. PLAN-T runs before the merge**, on all of T1–T16 and on all three browsers. A candidate it confirms
    is fixed in 3.0.2 with its own plan and commit; one whose fix needs a major becomes a GitHub issue labelled
    `backlog` and `breaking`.

28. **2026-10-23. PLAN-T, T9: an export that a written promise already requires, added as a fix, is a patch.**
    `AGENTS.md` section 5 promises that every public method returns a type a consumer can import from the root, so
    exporting those types keeps the promise; they are type-only. The release stays 3.0.2. The only exports added are
    what the promise needs, plus the option types (`PageObjectOptions` is already exported).
29. **2026-10-23. PLAN-T, T15: a decode error keeps the whole value, after the reason (A+).** Test data is what a
    reader of a failure needs; a secret in a test environment is the user's call, as it is with Playwright's own
    messages. The message gains the codec's reason and the value's length, and quotes the value with
    `JSON.stringify` so an empty or whitespace value is visible; the value stays last.
30. **2026-10-23. A type corrected to what the docs promise and the runtime does is a patch**, even when code that
    relied on the wrong type stops compiling; a type change that removes documented behaviour stays a major. First
    use, PLAN-T T8 (D25): for a key typed `string`, `get`, `set` and `seed` take and return `string`, any declared
    codec's type, or `null` (`get`), as the API page promises ("a declared key as its codec's type"); with no codecs, or
    only string codecs, nothing changes. 3.x is used by the user's team only; the team checks its code for
    non-literal keys before the release, and the changeset carries the migration hint (pass a literal, type the key as
    the schema's keys, or narrow the value).
31. **2026-10-23. PLAN-D18-D19-D28, D18 narrowed to what holds across browser versions.** The script tests
    `self.origin` (an error page's origin is opaque) and reports a skip, and a seed that the document arriving at its
    origin does not write fails the test at the `seed` line. Making the retry after a failed navigation apply the seed
    rests on browser behaviour without a guarantee, so it is not attempted (decision 34: not filed as an issue either).
    D30 stays: its fix is one line and verified on every browser.
32. **2026-10-23. The other plans for D18–D32 are agreed as recommended**: PLAN-D20-D29 (a), PLAN-D21-D23-D27,
    PLAN-D22 (A), PLAN-D24 (A, no entries do nothing), PLAN-D25-D26 (four exports), PLAN-D30 (A), PLAN-D31-D32 (a, and
    A+). The execution order is in [PLANS.md](PLANS.md).

33. **2026-10-23. A fix enforces a contract; it never adds a capability that keeps a test going.** D18's docs state that
    a navigation to a seeded origin that fails fails the test, with no retry recipe (step 1 found none that works on
    every browser). D21 keeps only the origin check; `seed` is not taught about an inherited `about:blank` origin, and a
    seed lost there fails the test through D18's backstop.

34. **2026-10-23. Issue 08 is not filed.** Making a retry after a failed navigation apply a seed stays out of
    POMWright (decision 33); the draft in [issues/08-seed-after-failed-navigation.md](issues/08-seed-after-failed-navigation.md)
    records why. The versioning rules of decisions 28 and 30 and the rule of decision 33 move into `AGENTS.md` (section 6,
    rule 7).

## Open questions

None.
