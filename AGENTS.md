# Agent Guidelines for POMWright

This repository now ships a **v2-only runtime** (`srcV2`, `intTestV2`).
Legacy v1 and migration docs remain in `docs/v1` and `docs/v1-to-v2-migration` for reference.

## Development priorities

- Focus implementation work on the v2 codepath (`srcV2`, `intTestV2`).
- Preserve the fluent locator registry API introduced in v2 (`LocatorRegistry`, registry builders, thenable query builders).
- Keep v2 modular and composable so users can adopt features independently.
- Write new or updated v2 documentation in `docs/v2`.
- Treat v1 content in `docs/v1` as archived documentation only.

## Coding style

- Follow `.editorconfig` (tabs, size 2) and existing TypeScript conventions.
- Use pnpm for scripts and dependency management.
- Prefer descriptive locator path naming; avoid anonymous path segments.
- Avoid `//biome-ignore` unless necessary, and include a short justification when used.
- Do not wrap imports in `try/catch`.

## Testing and quality

- Run and fix `pnpm lint:v2` and `pnpm pack-test:v2` before committing.
- If changing locator behavior/contracts, expand `intTestV2` coverage.
- Preserve existing `intTestV2` test scope; add tests instead of replacing broad coverage.

## Commit and PR expectations

- Keep commits scoped and descriptive.
- Call out API or behavior changes that affect consumers.
- Document intentional breaking changes and migration notes clearly.

## Notes on locator work

- Use v2 DSL for schemas (`add(path).getByRole(...)`, `filter`, `nth`, `replace`, `remove`, `describe`).
- Keep registry path validation guarantees intact (dot-delimited path rules).
- Prefer behavior-preserving refactors and explicit tests for edge cases.
