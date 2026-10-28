# Segment 2C inventory, reconciled (pass 3)

The union of `inventory-blind.md` (this review, pass 1) and the first review's map for the area: `inventory.md`'s
`[C]` lines (*Queries [C]*, §5 inputs `[B, C]`, §6 types `[B, C]` and `[C]`) and the questions of its scope C brief,
which its summary answers. Each line: **both**, **blind only** or **first only**, then how deeply each review probed it
(first: at `54cdada`, its probe names; second: at `d850405`, mine; files under each review's probes folder `C/`).

## Public members and contracts

- `getLocatorSchema` returns an independent copy per call; registry unchanged — **both**. First: p05, p10 (deep).
  Second: P1, P2 (deep).
- `filter`, `nth`, `clearSteps` on the path or a sub-path, steps after the registered ones in call order — **both**.
  First: p01, p07 (DOM). Second: P1, P3, P2 (DOM, compared with Playwright's own call).
- `nth` values handed to Playwright (negative, `1.5`, `NaN`, `undefined`, `null`) — **first only** for the odd values
  (p07, p12; decided not validated). Second: `"first"`, `"last"`, numbers (P1); the odd values read in the code only.
- `describe`, `describe("")`, non-string, any-frame terminal — **both**. First: p01, p10, p12; C-6 found the any-frame
  gap. Second: P1, P3 (fixed).
- Where Playwright shows a description — **both**. First: p18 (runner, step reporter). Second: S1 (runner, JSON, step
  reporter and the HTML report's embedded data).
- `update`: same strategy, JSON Merge Patch, `undefined`, `null`, lone `null`, strategy-change message — **both**.
  First: p01, p02 (records), p04 (every strategy). Second: P1, P3, P2 (copies).
- `update` patch values that are objects (a `Locator` under `has` in `locator()`'s options): replaced, not merged —
  **neither** probed it (first's brief asked about nested objects and arrays) → pass 4, P6.
- `replace`: any strategy, Playwright's argument lists, `null` options = omission, first argument required except
  `frameLocator` — **both** for the lists (first: type probe C2, p02; second: publicTypes, T1). The `frameLocator`
  exception against the prose — **blind only** (P5, T4 → 2C-1).
- `replace` then `update`, kept builders across `replace` — **both**. First: p17. Second: P1.
- The any-frame form in a query: ancestors skipped, not the terminal, not with steps, first-segment rule at
  resolution, `filter`/`nth`/`describe` afterwards — **both**. First: p03, p04 (deep; C-3, C-6). Second: P1, P3, P5.
  Its compile-time side (`replace().frameLocator()` on the terminal compiles) — **blind only** (T4 → 2C-3).
- `skip`/`unskip`, kept builders across `skip` (b1ee8dc) — **both**. First: p01, p16 (deep). Second: P1, P3.
- `skip` with `strictChains` — **first only** as a question in its brief; not in its probes' outputs. Second: not probed
  in pass 1 → pass 4, P6.
- A kept query across later registrations: snapshot, sub-path message (C-7, 9bcf72e) — **both**. First: p05, p15
  (found C-7). Second: P1, P3 (fixed).
- `has`/`hasNot` paths in a query resolve from the live registry at resolution: a path registered after the query
  resolves; a query's own change to that path is not seen — **blind only** (P1). Documented as "a registered path …
  resolved to that path's own locator"; no finding.
- A query in an `add` chain's arguments ends that registration (890dbd8 wording) — **both**. First: p09 (found C-2).
  Second: P4 (fixed, errors.md 96-97 exact).
- Copies of options, patches, filters, RegExps (class instances, prototype values, non-enumerable keys, `compile()`
  after the call) — **both**. First: p05, p13, p14 (found C-5). Second: P2 on a DOM, RegExp flags `i g y m u v s` and a
  set `lastIndex` included (**blind only** for the flags through a query filter).
- Frame segments in a query (`filter`/`nth` on the `<iframe>`, `update(sub).frameLocator(selector)`) — **both**. First:
  p03, p17. Second: P1.
- A query handed out by a `PageObject` (the facade defines the locators first) — **blind only** (read
  `src/pageObject.ts:306-331`; the first review left the facade to its scope D) → pass 4, P6.
- A query resolved after the page closed — **neither** → pass 4, P6.

## Errors and messages

- Every query message on `errors.md` *Queries*, the API pages and `queries.md` — **both**. First: p01, p03, p04, p10,
  p11 (found C-4). Second: P3 (40 messages, exact), P4.
- Which calls `errors.md` says throw a message (`getLocatorSchema` and the unregistered path) — **blind only** (P5 →
  2C-2).
- Internal, unreachable messages of `locatorUpdateBuilder.ts` — **both** (read).

## Types

- Sub-path types per member, `SkippablePaths`: literal unions — **both** (first: type probe C2; second: T1, T4).
  `string` members, template members, generic bases — **both** (first: p06, found C-1; second: T1, T3, publicTypes).
  Pattern-typed queries from helpers, mid-pattern template members, union and whole-union path variables, generic
  forwarding functions, named generic query types — **blind only** (T1, T3). The compile message shown on
  `locator-paths.md` — **blind only** (T2).
- `Mode`, `OptionsPatch`, `undefined` first argument (db26390) — **both** (first: type probe C2, p16; second:
  publicTypes, T1).
- `LocatorUpdateBuilder` public type, default `Mode` — **blind only** (T1).

## Documentation

- `queries.md`, `filters-and-indices.md`, `descriptions.md`, the two API pages, `errors.md` *Queries*,
  `internal/builders.md` — **both**. `internal/resolution.md` (query parts) — **blind only** (read). The query lines of
  `upgrading-from-2x.md` — **both**. `frames.md`, `typescript.md`, `locator-paths.md` query lines — **both** (first:
  read; second: read, T2, T3). The README's query example — **blind only** (read; compiled by the snippet check).
- The broad statements against the narrow contracts (`replace`'s first argument; the throwing calls of the
  unregistered-path message) — **blind only** (2C-1, 2C-2).
- Changesets of the query commits — **both** for db26390, 2accf34, b1ee8dc; **blind only** for the later ones
  (`kept-query-sub-path-message`, `query-describe-any-frame`, `sub-path-template-members`, `registry-requires-paths`,
  the amended `options-read-like-playwright` and `ended-registration-message`).
- The guide's query lines (`src/locators/AGENTS.md` *Contracts*) — **both** read; the first review checked them as its
  §5 (found the any-frame rule gap, C-6); the second noted that it repeats 2C-1's statement (for 2I).

## Tests

- Which contracts are tested against the packed package — **both**. First: found the source-only coverage (its gap
  #10). Second: every locator spec now packed (decisions #55, #71); the remaining gaps are in `summary.md`.

## The change set

- `db26390`, `2accf34`, `b1ee8dc` — **both**. First: a v3.0.1 build beside `54cdada` (p16). Second: read and probed at
  `d850405` only (no regression candidate, so no base/head run).
- `9bcf72e`, `8bdcd35`, `b990969`, `890dbd8`, `49454c6`, `8f185be`, `429f2c2`, `9f47cae`/`a7d5ba7` — **blind only**
  (new since `54cdada`): each promise probed on its paths (P1-P5, T1-T4).

## Findings, both ways

- The first review's C-1 to C-7: each path is one the blind pass exercised (T1, P4, the queries page, P3, P2, P3, P3),
  and each is fixed at `d850405` (`first-review.md`); no blind spot of pass 1 among them.
- This review's 2C-1, 2C-2, 2C-3: each statement or call existed at `54cdada`, so each is a miss of the first review,
  not new code. 2C-1 is a near miss: the first review's C-4 quoted the sentence and checked another clause of it.
