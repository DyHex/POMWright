# Agent Guidelines for POMWright

This repository ships a single runtime codepath:
- Runtime source in `src`
- Integration harness in `test`

Legacy v1 and migration docs remain in:
- `docs/v1`
- `docs/v1-to-v2-migration`

## Development priorities

- Focus implementation work on the current runtime in `src` and its test harness in `test`.
- Preserve the fluent locator registry API (`LocatorRegistry`, registry builders, thenable query builders).
- Keep features modular and composable so users can adopt them independently.
- Write or update runtime docs in `docs/v2`.
- Treat `docs/v1*` as archived reference material unless explicitly requested.

## Coding style

- Follow `.editorconfig` (tabs, size 2) and current TypeScript conventions.
- Use pnpm for dependency management and scripts.
- Prefer descriptive locator path naming; avoid anonymous path segments.
- Avoid `//biome-ignore` unless necessary, and include a short justification when used.
- Do not wrap imports in `try/catch`.

## Testing and quality

- Run and fix `pnpm lint` and `pnpm pack-test` before committing.
- If changing locator behavior/contracts, expand coverage under `test/tests`.
- Preserve existing test scope; add focused tests instead of replacing broad coverage.

## Commit and PR expectations

- Keep commits scoped and descriptive.
- Call out consumer-facing API or behavior changes.
- Document intentional breaking changes and migration notes clearly.

## Notes on locator work

- Use the DSL for schemas (`add(path).getByRole(...)`, `filter`, `nth`, `replace`, `remove`, `describe`).
- Keep registry path validation guarantees intact (dot-delimited path rules).
- Prefer behavior-preserving refactors and explicit tests for edge cases.
