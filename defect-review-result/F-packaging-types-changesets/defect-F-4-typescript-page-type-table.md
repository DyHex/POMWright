# F-4: The TypeScript page's table of exported types lacks the four session storage types 3.0.2 exports, and Packaging counts two compile-only type checks where there are three

- **Kind**: documentation
- **Area**: `docs/typescript.md` *The types*; `internal/packaging.md` *Checked on the packed package*
- **Severity**: Low. An omission in a list; the types are documented on the `SessionStorage` API page.
- **Semver of the fix**: none (docs only).
- **Reviewed**: `54cdada`, 2026-10-23, Claude (Opus 5.5)
- **Status**: decided (2026-10-27, [DECISIONS.md #48](../DECISIONS.md))

## Contract

- `docs/typescript.md` (description: "The types POMWright exports and when you need them") lists the exported types in a table under *The types*. Its storage row is line 32: "| `SessionStorage`, `SessionStorageSchema`, `Codec<T>` | the storage helper, its schema, a codec |".
- `index.ts` exports `AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` since `7447754`. That commit updated `api/index.md` and `api/class-sessionstorage.md` (sections `## AllEntries`, `## Decoded`, `## SeedOptions`, `## SessionStorageOptions`), but not this page.
- `internal/packaging.md:42`: "Two compile-only files check the published types: `publicTypes.typecheck.ts` … and `publicTypes.emit.ts`". `test/tests/packaging/` also has `stepLegacyDecorators.typecheck.ts`, which `pnpm typecheck` compiles against the published declarations under `experimentalDecorators` (`test/tsconfig.legacyDecorators.json`, added in this release).

## Reproduction

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review
grep -n "SeedOptions\|SessionStorageOptions\|AllEntries\|Decoded" website/src/content/docs/docs/typescript.md   # exit 1, no match
grep -n "^export\|type AllEntries\|type Decoded\|type SeedOptions\|type SessionStorageOptions" index.ts | head      # the four in the export list
ls test/tests/packaging/                                                                                           # esmEntry.spec.mts publicTypes.emit.ts publicTypes.typecheck.ts stepLegacyDecorators.typecheck.ts
```

## Observed / expected

- Observed: the table names 28 type-only exports and the 3 classes; the 4 session storage types exported in 3.0.2 are missing. Packaging says "Two compile-only files".
- Expected: the table lists every exported type, with a storage row such as "`SessionStorage`, `SessionStorageSchema`, `SessionStorageOptions`, `SeedOptions`, `Codec<T>`, `Decoded`, `AllEntries`". Packaging names the third file and what it checks.

## Cause

`7447754` updated the API pages, not the guide page. `4f80b37` and `d91fa33` added the legacy-decorator check without touching *Packaging*.

## Fix plan

- **Intended contract**: the TypeScript page's table matches `index.ts`'s type exports; *Packaging* names every compile-only check of the published types.
- **Options**: A (recommended), edit both pages. No alternative.
- **Implementation steps**:
  - `website/src/content/docs/docs/typescript.md:32`: extend the storage row, linking each to its section on `api/class-sessionstorage.md`.
  - `website/src/content/docs/internal/packaging.md:42-44`: three files, the third checking `@step` under `experimentalDecorators`.
  - AGENTS.md §4 also lists only two compile-only files under `packaging/`; §3 mentions the third. Optionally align it.
- **Tests**: none. `pnpm docs:build` for the links.
- **Docs**: as above.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] Update both pages (and AGENTS.md §4), with F-1's and F-2's types and decisions 24 and 33's checks; plus a table check in `check-api-coverage.mjs` ([DECISIONS.md #48](../DECISIONS.md))
- **Execution order**: with F-1 and F-2, which may add rows to the same table.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").
