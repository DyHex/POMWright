# PLAN-3-MAP-SITE: the `pomwright-map-site` skill

Status: **written 2026-11-10; executing** under the standing instruction. Builds `skills/pomwright-map-site/` as S1,
S2, S4 and S8 of [DECISIONS.md](DECISIONS.md) decide, under the checks of PLAN-1.

## Intended contract

Given an origin (and optionally a start path, credentials or a logged-in state), the agent maps the site, the user picks
the pages, and the agent generates, following the `pomwright` skill: the app's base class (and the project's structure
when there is none), one locator module and page object per picked page, the fixtures, and a starter spec per page that
checks every generated path against the live page. It never submits a form, clicks anything but links while mapping,
or maps an origin the user did not name.

## Verified facts this plan builds on

- Playwright 1.64, the peer floor, has as public API ([types.d.ts](../test/node_modules/.pnpm/playwright-core@1.64.0/node_modules/playwright-core/types/types.d.ts),
  read 2026-11-10): `page.ariaSnapshot({ mode: "ai", depth?, boxes? })` (L2101; refs like `[ref=e2]`, iframes
  included), `page.getByRef(ref)` (L3176; "resolve against the latest snapshot"), and `locator.normalize()` (L16517:
  "a new locator that uses best practices … prioritizing test ids, aria roles, and other user-facing attributes over
  CSS selectors", printed with `toString()` "the same way codegen does").
- The official `playwright-cli` offers `snapshot` and `generate-locator <ref>`; Playwright MCP offers
  `browser_snapshot` and, with `--caps=testing`, `browser_generate_locator` ([ecosystem.md](ecosystem.md)).
- `normalize()` puts test ids first, the opposite of the skills' order (C, S): its result is a candidate, and the
  skill prefers the role and accessible name the snapshot shows when they identify the element.

## Exploration route (S8, detailed)

S8 ordered `playwright-cli`, then MCP, then a shipped script. With the facts above, the shipped script needs nothing but
the project's own Playwright (≥ 1.64 wherever POMWright 3 is installed) and gives the same snapshot and locator
generation, version-matched and scriptable. **Proposed**: the script is the default route; `playwright-cli` or MCP when
the agent already has them and the user prefers them. Each route's output feeds the same generation steps. (Within S8,
which left the routes to be "detailed and probed in its plan"; to be reported to the maintainer.)

## The skill

```text
skills/pomwright-map-site/
  SKILL.md                 the workflow: scope, crawl, pick, snapshot, design paths, generate, verify
  references/
    from-snapshot-to-paths.md   reading an ai-mode snapshot: landmarks and regions to segments, interactive
                                elements to paths, names to kind@which, choosing among normalize()'s candidates
    safety.md                   what mapping may and may not do (GET navigations only, no form submission, the
                                origins the user named, credentials only from the user, no production writes)
  scripts/
    map.mjs                     node script, run from the user's project: `crawl <origin> [--depth N --limit N]`
                                (same-origin links from the start page, grouped by path pattern, with titles) and
                                `snapshot <url> [--storage-state file]` (the ai-mode snapshot and, for each
                                interactive ref, its normalized locator); loads @playwright/test from the project
                                (createRequire of the project's package.json), launches chromium headless
```

Frontmatter: portable keys only (S4); `name: pomwright-map-site`; the description says it generates page objects,
locator modules, fixtures and starter tests from a running site, and uses the `pomwright` skill.

## Workflow (SKILL.md)

1. **Scope**: the origin(s), the start path, the environment, whether pages need a login (a `storageState` file the
   user provides, or credentials the user types for a setup step); confirm before crawling.
2. **Crawl**: `node map.mjs crawl …`; present the pages grouped by path pattern (`/orders/42`, `/orders/43` as
   `/orders/[id]`) with titles; the user picks.
3. **Snapshot** each picked page; read it per `references/from-snapshot-to-paths.md`.
4. **Design**: per page, the containers and the elements tests act on, as a path tree, following the `pomwright`
   skill's `guides/choosing-locators-and-paths.md`; present it for a quick review when the page is large.
5. **Generate**: project structure from the `pomwright` skill's templates when there is none; the app's base class;
   per page a locator module, a page object (minimal methods: none, or the obvious form submits) and its fixture.
6. **Verify**: `tsc --noEmit`; a generated starter spec per page that navigates, waits for the page, and asserts every
   singular path matches exactly one element and every plural path at least one; run it; fix and rerun until green.
7. **Report**: what was generated, what was left out and why, the paths that needed a test id or CSS.

## Probes before the skill relies on them

1. `map.mjs crawl` on the test server (`test/server.js`, port 9000): finds its routes, groups `/testnav/item/:id`.
2. `map.mjs snapshot` on `/testgetby` and `/testfilters`: refs, normalized locators; what `normalize()` returns for an
   element with both a test id and a role with a name.
3. The whole loop on one test-server page: generated module and page object compile and the starter spec passes on
   chromium, firefox and webkit.

## Execution order (one commit per step)

1. `scripts/map.mjs` with probes 1-2 (results recorded; the script linted by biome).
2. `references/safety.md`, `references/from-snapshot-to-paths.md`.
3. `SKILL.md`; probe 3 run by following the skill on a test-server page, by hand, recorded.
4. Lint, links, private-name grep; full run.

## Execution notes
### Executed 2026-11-10 (201b451), steps 1-3 in one commit

- **Route**: the shipped script is the default (Playwright 1.64's `page.ariaSnapshot({ mode: "ai" })`,
  `page.getByRef()`, `locator.normalize()`, all public, need no other install); `playwright-cli` or MCP when the agent
  has them. Reported to the maintainer as the detail S8 left to this plan.
- **Probe 1, crawl** (`/testnav`, depth 2, limit 30): 5 pages; `/testnav/item/42` grouped as `/testnav/item/[id]`;
  `/testnav` and `/testnav?tab=1` one pattern; `/testids` found by a link. Exit 0.
- **Probe 2, snapshot**: `/testfilters` (51 lines: generic sections, a named region, refs e1-e25) and `/iframe`
  (frames with refs `f1e3`, a nested frame). Findings that shaped the skill: `normalize()` returns a whole-page unique
  chain, using an id for a generic container (`locator('#section1')…`) and the role for a named region; for a button
  with role, name ("Toggle A: Off", a state) and `data-testid` it returns `getByTestId('toggle-a')` (test ids first);
  frames as `locator('iframe[title="iframeA"]').contentFrame()…`. My first parser missed lines the snapshot quotes (a
  name with a colon) and the `iframe` role; fixed and rerun. Outputs in `probes/map-site/snap-*.txt`.
- **Probe 3, the loop**: following the skill on `/testfilters`, a page object designed from the snapshot (a named
  region by role, a generic section by `getById("section1")`, a plural path) and its starter spec: `tsc` 0, 3 passed
  (chromium, firefox, webkit); control: the red button without its section matches 4, so the spec's one-element check
  catches a path that lost its context. Files in `probes/map-site/`.
- My `pkill -f "node server.js"` matched my own shell's command line and killed it (exit 144); servers are stopped by
  their exact command line (`pgrep -f "^node server.js$"`) from now on.
- Checks: skills 3 pass, guide 193 links in 33 files, snippets 280 (53 in skills), lint 0 (the archived probe spec in
  `skills-work/probes/` needed its imports sorted, since `pnpm lint` reads the whole tree), skills chains 9 passed.

**PLAN-3 done.** The full run is deferred to the end of PLAN-4 (nothing PLAN-3 added runs in the harness beyond the
checks above).
