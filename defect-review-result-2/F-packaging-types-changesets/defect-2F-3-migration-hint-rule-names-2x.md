# 2F-3: The changeset rule asks for a migration hint when something "a 2.x user wrote" stops working; in 3.x the code that breaks is the previous 3.x release's

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 109 in [DECISIONS.md](../DECISIONS.md); planned in the contributor guide plan
- **Area**: Changesets: the rule for a changeset's body, `docs/versioning.md` *Changesets* (the contributor guide;
  shared with 2I)
- **Severity**: Low (the 3.0.2 changesets give their hints anyway; read literally, the rule exempts every break between
  two 3.x releases)
- **Semver of the fix**: none (contributor guide only)
- **Pass**: 1
- **First review**: missed by the first review (the sentence dates from 81f122f, 2026-10-06, before `54cdada`, and
  moved unchanged to `docs/versioning.md` in 9923a9f; pass 2 confirms)
- **Reviewed**: `d850405`, 2026-10-28T17:27:40+01:00, Opus 5.5, second review, segment 2F

## Contract

`docs/versioning.md:22-23`, *Changesets*:

> Call out consumer-facing API or behavior changes in the changeset body, with a migration hint whenever something
> a 2.x user wrote stops working.

The same file's *Bumps* rule (line 24 on) lets a patch stop code from compiling when the type is corrected to what the
docs promise, "(its changeset gives the migration)", which is about code written against the current 3.x release.

## Reproduction

The page and its text, above. What the rule governs on this branch: the pending changesets announce four changes that
stop code written against 3.0.1 from compiling. `/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/breaks/breaks.ts`
holds one case of each (a registry created without its paths, a schema value without its type, a key typed `string`
read as a string, a RegExp page's helper typed as a string page's), compiled with TypeScript 6.0.3 against
`pomwright@3.0.1` from npm (`F/npm301`) and against the baseline tarball (`F/npmproj`):

```bash
cd /home/magdys/workspace/dyhex/POMWright-second-review-probes/F
for proj in npm301 npmproj; do cp breaks/breaks.ts $proj/breaks.ts; (cd $proj && node node_modules/typescript/bin/tsc \
  --noEmit --strict --target es2022 --types node --module esnext --moduleResolution bundler breaks.ts; echo "$proj exit $?"); done
```

```text
npm301 exit 0
breaks.ts(10,6): error TS2345: Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
breaks.ts(12,26): error TS2345: …
breaks.ts(19,64): error TS2322: Type '{ user: Codec<{ name: string; }>; }' is not assignable to type 'Record<string, "declare the schema's type in the page object's type options: PageObject<Paths, { storage: typeof schema }>">'. …
breaks.ts(27,2): error TS2322: Type 'string | { name: string; } | null' is not assignable to type 'string | null'. …
breaks.ts(38,14): error TS2322: Type 'NavigationFor<string, UrlMatcher>' is not assignable to type 'NavigationFor<string, string>'. …
npmproj exit 2
```

Each of the four changesets (`registry-requires-paths.md`, `schema-type-and-value.md`, `storage-string-key-types.md`,
`navigation-for-goto.md`) gives a hint for 3.0.1 code, which the rule as written does not ask for: none of the four is
"something a 2.x user wrote" more than something a 3.0.1 user wrote.

## Observed / expected

Observed: the rule names the major version before 3, written for the 3.0.0 release, and was carried into
`docs/versioning.md` unchanged when the guide was split.

Expected: a rule that holds for every release, for example "with a migration hint whenever code written against the
previous release stops working (compiling, or behaving as it did)".

## Cause

`docs/versioning.md:23`, from the 3.0.0 working folder's rewrite of the guide (81f122f), not revisited after 3.0.0.

## Fix plan

- Intended contract: every changeset whose change stops existing code from compiling or behaving as before carries a
  migration hint, whatever the version.
- Option (recommended): reword `docs/versioning.md:22-23` as above. Nothing else depends on the wording.
- Changeset: none (contributor guide).
- Sits with 2I's review of the guide.
