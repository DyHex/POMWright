# 2F-1: *Installation* says TypeScript 5.0 needs `skipLibCheck` for Playwright's declarations; it is TypeScript 5.0 and 5.1, depending on `@types/node`, and for Node's declarations as much as Playwright's

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 106 in [DECISIONS.md](../DECISIONS.md); done 2026-10-30 in `a0102ac`
- **Area**: Docs: `docs/installation.md` *TypeScript settings*; the TypeScript floor (5.0)
- **Severity**: Low (POMWright's own declarations compile on every 5.x; the sentence only misplaces when a consumer's
  `tsc` needs `skipLibCheck` for other packages' declarations)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada (612a62a, 2026-10-27, which added the consumer job and the sentence, worded by
  decision 58 from the first review's `F/ts-versions/` probe: TypeScript 5.0, 5.4, 5.6, 5.8, 5.9, 6.0 and 7.0, never 5.1)
- **Reviewed**: `d850405`, 2026-10-28T17:21:03+01:00 (probe), 2026-10-28T17:27:09+01:00 (written), Opus 5.5, second review, segment 2F

## Contract

`website/src/content/docs/docs/installation.md:55-56`, *TypeScript settings*:

> POMWright needs no `tsconfig.json` setting of its own. Its declarations compile with TypeScript 5.0 and later; 5.0
> needs `skipLibCheck` for Playwright's own declarations.

`scripts/consumer-check.sh:9` says the same ("TypeScript 5.0 (with skipLibCheck, for Playwright's own declarations)"),
and `docs/versioning.md` *Supported versions* ties the floor to the README badge, this sentence and the script's loop.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/floor/run.sh`: for `@types/node` 20, 22 and 24, an npm
project with the baseline tarball, `@playwright/test@1.64.0` and TypeScript 5.0, 5.1 and 5.2, compiling
`scripts/consumer/consumer.ts` without `skipLibCheck` (`--strict --target es2022 --types node --module esnext
--moduleResolution bundler`), counting errors by the package they are in.

```bash
bash /home/magdys/workspace/dyhex/POMWright-second-review-probes/F/floor/run.sh
```

Exit 0 (the script reports each compile's own exit code). Output (`floor/run.out`):

```text
TypeScript 5.0.4, @types/node 20.19.43: exit 0; errors in playwright-core 0, @types/node 0, pomwright 0
TypeScript 5.1.6, @types/node 20.19.43: exit 0; errors in playwright-core 0, @types/node 0, pomwright 0
TypeScript 5.2.2, @types/node 20.19.43: exit 0; errors in playwright-core 0, @types/node 0, pomwright 0
TypeScript 5.0.4, @types/node 22.20.5: exit 2; errors in playwright-core 0, @types/node 2, pomwright 0
TypeScript 5.1.6, @types/node 22.20.5: exit 0; errors in playwright-core 0, @types/node 0, pomwright 0
TypeScript 5.2.2, @types/node 22.20.5: exit 0; errors in playwright-core 0, @types/node 0, pomwright 0
TypeScript 5.0.4, @types/node 24.19.2: exit 2; errors in playwright-core 24, @types/node 59, pomwright 0
TypeScript 5.1.6, @types/node 24.19.2: exit 2; errors in playwright-core 24, @types/node 57, pomwright 0
TypeScript 5.2.2, @types/node 24.19.2: exit 0; errors in playwright-core 0, @types/node 0, pomwright 0
```

Playwright's 24 errors are all `Symbol.asyncDispose` (TS1169 and TS2339: `Property 'asyncDispose' does not exist on
type 'SymbolConstructor'`, `playwright-core/types/types.d.ts:5919` and 11 more), a symbol TypeScript's own lib has
from 5.2 and that `@types/node` 20 declares for older compilers.

## Observed / expected

Observed: the need for `skipLibCheck` below TypeScript 5.2 depends on the `@types/node` version, not on 5.0 alone.
With the `@types/node` the repository and `consumer-check.sh` use (24), 5.1 fails exactly as 5.0 does; with
`@types/node` 22, 5.0 fails on Node's declarations only and Playwright's compile; with `@types/node` 20, nothing needs
it. POMWright's declarations have no error in any of the nine compiles (and none on 5.0 to 5.9 with either decorator
mode: `npmproj/pt-results.txt`).

Expected: a sentence a TypeScript 5.1 user can act on, for example "Below TypeScript 5.2, Playwright's and Node's
declarations may need `skipLibCheck`, depending on the `@types/node` version; POMWright's own declarations do not."

## Cause

The sentence was written from the consumer check, which tests 5.0 only (with `skipLibCheck`) and with `@types/node`
24 only (`scripts/consumer-check.sh:29,35`), so 5.1 was never compiled.

## Fix plan

- Intended contract: the floor stays 5.0 (POMWright's declarations compile there); the page says which compilers and
  which `@types/node` need `skipLibCheck`, and for whose declarations.
- Options: (a, recommended) reword the sentence on *Installation* as above, and the comment in
  `scripts/consumer-check.sh:9`; (b) also add 5.1 to `TYPESCRIPT_VERSIONS` with `skipLibCheck`, so the claim for 5.1
  is tested; it costs one more TypeScript download per consumer run.
- Docs: `website/src/content/docs/docs/installation.md` *TypeScript settings*; the README badge is unchanged.
- Changeset: none (docs only).
