# PLAN-4B: pomwright-teach, three ways in and a course in the learner's shape

Written 2026-11-12 from the maintainer's outline (agreed 2026-11-12: two ways in became three; constrained generation;
the learner's choices in the workspace's `POMWRIGHT.md`; the quality checks; reading a learner's project). Waits for
the maintainer's go. Then the simulation (me as learner), later two agents.

## What changes for the learner

1. **The first session asks, in one message with the mission questions**, which way in:
   - **Getting started**: the fundamentals in one sitting (2 to 3 hours for a tester who knows Playwright): enough to
     write and run page code and tests in their shape. It ends with the course map: what was covered and to what
     depth, what was touched only, what was not covered, and what to take next (the full course from where it
     stopped, or focused tracks).
   - **The full course**: every unit, over many sessions, as today.
   - **A focused track**: one part the learner names (queries, session storage, frames, a refactor of their own tests
     …): a short check on that part, then 1 to 4 lessons.
   Every way in places the learner first (the short diagnostic the curriculum has) and skips what they already show.
2. **The shape and the parts, asked in the same message** (the defaults stated, so "the defaults" is an answer):
   `PageObject` subclasses (default), an own class over a registry, functions, or fixtures only; and which of `@step`,
   `SessionStorage` and the `log` fixture they want. Written into the workspace's `POMWRIGHT.md` (*Page code* and
   *POMWright's parts*), which every lesson and exercise then follows, and which the `pomwright` skill reads too.
3. **`CURRICULUM.md` in the workspace**: the learner's course, built from the skill's unit catalog for their way in,
   shape and parts: the units in order, each with its status (planned, covered, partly, skipped as known), the depth
   reached, and its sources. Updated after each lesson; it is the course map getting started ends with.
4. **A learner's own project**: a focused track (or unit 14) may read it, read-only: confirm with the learner that it
   is the right project first; for any other folder on the machine ask first and say plainly what reading shares (the
   files read go to the model provider as part of the conversation; nothing is written there or sent anywhere else).

## The skill's files

- **`references/curriculum.md`** becomes the unit catalog (under 300 lines):
  - the 14 units as now, each also naming its *core* (what getting started teaches of it), its sources and its shop
    page; units 1, 3, 6, 7 and 9 gain a short note per shape (what changes: the page code a lesson writes, how tests
    get it, where common locators live, how a page is reached); unit 7 becomes "Another shape" (the shapes the learner
    did not pick, compared);
  - **getting started**: a fixed path of 5 lessons: (1) a first page in the learner's shape (units 1, 2: register,
    name `kind@which`, resolve, navigate); (2) page code and test data in a test (units 3, 4); (3) one among several
    (unit 5: queries, no `nth`); (4) shared parts (unit 6, its core); (5) a review lesson with the course map. Each
    lesson's exercise on the practice shop;
  - **a focused track**: pick the units the part spans, take each unit's lessons at the depth the check shows;
  - building `CURRICULUM.md`: the units of the way in, in catalog order, minus what placement shows, each with its
    sources; nothing outside the catalog without saying so (and then with its sources checked as below).
- **`references/workspace.md`**: `CURRICULUM.md` and its format; `MISSION.md` gains *Way in* and *Shape and parts*;
  `POMWRIGHT.md` from the template with the learner's shape and parts.
- **`SKILL.md`**: the first session's one message (mission, way in, shape and parts); every session reads
  `CURRICULUM.md`; the quality rules gain two: every unit in `CURRICULUM.md` names its sources, and every POMWright API
  a lesson or exercise uses is looked up in the installed `index.d.ts` before the lesson is written (examples and
  exercises already run green first); the learner's project rule above.
- **`references/exercises.md`**: an exercise is written in the learner's shape and parts (unchanged otherwise).
- **The site's teach page and `skills/README.md`'s row**: the three ways in and the shape (one paragraph; the rest of
  the docs work comes later, as agreed).
- **Not changed**: the practice shop, the lesson and quiz rules, the "does not do" section.

## Checks

`pnpm lint:skills`, `pnpm lint:guide`, `pnpm lint`; no `ts` blocks are added to the teach skill (its examples are written
per learner), so no snippet or chain changes. One commit.

## Then, the simulation (agreed)

`claude -p` with the three skills as a plugin, in an empty folder outside the repo,
Opus 5.5 at high, resumed turn by turn; me as a tester who knows Playwright and TypeScript, new to POMWright, default
shape: getting started, then into the full course from its map (its first block at least), then one focused track;
unit 14 on the practice shop as "my app". Notes per lesson (claims against the declarations and the site, exercises
green with the solution, pacing, quizzes, the rules kept, resuming from files); a fresh session at least once. Cap $50
and the 90% window rule. Stand-in, disclosed: an expert playing a learner.

## Questions

None blocking; Q1 below has a default.

- **Q1. Getting started's five lessons** as above, or another cut (for example, session storage instead of shared
  parts)? Recommended: as above; session storage and frames are focused tracks.
