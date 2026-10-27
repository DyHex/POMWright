# Scope F: Packaging, public types and changesets

Segment F of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged F, and section 1 in full)
and [../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/F/`.

Review it as an *area* in the skill's terms. The changesets are the release's own record of the change set since
`v3.0.1`, so review them against the commits as a change set.

Part of this scope is a task that has not been done for this release: **the pre-release packaging probes of AGENTS.md
§7, run in full**, in scratch projects in your probes folder. A probe that fails is a finding. A probe that passes is a
*what is sound* line with its command.

## What is in scope

- **Files**: `index.ts`; `package.json` (`main`, `types`, `exports`, `files`, `peerDependencies`, `engines`,
  `packageManager`); the `build` script (tsup) and `scripts/write-esm-entry.mjs`; `tsconfig.json`; `LICENSE`; the
  README as it is published; `.changeset/config.json` and the 31 pending changesets (every `.changeset/*.md` except
  `README.md`); `CHANGELOG.md`, read only, as the format the changesets will land in.
- **Harness**: `test/tests/packaging/` (`esmEntry.spec.mts`, `publicTypes.typecheck.ts`, `publicTypes.emit.ts`,
  `stepLegacyDecorators.typecheck.ts`), `test/tsconfig.declarations.json`, and what `scripts/check-api-coverage.mjs`
  checks of the exports. The script itself belongs to scope G.
- **Docs**: `docs/installation.md`, `docs/typescript.md` (except *The URL types*, which is scope D's),
  `internal/packaging.md`, `api/index.md` (the export list), the *Requirements* section of
  `docs/upgrading-from-2x.md`, and AGENTS.md §1, §5 (public types) and §7 (versioning, the packaging probes).

## Changes since v3.0.1 in this scope

```
2bab383 fix: a default condition in the exports map
7447754 fix: export the session storage types the public signatures use
64cd0b7 fix: a session storage key typed string is typed as any of the schema's values
bd9b115 chore: drop the "Thanks @user!" from changelog entries
```

Plus every changeset against the commit that added it: `git log --format='%h %s' v3.0.1..54cdada -- .changeset/`.

## Known and decided

- Issue 02 (filed): TypeScript 7 once it has a compiler API. Issue 04 (filed, scope G): publish the tarball CI tested.
- AGENTS.md §8: no class re-exported as a public type; no `@internal`/`stripInternal`; no `file:` tarball dependency.
  Playwright is never a runtime dependency. The peer range and the `test/` pin move only by decision.

## Tasks and questions

- **The §7 probes.**
  - The packed file list: `dist/index.js`, `dist/index.d.ts`, `dist/index.mjs`, `dist/index.d.mts`, and nothing else in
    `dist`.
  - Node 20 and 24 loading `index.js` for `require` and `index.mjs` for `import`, with one shared `PageObject`.
  - TypeScript under `node10`, `node16`, `nodenext` and `bundler` resolution.
  - attw (`@arethetypeswrong/cli`, downloaded into the probes folder with `pnpm dlx` or `npx`, never a dependency)
    reporting no problem.
  - Playwright's runner in a CommonJS project and in a `"type": "module"` project.
  - npm's `EBADENGINE` warning on a version below the floor, only if `engines` changed since `v3.0.1` (check with
    `git diff v3.0.1..54cdada -- package.json`).
- **The export surface.** Is everything AGENTS.md §1 names exported, and nothing else reachable from the root? Walk the
  declarations: is every type a public signature uses importable from the root (§5)? Does a consumer's page object,
  registry, seed and query emit declarations without annotations under `declaration: true`, beyond what
  `publicTypes.emit.ts` covers?
- **The peer range.** Does the package work at the top of `>=1.64.0 <2.0.0`, in types and at runtime? Run the harness at
  the latest 1.x with `PLAYWRIGHT_VERSION=<version> bash pack-test.sh --project=chromium --reporter=line` in the
  worktree, then restore the manifests and lockfiles it rewrote (`git checkout -- package.json pnpm-lock.yaml
  test/package.json test/pnpm-lock.yaml`, then `pnpm install --frozen-lockfile` and `pnpm harness:install`).
- **Each changeset.**
  - Is the bump right by §7's rules? Is any of them in truth a minor (a new export, member, option or accepted input),
    or a type change that stops code compiling and needs a migration hint?
  - Is the first line a sentence, never a heading?
  - Does the text describe what the code does now?
  - Is every consumer-facing change since `v3.0.1` covered by a changeset, and is no changeset left over for a change
    that was reverted or reworked later?
  - Does `.changeset/config.json` produce the format §7 describes? Try `pnpm changeset status` and a dry
    `pnpm changeset version` in a throwaway clone in your probes folder, never in the worktree.
- **Docs.** Are installation's requirements, the TypeScript settings and `internal/packaging.md` true for this build?

## Neighbours

The workflows that build, test and publish are scope G. Report what you meet there under *outside the scope* in
`summary.md`.
