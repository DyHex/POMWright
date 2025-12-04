# Agent Guidelines for POMWright

This repository carries both the **v1** codepath (`src`, `intTest`) and the ongoing **v2** refactor (`srcV2`, `intTestV2`). Use the guidance below whenever you modify files in this repo.

## Development priorities

- Focus exclusively on the v2 codepath for implementation work. Do **not** change v1 (`src`, `intTest`); it is retained only for side-by-side comparison and regression awareness.
- Preserve the fluent locator registry API introduced in v2 (via `LocatorRegistry`, `bindLocatorAccessors`, and the thenable builders) and keep examples/tests aligned with it.
- Design v2 around the Page Object Model pattern expressed through functional programming: features should be as independent and composable as possible so users can adopt only what they need.
- Write documentation under `docsV2/` for v2 work while consulting v1 docs in `docs/` for context and completeness.
- Always consult the drift tracker at `docsV2/v1-v2-drift.md` before making changes, and update it immediately when you spot new breaking changes, regressions, or bug fixes.
- Prefer migration helpers/shims over strict runtime compatibility with v1 APIs; clear improvements in functionality and syntax take priority over backwards compatibility.

## Coding style

- Follow the `.editorconfig` (tabs, size 2) and existing TypeScript conventions in the project.
- Use pnpm for scripts and dependency management.
- Prefer descriptive naming for locator paths and avoid anonymous segments; the registry validates dot-delimited paths with no leading/trailing dots.
- Avoid `//biome-ignore` where possible by addressing the underlying lint/type issue; when necessary, include a short justification with the directive.
- Do not wrap imports in `try/catch` blocks.

## Testing and quality

- Always run and fix `pnpm pack-test:v2` and `pnpm lint:v2` before committing. Use `lint:v2` to avoid unrelated v1 noise.
- If you add or change locators or behavioural contracts, expand integration coverage in `intTestV2`; err on the side of more tests while keeping existing cases intact.
- Existing tests in `intTestV2` should be maintained and keep their scope/cases. If a change would require large edits to a case, prefer adding new tests instead.

## Commit and PR expectations

- Keep commits scoped and descriptive; call out the v2 focus explicitly.
- Keep docs and examples showing both v1 and v2 patterns where relevant to ease migration, but prioritize clear improvements in functionality and syntax over backwards compatibility.

## Notes on locator work

- Use v2’s builder DSL (`locators.add('path').getByRole(...)`, filters/index steps, frame handling) for new schemas and tests.
- Prefer migration helpers/shims over trying to keep strict runtime compatibility with v1 APIs.
- Document any intentionally breaking changes and provide migration tips where possible—capture them in `docsV2/v1-v2-drift.md` as they arise.
