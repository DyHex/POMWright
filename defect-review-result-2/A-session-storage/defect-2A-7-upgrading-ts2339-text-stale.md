# 2A-7: *Upgrading from 2.x* quotes a TS2339 message that TypeScript no longer prints for the 2.x lines

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 101 in [DECISIONS.md](../DECISIONS.md) (the upgrade guide: four fixes and the sentence that a project meets only some items); planned in its own docs plan
- **Area**: docs: `docs/upgrading-from-2x.md`, *Session storage* → *Values are stored as written*
- **Severity**: Low (a quoted compiler message that does not match what the reader sees; the other two messages and the advice are right)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada: the text (6f2c87d, 2026-10-20) was right at 54cdada, where scope A reproduced the three errors; f422b77 (A-4's fix) changed the third, and e571381 (the 2026-10-28 rewrite of the page) kept it
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

`website/src/content/docs/docs/upgrading-from-2x.md:579-586`:

> `set` and `get` still have a type parameter, for the key names, so TypeScript reads the old `<User>` as a key and reports, for the 2.x lines above:
>
> ```text
> error TS2353: Object literal may only specify known properties, and 'user' does not exist in type 'EntriesFor<{ user: Codec<{ name: string; age: number; }>; }, User>'.
> error TS2344: Type 'User' does not satisfy the constraint 'string'.
> error TS2339: Property 'user' does not exist on type 'string | null'.
> ```

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/t01-types.typecheck.ts` holds the page's `AccountPage` (its 3.x block) and the two 2.x lines, with `type User = { name: string; age: number }`:

```ts
await accountPage.sessionStorage.set<User>({ user: { name: "Ada", age: 36 } });
const { user } = await accountPage.sessionStorage.get<User>(["user"]);
```

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/A/t01-types.typecheck.ts test/tests/zz-probe-A-t01.typecheck.ts
pnpm exec tsc --noEmit -p test
rm test/tests/zz-probe-A-t01.typecheck.ts
```

Exit code 2 (TypeScript 6.0.3, the repository's), output `t01-types.out`:

```text
test/tests/zz-probe-A-t01.typecheck.ts(33,47): error TS2353: Object literal may only specify known properties, and 'user' does not exist in type 'EntriesFor<{ user: Codec<{ name: string; age: number; }>; }, User>'.
test/tests/zz-probe-A-t01.typecheck.ts(34,10): error TS2339: Property 'user' does not exist on type 'string | { name: string; age: number; } | null'.
test/tests/zz-probe-A-t01.typecheck.ts(34,56): error TS2344: Type 'User' does not satisfy the constraint 'string'.
```

Why it changed: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/t03/decoded-54cdada-vs-head.ts` evaluates `Decoded<{ user: Codec<User> }, User>` under the definition at 54cdada and at `d850405` (`pnpm exec tsc --ignoreConfig --noEmit --strict --target es2022 <file>`, exit 2, `t03/out.txt`): `string` at 54cdada, `string | User` now, since a key type that is an object is read as a branded string (`src/helpers/sessionStorage.ts:112-114`).

## Observed / expected

The third message reads `on type 'string | { name: string; age: number; } | null'`, not `'string | null'`. Expected: the page quotes what the compiler prints.

## Cause

f422b77 (*storage values typed per key member*) changed `Decoded` for a key type that is not a literal; the quoted output was not regenerated, and no check compares quoted compiler output with the compiler.

## Fix plan

- **Steps**: replace the third line with the message above (the page lists them in the order TS2353, TS2344, TS2339; the compiler prints them by position, which the page need not follow).
- **Tests**: none; a check of quoted compiler messages would belong to `scripts/check-error-messages.mjs` (2T's area), which checks the messages the types define, not TypeScript's own.
- **Changeset**: none.
- **Decisions**: none.
