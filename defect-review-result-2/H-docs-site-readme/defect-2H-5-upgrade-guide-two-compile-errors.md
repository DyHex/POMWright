# 2H-5: *Upgrading from 2.x* misses one compile error a 2.x project meets in 3.0.2 (`createRegistryWithAccessors` without its type argument) and marks another (a structured value without a codec) **Compiles**

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 101 in [DECISIONS.md](../DECISIONS.md) (the upgrade guide: four fixes and the sentence that a project meets only some items); planned in its own docs plan
- **Area**: *Upgrading from 2.x* as a whole (its claim to list every change), and the README's *Documentation* line
  that repeats the claim
- **Severity**: Low (both are compile errors, so `tsc` finds them, and the first names its fix in its own text; but the
  page and the README promise every change, and the page's step 3 tells the reader that items marked **Compiles** need
  only a search)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: first gap new since 54cdada (49454c6 added the `NeedsPaths` default to `createRegistryWithAccessors`;
  e571381 then rewrote the page to "describe 3.x" without it); second gap missed by the first review (the marker is at
  54cdada, from 6f2c87d; H read the page's session storage section for consistency only)
- **Reviewed**: `d850405`, 2026-10-28T19:18:52+01:00, Opus 5.5, second review, segment 2H

## Contract

- *Upgrading from 2.x*, front matter: "Every change a POMWright 2.x project meets in 3.x"; *Introduction*: "Most of what
  a 2.x project wrote keeps working; this page lists everything that does not".
- *How to upgrade*, steps 2–3: "Run `tsc`. Removed and renamed APIs are compile errors: the items marked **compile
  error** say what to write instead. Search for the changes that still compile but behave differently, the items
  marked **compiles**."
- The page's own convention for mixed outcomes: "**Fails at run time** or **compiles**" (*From JavaScript: `describe`
  and `nth`*), "**Compile error**, where code relied on the old return type" (*Reuse by path returns …*).
- `README.md` line 165–166: "Upgrading from 2.x: every change in 3.x a 2.x project meets, and what to write instead".
- `docs/versioning.md`, *Changesets*: "Call out consumer-facing API or behavior changes in the changeset body, with a
  migration hint whenever something a 2.x user wrote stops working."

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/upgrade/consumer.ts` is a 2.x consumer: one tagged block
per 2.x API a project uses (every 2.x export, the registry and its accessors, a locator module, registration, reuse,
seeds, every query method, a page object with options and actions, navigation, a RegExp page, every `SessionStorage`
overload, the logger and the fixture, a static `@step`). It is compiled unchanged against three builds, each with the
root's compiler options (`strict`, `noUncheckedIndexedAccess`, `types: ["node"]`) and TypeScript 6.0.3:

- `v2/`: `pomwright` linked to the v2.1.0 worktree (`git worktree add … v2.1.0`, `pnpm install`, `pnpm build`), with
  its own `@playwright/test` 1.62.1;
- `v301/`: `pomwright` linked to `npm pack pomwright@3.0.1`, extracted;
- `v3/`: `pomwright` linked to the worktree's `.pack/pomwright` (d850405).

The v2.1.0 worktree was removed at the end of the segment; `v2/node_modules/pomwright` links to where it was. To run the
2.x side again, recreate it first (Node 24, pnpm 12; its `packageManager` pins pnpm 9.12.0, which corepack fetches):

```sh
git -C /home/magdys/workspace/dyhex/POMWright-second-review worktree add --detach \
  /home/magdys/workspace/dyhex/POMWright-second-review-probes/H/v2.1.0 v2.1.0
pnpm -C /home/magdys/workspace/dyhex/POMWright-second-review-probes/H/v2.1.0 install --frozen-lockfile
pnpm -C /home/magdys/workspace/dyhex/POMWright-second-review-probes/H/v2.1.0 build
```

```sh
T=/home/magdys/workspace/dyhex/POMWright-second-review/node_modules/.bin/tsc
U=/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/upgrade
$T -p $U/v2/tsconfig.json; echo $?      # 0
$T -p $U/v301/tsconfig.json; echo $?    # 2
$T -p $U/v3/tsconfig.json; echo $?      # 2
```

The two blocks in question:

```ts
// [U02] createRegistryWithAccessors without a type argument (2.x docs' prose form)
const { add, getNestedLocator } = createRegistryWithAccessors(page);
add("main").locator("main");

// [U18] an object without a type argument
const s = new SessionStorage(page, { label: "Storage" });
await s.set({ user: { name: "Ada", age: 36 } });
```

## Observed / expected

At d850405, 22 errors; every one but these maps to an item of the page (`UrlTypeOptions`, steps before the strategy,
`: void` on reuse by path, `replace()` without a first argument, `remove`, `@step` on a sync method, `gotoThisPage`,
`waitForLoadState`, `fullUrl.source`/`flags`/`toMatch`, `set<User>`, `reload`/`waitForContext`, `setOnNextNavigation`,
`get<User>`, `clear([])`). The two that do not:

```text
consumer.ts(33,7): error TS2345: Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
consumer.ts(34,27): error TS2345: … (the same, for getNestedLocator("main"))
consumer.ts(155,17): error TS2322: Type '{ name: string; age: number; }' is not assignable to type 'string'.
```

- **`createRegistryWithAccessors` without a type argument.** Compiles on 2.x and on 3.0.1 (the `v301` run prints 20
  errors, the same as d850405's without lines 33 and 34); fails on 3.0.2. 2.x's own docs name the call that way in prose (`docs/v2/locator-registry.md`
  at v2.1.0, line 156: "`createRegistryWithAccessors(page)` creates a registry instance plus bound helpers"). The 3.0.2
  changeset `registry-requires-paths.md` explains it to 3.0.x users; *Upgrading from 2.x* does not list it.
- **A structured value without a codec.** 2.x's `set<T = unknown>(states: Record<string, T>)` took any value and
  JSON-encoded it; in 3.x a key without a codec takes a string, so `set({ user: { … } })` is a compile error. The item
  that covers it, *Values are stored as written*, is marked **Compiles.** and goes on to show three compile errors
  for the type-argument form. Only plain strings (`set({ token: "abc" })`) compile and behave differently.

Expected: the page lists the first, and the second item's marker says both outcomes, as the page does elsewhere.

## Cause

e571381 ("Upgrading from 2.x describes 3.x") rewrote the page before or without 49454c6's new default being taken into
it; the session storage item's marker describes the string case only.

## Fix plan

- Add an item under *Locators*, for example *`createRegistryWithAccessors` takes its paths*: **Compile error.** "2.x
  inferred the paths as `string` when the call had no type argument, so no path was checked. 3.x requires the union:
  `createRegistryWithAccessors<Paths>(page)`, or `<string>` to keep paths unchecked." With its search:
  `grep -rn 'createRegistryWithAccessors(' --include=*.ts --exclude-dir=node_modules .`. Link
  [Paths and the registry](/POMWright/docs/locator-paths/) where the page explains `<string>`.
- Change *Values are stored as written*'s marker to "**Compiles** for strings; **compile error** for structured
  values and type arguments", in the form the page uses elsewhere.
- While there (same page, no finding of its own): *Steps on a frame segment apply* says "a `filter`, `nth`, `first`
  or `last` on a `frameLocator(selector)` registration" and asks the reader to review registrations "followed by
  `.nth(`, `.filter(`, `.first(` or `.last(`". Neither 2.x nor 3.x has `first()` or `last()` on a registration (the
  declarations of both list only `filter`, `nth` and `describe` after the strategy; the index forms are `nth("first")`
  and `nth("last")`). The item's own search, `grep -rn 'frameLocator('`, is unaffected; the two method names can go.
- Optional: keep `upgrade/consumer.ts` as a regression aid for the page (it is not a test of the package; it belongs in
  the release's working folder, not in `test/`).
- Tests: none. No changeset (docs only).
