# Sources

What has been read, at which commit (`git rev-parse --short HEAD` when read) or date, and what remains. Tick an item
only when it is read in full and its facts are in `facts/`.

Repository at 7aebcb1 (branch `docs/agent-skills`), POMWright 3.0.2, Playwright peer floor 1.64.0.

## The contributor guide

- [x] `AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md`, `src/helpers/AGENTS.md`, `test/AGENTS.md`,
  `website/AGENTS.md`, `.github/AGENTS.md`, `docs/releases.md`, `docs/repository.md`, `docs/versioning.md` (7aebcb1)

## Runtime (`src/`, `index.ts`)

- [x] `index.ts`
- [x] `src/pageObject.ts`, `src/fixture/base.fixtures.ts`
- [x] `src/locators/locatorRegistry.ts`
- [x] `src/locators/locatorRegistrationBuilder.ts`
- [x] `src/locators/locatorQueryBuilder.ts`
- [~] `src/locators/locatorUpdateBuilder.ts` (exports skimmed; the API page and queries.md cover its behavior)
- [x] `src/locators/reusableLocatorBuilder.ts`
- [x] `src/locators/types.ts`, `src/locators/utils.ts` (STRATEGIES table only; rest via AGENTS), `src/locators/index.ts`
- [~] `src/helpers/*`: public signatures read; behavior from the site pages and src/helpers/AGENTS.md
- [ ] unit tests (`src/**/*.test.ts`, `*.test-d.ts`): deferred to the probe phase

## Site (`website/src/content/docs/`, and the live site)

- [x] Docs section (every page under `docs/`; `upgrading-from-2x.md` headings + intro only: read fully before a migration skill)
- [~] API section: index, headings of every page, logger page first half; the rest restates the Docs pages and doc comments
- [ ] Internal section (every page under `internal/`): deferred; read the pages a skill's lesson or reference cites
- [x] `website/snippets/` (the docs' example app)
- [x] `index.mdx`, `sidebar.mjs`, `README.md` (first 120 of 186 lines)
- [x] live site spot-check (2026-11-10): organizing-a-project and locator-modules match the repo's headings and
  examples; tabs Docs, API, Internal only

## Harness (`test/`)

- [x] `test/page-object-models/`, `test/fixtures/`, `test/test-data/` structure
- [ ] `test/tests/` specs by area: deferred; cite the spec that pins a claim when a skill relies on it
- [ ] `test/tests/packaging/publicTypes.typecheck.ts` (the public types)

## Ecosystem

- [x] Agent Skills open standard (agentskills.io): format, frontmatter, progressive disclosure, cross-agent support
- [x] Claude Code skills (docs), claude.ai skills
- [x] Codex / ChatGPT skills support
- [x] Playwright's own agent tooling (test agents, MCP, CLI, any official skill)
- [x] Matt Pocock's `teach` skill source (github.com/mattpocock/skills) and its siblings
- [~] `skills/defect-review/SKILL.md` (frontmatter and opening read) (this repo's existing skill, its style)

## External consumer projects (read only, never named)

- [x] project A
- [x] project B
- [x] project C
- [x] project D

## Also read

- [x] Playwright docs: locators, best-practices, pom, test-fixtures, test-parameterize, addLocatorHandler, auth
- [x] `microsoft/playwright-cli` skill and references
- [x] skills.sh, `npx skills` CLI docs, Claude Code plugin marketplaces
- [x] Git history: the earlier migration skills (`git show d2da6e9:skills/`)
