# Open questions

Questions for the maintainer, and claims still to verify. Each with where it came from.

## For the maintainer

All ten below were answered on 2026-11-10: see [DECISIONS.md](DECISIONS.md). Kept for their context.

### Answered

1. **Skill set and granularity.** Recommendation from the research: a few task-shaped skills, one reference file per
   method/area inside them, not one skill per method. Evidence: every installed skill's description sits in the
   always-loaded listing (Claude Code: 1% of the context window, least-used descriptions dropped on overflow; Codex:
   2% or 8,000 chars, descriptions shortened then skills omitted), and similar names compete. ([ecosystem.md](ecosystem.md))
2. **Cross-skill references.** The standard says nothing about one skill referencing another's files, and installers
   copy or symlink each skill folder separately. Options: (a) one core skill holds every API reference and the others
   say "use the `pomwright` skill"; (b) each skill carries the references it needs (duplication, kept in sync by a
   check); (c) one plugin containing all skills. Recommendation pending.
3. **User-invoked vs model-invoked.** `teach` is user-invoked in Matt Pocock's set (`disable-model-invocation: true`
   + `agents/openai.yaml` `allow_implicit_invocation: false`). But claude.ai uploads and the Skills API reject
   frontmatter keys beyond `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. Which
   targets matter: Claude Code + Codex + `npx skills` agents, or claude.ai uploads too?
4. **Distribution.** The repo's `skills/` folder is what `npx skills add DyHex/POMWright` discovers; a
   `.claude-plugin/marketplace.json` would add a Claude plugin channel, and Codex plugins exist too. Which channels,
   and does `defect-review` (a general skill, not about POMWright) share the catalog, get `metadata.internal: true`,
   or move?
5. **Versioning.** Skills describe POMWright 3.x. Do they state the version they cover (a `metadata.pomwright: "3"`
   key, or a `compatibility` line), and does a consumer-facing API change then require updating the skills in the same
   plan (a rule for `src/AGENTS.md`/`website/AGENTS.md`)?
6. **Checks.** Proposal: every TypeScript block in a skill compiles against the packed build, like the site's snippet
   check (`scripts/check-doc-snippets.mjs`), and every rendered chain in a skill is rebuilt like `docsChains.spec.ts`.
   Extend those scripts to `skills/**`, or a check of its own?
7. **Exploration tool for site mapping.** `playwright-cli` (official, has a skill, token-efficient), Playwright MCP,
   or a plain Playwright script. Recommendation: prefer the CLI when present, fall back to MCP, then a script; decide
   in the site-mapping plan.
8. **Naming.** Agent Skills names: lowercase, hyphens, ≤64, match the folder; Claude's guide suggests gerunds
   (`writing-pomwright-page-objects`) but accepts nouns. A `pomwright-` prefix groups them in listings.
9. **Teach workspace format.** Matt Pocock's lessons are HTML files in a learning workspace. For POMWright, lessons
   could instead be runnable specs against a small local practice app. Decide in the teach plan.
10. **Conventions the skills enforce where the docs leave a choice**: `kind@which` path naming with kind = the role;
    `*.locators.ts` (docs) vs `*.locatorSchema.ts` (the harness); one options object for page-object methods
    (README); a `testInfo`-free page object; test data through fixtures.

## To verify (probe before a skill states it)

- A query resolved with `getLocator()` used as `has` in another query's `filter(ancestor, { has })` (a card
  pattern) renders and matches as expected, on all three browsers.
- `page.addLocatorHandler` combined with a page object's path (`getNestedLocator("dialog@consent")`) as the trigger.
- Every example a skill shows: compiled against the packed build and, where it resolves a locator, run against the
  test server's pages (`test/server.js`).
- Playwright doc facts were read through a fetcher that capped quotes; re-read the exact wording before quoting.
