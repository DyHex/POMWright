# Segment 2B: inventory, reconciled

Pass 3. The union of `inventory-blind.md` (this review, pass 1, at `d850405`) and the first review's `inventory.md`
lines tagged `[B]` (§1 exports, §3 *Registration and resolution*, §3's error table, §4 lifecycles, §5 inputs, §6 types,
§8 type probes) with its scope B summary. Each line: **both**, **blind only** or **first only**; then how deeply each
review probed it. "First" means the first review at `54cdada`; "blind" this review's pass 1; "pass 2" the re-runs of the
first review's probes at `d850405`.

| Item | Source | First review | This review |
| --- | --- | --- | --- |
| `add(path)` and the ten methods, steps, one registration per path, boundary checks (B-08, B-12, B-15, B-16) | both | deep: `p06` (10 strategies × 3 builders × 6 values), `p07` | code read; `p05` (every row against Playwright), pass 2 re-ran `p06`, `p07` (no change but B-2's fix) |
| A registration ends at the next registry call; hints (B-13) | both | deep: `p05` (4 builder kinds × 9 enders × every method); B-5 | code read, change-set questions for 890dbd8; pass 2 re-ran `p05` (only the hints changed) |
| Copies, `readFields`, clone on read (B-14) | both | deep: `p04` (prototypes, getters, frozen, symbols, null prototype, `compile()`); B-1 | code read, b990969's paths traced by hand; pass 2 re-ran `p04` (only B-1's rows changed) |
| Path rules, runtime and types agree (B-10) | both | deep: 26 characters, U+200B/U+180E/U+2060, dot rules; B-3 | `t01` (diagnostic text), `p07` (prototype names, emoji, combining marks, punctuation as segments); pass 4 adds very long paths |
| Typed paths: union, template members, wide `string`, `<string>` registry, `NeedsPaths` (B-11) | blind only (`NeedsPaths` and the `<string>` wording are new in 49454c6) | — | `t01` (`<string>` and `PageObject<string>` still check a literal's format: **2B-2**); `p04` (a template value with a dot nests: **2B-3**) |
| Sub-path types, `SkippablePaths` (first §6 `[B, C]`) | first only | through C-1 (`[C]`) | given to 2C in this review; not probed here |
| `getById` (B-18) | both | deep: `p02`, `p15`-`p17`; "identical to `getByTestId`, including its limit with `u` and `>>`" | deep: `p02` (17 ids, 13 RegExps, three browsers, standards and quirks mode), `p02b`-`p02e`: an odd quote in a `u`/`v` RegExp fails where Playwright's bare call works: **2B-1**; `p06b` (shadow roots, frames) |
| `STRATEGIES` table against Playwright (B-17) | both | through the docs' chains (`p01`) | deep: `p05`, every row with options under a locator, inside a frame and from a seed (0 mismatches) |
| Resolution: chains, terminal-only `has`, cycles, description (B-22, B-23, B-24, B-28) | both | deep: `p02`, `p07` | `p01`, `p06`, code traced for cycle detection and the root path; pass 2 re-ran `p02`, `p07` |
| Frames and the any-frame form (B-25) | both | deep: nested frames, any-frame in every position, `has` in a frame (chromium) | `p01`, `p05` (every strategy inside a frame), `p06` (strict-mode text), `p06c` (equivalence with Playwright's `frameLocator`) |
| `verify()` and `strictChains` (B-26, B-03) | both | deep: `p07` (closed page, bad selector, cycles) | `p04` (strictChains with dotted values), `p06b` (closed page), `p07` |
| Reuse by path and by seed, hand-made seeds, seeds as values (B-19, B-20, B-21) | both | deep: `p09`, B-4 | `t03` (11 type cases), `p05` (seeds render as Playwright), `p07` (reuse of a prototype-named path) |
| `createRegistryWithAccessors`, accessor types (B-01, B-04) | both | read; TS4023 (F) | `t01` (`NeedsPaths` diagnostic) |
| `PageObject` registry facade, `defineLocators()`, the check after construction (B-09, B-27) | both (first: the facade, "guarded against re-entry"; lifecycle was D's) | read | `p03` (a subclass constructor that throws after `super()`: decided and documented, no finding) |
| Error messages: *Paths*, *Registering*, *Reusing*, *Resolving and verifying* (B-29) | both | deep: `f7` (B-7) | by reading against the code; the message check script (baseline: 0 problems); pass 2 re-ran `f7` |
| TypeScript diagnostics the pages quote | both | `p03` | `t01`: the six path errors and `NeedsPaths` match tsc's text |
| Editor rename groups (*Locator paths*, *Builders*) | both | `p11` (B-6) | `t02`; pass 2 re-ran `p11` |
| Locator modules page (module overload, base class, slots, `declaration: true`) | both (`[B, H]`) | read; snippets compile | read; snippets compile (baseline check) |
| Input edge values: `IndexSelector` (negatives, non-integers, NaN, `undefined`, `null`) | first only | `p07` (`nth` identical to Playwright) | pass 2 re-ran `p07`: unchanged |
| Upgrade guide's registration and resolution parts | first only | read; TS4023 (`p13`) | not read here (2H's page in this review) |
| `types.md`: `FilterDefinition`, `IndexSelector`, `LocatorSchemaPathFormat`, `LocatorSchemaPathArgument` | first only (the blind pass grepped `types.md` for `<string>` only) | read | pass 4 |
| Doc-comment `@example`s of the registry's public types | neither | — | pass 4 |
| Very long paths (type and runtime) | both (first: B-3) | 999 and 1,200 characters | pass 2 re-ran B-3 (999 compiles); pass 4: longer literals and many segments |
| Change set since `54cdada` (B-33) | blind only | — (did not exist) | change-set questions answered in pass 1 (log) |
| Prototype names and unusual characters as path segments | blind only | — | `p07` |
| Unescaped has/reuse paths in "No locator schema registered" messages; detached registry methods | blind only | — | noted, not filed (log, pass 1) |
| Performance page (registry part) | both | not measured | skimmed, not measured |

## Findings, both ways

- **First-review findings the blind pass would have met**: none is present at `d850405` (pass 2: all seven fixed), so
  none could be met as a defect. Of the probes that would have caught them had they still been there: `t03` covers
  B-4's reuse types; the change-set questions for `f46b982` and `890dbd8` cover B-2's and B-5's paths; `t02` covers B-6's
  claim. **Blind spots of pass 1**: no probe of an own non-enumerable option (B-1's input; settled by pass 2's re-run of
  `p04`), no long-path literal (B-3's input; pass 4), and no systematic comparison of every thrown message with
  `errors.md` (B-7's method; the message-check script now does it, and pass 2 re-ran `f7`).
- **Blind findings the first review did not report**:
  - **2B-1** (a `u`/`v` RegExp with one quote): missed by the first review. The code and the unit test pinning the
    unescaped output are older than `54cdada`; the first review's `p16` tried `/^say "hi"$/u`, whose two quotes happen to
    parse, and recorded the `>>` limit as Playwright's.
  - **2B-2** (`<string>` said to give up the format check): new since `54cdada`, in `49454c6`.
  - **2B-3** (a template value with a dot): new since `54cdada` as a documentation finding (the "accepts any value"
    paragraph is `49454c6`'s); the splitting itself is the path model.
