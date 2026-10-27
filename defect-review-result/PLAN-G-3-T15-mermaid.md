# Plan 6: Mermaid 12, and a render check of every diagram in the site job

- **Decisions**: [DECISIONS.md](DECISIONS.md) #1 (the Mermaid part, PR #48's change), #59 (point 4)
- **Findings**: [G-3](G-ci-and-tooling/defect-G-3-dependabot-proposes-deferred-majors.md) (PR #48); test gap #15's
  Mermaid part; scope H's probe `…-probes/H/mermaid/render.mjs` (17 diagrams on 13 pages, light and dark)
- **Bump**: none (no changeset)
- **Stop**: **yes**, after the commit: the maintainer pushes; the `site` job, with the new check, must be green
- **Depends on**: plan 3

## Contract

The site uses Mermaid 12 with `astro-mermaid` 2.2.0. Every CI run builds the site, serves the build, opens every page
that has a diagram in Chromium, in the light and the dark scheme, and fails when a diagram has no rendered SVG or shows
Mermaid's error marker, or the page logs an error. How a diagram looks stays a matter of eye: the maintainer checks them
by hand before the merge and on the live site after it.

## Current behaviour

- `website/package.json:13-14`: `astro-mermaid` 2.1.0 (peer range `^10 || ^11`), `mermaid` 11.17.2; diagrams render in
  the browser, so `pnpm docs:build` cannot catch one that fails (AGENTS.md §9).
- No check opens the pages; scope H rendered all 17 by hand with a script (no problem on Mermaid 11).

## Steps

1. `website/`: `mermaid` 12.2.0 and `astro-mermaid` 2.2.0, exact as the project pins (`pnpm -C website add -E …`), and
   the lockfile.
2. `scripts/check-diagrams.mjs` (new), from scope H's probe, without its hard-coded list or fixed wait:
   - serves `website/dist` under `/POMWright/` with a small `node:http` static server inside the script (no
     dependency) on a free port;
   - finds the pages with a diagram by scanning the built HTML for the Mermaid blocks `astro-mermaid` writes;
   - launches Chromium from the root's `@playwright/test` (the peer-floor pin), and for each page and each of `light`
     and `dark` waits until every block holds an `svg` or an error, with a timeout, then fails on a block without an
     `svg`, Mermaid's error marker (`aria-roledescription="error"`, "Syntax error", "Parse error"), or a console or page
     error;
   - prints one line per page (scheme, diagrams, result) and exits non-zero on any problem; a count line at the end
     (pages and diagrams checked), and a failure when it finds no diagram at all (a sign the selector broke).
3. Root `package.json`: `"docs:diagrams": "pnpm docs:build && node scripts/check-diagrams.mjs"`.
4. `checks.yaml`, the `site` job: after *Build the site*, install Chromium (`pnpm exec playwright install --with-deps
   chromium` at the root) and run `node scripts/check-diagrams.mjs`. No harness job builds the site; the site's
   dependencies stay in `website/`.
5. Run `pnpm docs:diagrams` locally: every diagram renders on Mermaid 12. If one does not, fix the diagram's source
   (AGENTS.md §9's rules: a semicolon in a sequence message, parentheses in an unquoted edge label) and say so in
   *Execution notes*; a Mermaid 12 change that needs more than a syntax fix is unexpected (stop and report).
6. **Docs**: AGENTS.md §3 (the `docs:diagrams` script) and §9 ("A Mermaid diagram renders in the browser, so the build
   does not catch its syntax": now the `site` job's render check does; how it looks is still checked by eye); AGENTS.md
   §2 (the `site` job's step, `scripts/check-diagrams.mjs`); *Internal → Documentation* (*Building and publishing*: the
   render check) and *Internal → Tests and checks* (the `site` bullet).

## Tests

The check itself; a planted broken diagram (a semicolon in a sequence message on one page of a scratch copy of the
built site, or a temporary edit reverted after) fails it with the page named, recorded in *Execution notes*.

## Verify

The standard checks (PLANS.md, rule 5), `pnpm docs:diagrams`, actionlint. Then **stop**: the maintainer pushes; the
`site` job must be green on PR #60. The maintainer's own look at every diagram stays before the merge (decision 1).

## Commit

```text
docs: Mermaid 12, and a check that every diagram renders

Mermaid 12.2.0 with astro-mermaid 2.2.0, whose peer range takes it. The
site job now serves the built site and opens every page with a diagram in
Chromium, light and dark, and fails when a diagram has no SVG, shows
Mermaid's error, or the page logs an error.

Plan: defect-review-result/PLAN-G-3-T15-mermaid.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

- `website/`: `mermaid` 12.2.0 and `astro-mermaid` 2.2.0 (exact; its peer range is `^10.0.0 || ^11.0.0 || ^12.0.0`).
- `scripts/check-diagrams.mjs`: serves `website/dist` under `/POMWright/` with `node:http` on a free port; finds the pages
  whose built HTML holds `<pre class="mermaid"` (13 pages); Chromium from the root's `@playwright/test`; for each page,
  light and dark, waits up to 15 s until every block holds an `svg` or Mermaid's error text, then fails on a block
  without an SVG, with `aria-roledescription="error"` or "Syntax error"/"Parse error", or on an error the page logged;
  fails when it finds no page with a diagram. Biome's `useOptionalChain` warning on the 404 branch was resolved by
  restructuring it (`inSite`).
- Result on Mermaid 12: "diagrams: 17 on 13 pages, light and dark, 0 problems"; no diagram needed a change. A planted
  broken diagram (an unclosed node in the built `docs/frames/index.html`) fails on both schemes ("shows Mermaid's
  error", plus astro-mermaid's logged parse error), exit 1; the site was rebuilt after.
- Root `package.json`: `docs:diagrams` (`pnpm docs:build && node scripts/check-diagrams.mjs`). `checks.yaml`, the `site`
  job: *Render every diagram* after the build (`pnpm exec playwright install --with-deps chromium`, then the script).
- Docs: AGENTS.md §2 (the `site` job, the script), §3 (`docs:diagrams`), §9 (the render check; how a diagram looks still
  by eye); *Internal → Documentation* and *Internal → Tests and checks*.
- Checks: `pnpm lint` 0 (163 files); actionlint 0; `pnpm test:unit` 782 passed; `pnpm pack-test --reporter=line` exit 0
  (1,509 passed, 3 skipped; doc snippets 215; api coverage 0 problems; step locations 7); `pnpm docs:diagrams` exit 0.
- The maintainer's own look at every diagram stays before the merge (decision 1).
