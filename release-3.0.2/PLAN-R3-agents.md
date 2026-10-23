# PLAN-R3 — `AGENTS.md`

Executed last but one (before R1), so it records the state after every fix. No changeset.

## Items

1. **Release state** (opus-DOC1, codex-M4). `AGENTS.md` section 1, "Published version: 3.0.0. The next release is 3.0.1",
   and section 7, "Pending 3.0.1 changesets: `.changeset/seed-overlapping-calls.md`". At `v3.0.1`, `package.json` is
   3.0.1, `CHANGELOG.md` has its entry, and `.changeset/` holds only `config.json` and `README.md`. Fix: published
   3.0.1, next 3.0.2 (or 3.1.0), the pending changesets of this branch, and the date line.
2. **Counts.** Section 2 says `src/` has "17 files, about 4,600 lines" (opus counted 5,968). Recount the runtime files,
   the unit tests and the harness specs (53 spec files, about 7,800 lines) at the end, or drop the line counts.
3. **The stack-frame rule** (opus-DOC2a). Sections 5 and 8: "Never filter stack frames by file name". `atCallSite`
   ([../src/helpers/callSite.ts#L1-L25](../src/helpers/callSite.ts#L1-L25)) drops frames matching
   `/pomwright/dist/index.(js|mjs|cjs)`, POMWright's own bundle, by design (*Internal → Call sites*). Fix: state the
   exception (the published bundle's own frames) in both places. This also answers opus-S2.
4. **The boxed-step rule** (opus-DOC2b). Section 5: "the helper that opens the step is not `async`". `goto`,
   `expectThisPage` and `expectAnotherPage` are `async` and open their steps themselves, and are reported at the right
   line. The rule that holds: exactly one POMWright `async` frame sits above the caller on the async stack when a boxed
   step opens. Fix: state that rule, with D5's change to `@step`.
5. **Every fact a fix changed**: D1 (calls take turns), D3 (URL rules), D5 (step locations and the new reporter),
   D8 (the runtime hint), D9 and D17 (how URLs compare), D15 (the publish guard), D16 (the `exports` map).
6. **Design questions decided** (opus-Q1, opus-Q2): recorded where `AGENTS.md` keeps decided design, if the user wants
   them there.
7. **Work for later moves to GitHub issues** (decided 2026-10-22). Section 7's list "After 3.0.0" (the release tooling,
   TypeScript 7, Node 26, publishing the tested tarball, a context-wide `seed` option) becomes issues, with D8's
   option C and R2 item 5's option C ([ISSUES.md](ISSUES.md)), and leaves `AGENTS.md`. In its place, one instruction:
   work planned for later is tracked as open issues with one label (`gh issue list --label <label>`); read them before
   planning a release; a working folder's deferred items become issues before the folder is deleted. Section 6, rule 7
   changes the same way ("work left for later into section 7" becomes "into an issue"). "Considered and not planned"
   stays in `AGENTS.md`: those are decisions, not work. The issues are created before this item is executed, so the
   instruction names a label that exists.

## Execution note (2026-10-22)

Item 1 follows codex-M4's suggestion rather than restating new values: `AGENTS.md` no longer names the published
version or the pending changesets, and points at `package.json` and `.changeset/` instead, so a release cannot leave it
stale again. The new harness checks (the URL sweep, the step-location check, the legacy-decorator probe) are also on
*Internal → Tests and checks*, which D5 and D7 had not updated.

## Decisions

- [x] Items 1–6 as above (2026-10-22)
- [x] Item 7: work for later as GitHub issues, with one instruction in `AGENTS.md` (2026-10-22)
