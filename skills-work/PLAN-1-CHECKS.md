# PLAN-1-CHECKS: the checks every skill runs under

Status: **agreed 2026-11-10** (A-E as recommended; DECISIONS.md K1-K6). Executing. Implements decision S7 (and the guide part of S6) of
[DECISIONS.md](DECISIONS.md) before any skill content is written, so every later plan runs under the checks.

## Intended contract

1. Every TypeScript block in a skill's Markdown compiles, as written, against the packed build, in the same run as the
   site's examples.
2. Every locator chain a skill shows (as Playwright renders it) is rebuilt through the packed build by a spec, and the
   spec fails when a skill shows a rendered chain it does not rebuild.
3. A lint fails when a skill breaks the format rules: its frontmatter, its file sizes, a missing table of contents, a
   reference that is not one level deep, a relative link or a site URL that does not resolve.
4. `skills/AGENTS.md` states how skills are written and changed; the guide's other files point to it where a change
   starts.

## Verified current behavior (7aebcb1)

- **The snippet check** ([scripts/check-doc-snippets.mjs](../scripts/check-doc-snippets.mjs)) compiles every `ts`
  block of `website/src/content/docs` and the README, one project per page, in `test/.doc-snippets/` (L81-124):
  `title="x.ts"` makes a block a file the page's other blocks import (L108-115); the docs' example app,
  `website/snippets/`, is copied into every page's project unless a block has its title (L118-123); `nocheck` is
  allowed only on *Upgrading from 2.x* (L38, L98-106); a block in a `~~~` fence or labeled otherwise than `ts` fails it
  (L86-97). It runs in `pnpm typecheck` ([package.json](../package.json) L50), so in `pack-test` and every harness
  job, and in CI's `site` job ("Compile the documentation's examples",
  [checks.yaml](../.github/workflows/checks.yaml) L336). `test/.doc-snippets/` is gitignored ([.gitignore](../.gitignore) L53-55).
- **The chain spec** ([test/tests/docs/docsChains.spec.ts](../test/tests/docs/docsChains.spec.ts), 883 lines) has one
  test per page, named after the page's path under `website/src/content/docs` or `README.md` (L78-88 read the page by
  that title); each comparison records what the page must show, and `afterEach` fails when the page does not show it
  (L78-88). It does not detect a chain a page shows that no test compares: that completeness is kept by review.
- **The guide's link check** ([scripts/check-guide-links.mjs](../scripts/check-guide-links.mjs)) checks every relative
  link and anchor of every `AGENTS.md` and `docs/*.md` (L15-27); it does not check site URLs. It runs as
  `pnpm lint:guide` in CI's `lint` job (checks.yaml L72-74). A new `skills/AGENTS.md` is covered without a change.
- **Site URLs** are checked only in the declarations, by
  [scripts/check-api-coverage.mjs](../scripts/check-api-coverage.mjs) (L14-17, L207-242: a URL under
  `https://dyhex.github.io/POMWright/` must name a page of `website/src/content/docs` and, with an anchor, one of its
  headings, slugged as the site slugs them).
- **`skills/defect-review/SKILL.md` today**: 358 lines, a description of 818 characters, no `agents/openai.yaml`, no
  `disable-model-invocation`, no table of contents. Under the lint below it would fail the line limit and the
  user-invoked rule (R1) until PLAN-DEFECT-REVIEW rewrites it.

## Options and recommendations

### A. Compiling skill examples

Extend `check-doc-snippets.mjs` to `skills/**/*.md`: each Markdown file is one project under
`test/.doc-snippets/skills/…`, with the same block rules, and three differences, because an agent reads a skill's raw
Markdown, where nothing is hidden:

- **No `// ---cut---`** in a skill: a hidden prelude does not exist for an agent, which would copy the marker into user
  code. Setup lines are written out (`import type { Page } from "@playwright/test";`, a `declare const page: Page;`
  only where a fragment needs one).
- **No `nocheck`** in a skill.
- **No shared example app** copied in: a skill file's examples stand alone, or import files titled in the same file.
- **Double quotes in code**, as the repository's code is formatted, so a single-quoted `getByRole('…'` in a skill is
  always Playwright's rendering, which B's completeness sweep relies on; the snippet check rejects a single-quoted
  locator call inside a `ts` block of a skill.

Also compiled: every `.ts` file under `skills/*/assets/` (PLAN-2's templates), one project per skill.

- [x] **A.** As above.

### B. Rebuilding the chains a skill shows

- **B1 (recommended).** A spec of its own, `test/tests/docs/skillsChains.spec.ts`, one test per skill file (named by
  its path from the root, `skills/pomwright/references/registering.md`), with the helpers both specs use moved into
  `test/tests/docs/chains.ts` in a first, behavior-preserving commit. Plus a completeness check the site lacks: after
  each test, every Playwright rendering in the file (a line in a `text` block or a `//` comment that matches
  `/\b(?:locator|getBy[A-Z]\w*|frameLocator)\('/`) must have been compared, so a skill cannot show a chain no test
  rebuilds. A skill file with renderings and no test fails a sweep test that lists the skill files.
- B2. Add skill tests to `docsChains.spec.ts` (one file, growing past 1,000 lines; no completeness check).

- [x] **B.** B1.

### C. The skills lint

A script of our own, `scripts/check-skills.mjs`, `pnpm lint:skills`, in CI's `lint` job, no new dependency (a
frontmatter reader for the subset the skills use, which fails on anything else):

1. **Frontmatter**: `skills/<folder>/SKILL.md` starts with frontmatter; `name` 1-64 characters of `a-z`, `0-9` and
   `-`, no leading, trailing or double hyphen, equal to the folder; `description` 1-1,024 characters (folded), no `<`
   or `>`; `compatibility` at most 500 characters; only the portable keys (`name`, `description`, `license`,
   `compatibility`, `metadata`) except on the user-invoked skills (S4: `pomwright-teach`, `defect-review`), which also
   take `disable-model-invocation: true` and `argument-hint` and must have `agents/openai.yaml` with
   `allow_implicit_invocation: false`.
2. **Sizes** (S1, R3): `SKILL.md` at most 250 lines in the POMWright skills and 300 in `defect-review`; every other
   Markdown file at most 300; a file over 100 lines opens with a contents list linking its `##` headings.
3. **One level deep**: every Markdown file in a skill folder is linked from its `SKILL.md`, and no other file links
   on to a further Markdown file of the skill (a link back to `SKILL.md` aside).
4. **Links**: every relative link and anchor resolves (by extending `check-guide-links.mjs` to `skills/**/*.md`, whose
   slug rules are GitHub's, the same as an agent's file view); every `https://dyhex.github.io/POMWright/…` URL names a
   page and heading of the site (the rule of `check-api-coverage.mjs`, its slug function moved to a module both scripts
   import, in its own behavior-preserving commit).

Until PLAN-DEFECT-REVIEW, `defect-review` is listed in the script as exempt from the size, contents and user-invoked
rules, with that plan named as the reason; PLAN-DEFECT-REVIEW removes the exemption.

- [x] **C.** As above.

### D. The guide

- `skills/AGENTS.md` (new): what the folder holds; how a skill is written (the decisions S1-S8, R1, C1-C8 as rules,
  without restating the skills); the example rules of A and B; the frontmatter and size rules of C; that a skill states
  a rule briefly and links its site page, and sends the agent to the installed declarations for exact signatures (S3);
  the commands; where evals live (not in the repository, as [docs/repository.md](../docs/repository.md) says today).
- The root `AGENTS.md`'s index gains its row ("Read it first when: changing a skill"); `docs/repository.md`'s
  `skills/` row says what the folder holds now and names the checks.
- The trigger rule (S6), where changes start: `src/AGENTS.md` (*Rules held elsewhere*) and `website/AGENTS.md`
  (*Rules*): a change to anything a skill describes updates the skill in the same plan, as it updates the pages.
- The site's pages that describe the checks change with them, by website/AGENTS.md's rule: *Internal → Tests and
  checks* and *Internal → Documentation* (the jobs and what each runs).

- [x] **D.** As above.

### E. Testing the checks

The repository's check scripts have no tests of their own (only `release-check.sh` has one). Each new rule is probed
during execution by breaking it once in a scratch skill and recording the failure in this plan's execution notes,
then removing the scratch skill.

- [x] **E.** As above, and no permanent test for the lint, as for the other check scripts.

## Execution order (one commit per step, P1)

1. Refactor (no behavior change): move the chain spec's helpers to `test/tests/docs/chains.ts`; move the site-URL slug
   rule to a shared module. `pnpm pack-test --project=chromium tests/docs/` and `pnpm typecheck` stay green.
2. The snippet check over `skills/**` (A), with a scratch skill proving each rule; scratch removed.
3. `skillsChains.spec.ts` with the completeness sweep (B1), proven the same way.
4. `scripts/check-skills.mjs` and `check-guide-links.mjs` over skills (C), `pnpm lint:skills`, the `lint` job step;
   `defect-review`'s exemption.
5. The guide (D) and the two Internal pages.
6. Full run: `pnpm lint`, `pnpm lint:guide`, `pnpm lint:skills`, `pnpm lint:workflows`, `pnpm test` (unit + pack-test,
   three browsers), `pnpm docs:build`; exit codes recorded here.

No changeset: nothing published changes. The Internal pages change with the mechanism.

## Execution notes

### Step 1 (done 2026-11-10, f82eff0): refactor, behavior preserving

- `scripts/site-pages.mjs` (new module): `contentDir`, `siteUrl`, `slugOf`, `headingsOf`, `anchorsOf`, `siteUrlsIn`,
  `siteUrlProblem`; `check-api-coverage.mjs` imports them. Proof: the old and the new script on the packed
  declarations print the same line (`api coverage: 40 exports, 108 members, 134 site links, 0 problems`, exit 0); on a
  copy with a planted bad page URL and a bad anchor (kept in a gitignored folder inside the repo so `@playwright/test`
  resolves; a copy in the scratchpad could not resolve it and stopped earlier), both print the same output, exit 1,
  with `no page for …/docs/no-such-page/` and `no heading for …/docs/queries/#no-such-heading`.
- `test/tests/docs/chains.ts` (new): the helpers and the page check, the check as `checkThatPagesShow(fileOf)`, which
  a spec calls so the hooks register in that spec (hooks in a shared module would register only for the first spec a
  worker loads). `docsChains.spec.ts` imports them. Proof: `pnpm pack-test --project=chromium tests/docs/
  --reporter=line`, exit 0: 19 passed (one test per page), with every typecheck step green (`doc snippets: 227
  checked, 12 skipped`, `api coverage: … 0 problems`, `error messages: …`, `playwright retries: …`). The page check
  still fails: `descriptions.md` edited to show `'Submitted'` -> `docs/descriptions.md shows "getByRole('button', {
  name: 'Submit' })"`, 1 failed; edit reverted. Chromium only: the change moves TypeScript between files, and a chain
  depends on the Playwright version, not the browser; CI on `main` runs all three.
- Guide: `test/AGENTS.md` names `chains.ts`; `docs/repository.md` names `site-pages.mjs`. `pnpm lint` exit 0,
  `pnpm lint:guide` exit 0 (80 links in 10 files).

### Step 2 (done 2026-11-10): the snippet check over `skills/**`

- `check-doc-snippets.mjs`: skill Markdown files are pages (rel = path from the root), no shared example app; rejects
  `// ---cut---`, `nocheck`, and a single-quoted locator call in code (line comments excluded, since a comment may show
  a rendering); compiles `skills/<skill>/assets/**/*.ts` at their paths. Output line now reports skill blocks and
  template files.
- Proof with a scratch skill `skills/zz-scratch-probe` (removed): a titled block imported by another compiled; a
  comment `// locator('main')…` inside a valid block was first rejected, which showed the rule must skip line comments
  (fixed, `withoutLineComments`); then exit 1 with exactly the three rejections (cut at SKILL.md:28, nocheck at :36,
  single quote at :42) and two type errors mapped to `skills/zz-scratch-probe/SKILL.md:52:7` and
  `skills/zz-scratch-probe/assets/main.ts:4:14`; the template importing `./lib/helper` resolved. After removal: exit 0,
  `227 checked (0 in skills), 12 skipped (nocheck), … skill templates: 0 files; doc comments' examples: 96 checked`,
  the site's counts unchanged.
- Docs: `website/AGENTS.md`, `test/AGENTS.md`, `docs/repository.md`, *Internal → Documentation*, *Internal → Tests and
  checks* describe it (done in this step rather than step 5, so each commit describes what it ships). `pnpm lint` 0,
  `pnpm lint:guide` 0, `pnpm docs:build` 0 (53 pages; its `i18n` collection warning is not from this change).

### Step 3 (done 2026-11-10): `skillsChains.spec.ts`

- `chains.ts`: `recordedOnPage()` (a copy of what the test recorded) and `checkThatPagesShow(fileOf)` where `fileOf`
  may return undefined for a test named after no file (the sweep). `docsChains.spec.ts` unchanged in behavior.
- `skillsChains.spec.ts`: one test per skill file through `skillTest(file, body)` (registers the file as tested); an
  `afterEach` that fails when a rendering in the file (flattened as the page check reads it) lies outside every value
  the test compared; the sweep test "every skill file that shows a rendering has a test". `RENDERING` (global, for
  `matchAll`) and `HAS_RENDERING` (no flag: a global RegExp's `test()` keeps `lastIndex` between files) are separate.
  `skillTest` carries a justified `biome-ignore` (unused until the first skill shows a chain; PLAN-2 removes it).
- Proof (Chromium, scratch skill `skills/zz-scratch-probe` with a nested rendering in a code comment and a standalone one
  in running text; removed): no test -> the sweep fails listing the file; a test comparing only the nested chain ->
  `renderings no comparison of this test covers` with `getByRole('button', { name: 'Save' })` (the running-text one);
  comparing both -> 2 passed; restored -> 1 passed. Then `tests/docs/` on Chromium: 20 passed; `tsc --noEmit -p test`
  0; `pnpm lint` 0; `pnpm lint:guide` 0; `pnpm docs:build` 0.

### Step 4 (done 2026-11-10, 3aed766): the skills lint

- `scripts/check-skills.mjs`, `pnpm lint:skills`, a step of CI's `lint` job after the guide's links. Rules as in C, plus
  one found while writing it: a relative link must stay inside its skill's folder (a skill is installed alone; S2).
  The frontmatter reader takes the subset the skills use and reports any other line. `defect-review` is exempt from the
  size and invocation rules, the reason printed on every run.
- `check-guide-links.mjs` also reads every Markdown file under `skills/` (de-duplicated, since `skills/AGENTS.md` is
  found both ways): 11 files, 80 links.
- Proof with scratch skills (all removed): one run reported all 16 planted problems, one per rule (unsupported
  frontmatter line, a key only user-invoked skills take, name not the folder's, `<` in the description, 260 > 250
  lines, a 120-line reference missing its contents list for its two `##` headings while a `##` inside a fence was
  ignored, a link out of the skill, a reference linking another, an orphan reference, a 1,100-character description, a
  520-character compatibility, a folder without SKILL.md, a site URL with no page and one with no heading, and a
  user-invoked `pomwright-teach` without its setup, twice). A second run: `zz-Bad` failed the name rule, and a
  `pomwright-teach` with `disable-model-invocation: true`, `argument-hint`, `metadata` and `agents/openai.yaml` passed.
  Clean: `skills: 1 checked, all pass; defect-review exempt …`.
- `pnpm lint` 0, `pnpm lint:guide` 0, `pnpm lint:skills` 0, `pnpm lint:workflows` 0 (actionlint over the changed
  `checks.yaml`), `pnpm docs:build` 0. The `lint` job is skipped in `Daily` (`if: inputs.release == ''`), so the new
  step does not meet a release tree without the script.
- The root `AGENTS.md`'s link to `skills/AGENTS.md` waits for step 5, which creates the file.

### Step 5 (done 2026-11-10): the guide

- `skills/AGENTS.md` (82 lines): files; who reads a skill (one home per fact, installed declarations for exact
  signatures, the split, versions, mirror Playwright, lead by example, conventions C1-C6); format; examples and
  chains; changing a skill; do not. The root `AGENTS.md`: seven folders, the index row, the commands line links it.
  `docs/repository.md`: seven folders, the `skills/` row rewritten (format, checks). The trigger rule in
  `src/AGENTS.md` (*Rules held elsewhere*) and `website/AGENTS.md` (*Rules*). The Internal pages were updated in steps 2-4
  with their mechanisms; *Internal* index mentions the guide generically and stays accurate.
- `pnpm lint:guide` 0 (88 links in 12 files), `pnpm lint:skills` 0, `pnpm lint` 0.

### Step 6 (done 2026-11-10): full run at 49ac76c

All exit 0: `pnpm lint`; `pnpm lint:guide` (88 links in 12 files); `pnpm lint:skills` (1 skill, `defect-review`
exempt); `pnpm lint:workflows`; `pnpm test` (unit: 33 files, 1,014 tests; typecheck steps: `doc snippets: 227 checked
(0 in skills) …`, `api coverage: … 0 problems`, `error messages: …`; harness on chromium, firefox and webkit: 1,895
passed, 1 skipped, one of `sessionStorage.spec.ts`'s browser-conditional skips (L1293, L1306, L1762: Firefox without an
error page after `route.abort()`, WebKit's attachment); step locations: 12 passed; test-server check passed);
`pnpm docs:build` (53 pages). The run started before `skills/pomwright/` existed; its counts (`0 in skills`,
`1 checked`) show it checked the committed state.

**PLAN-1 done.**
