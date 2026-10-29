# 2H-2: "misspelt", the British form, is left on four pages and in a doc comment after the change to American spelling throughout

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 108 in [DECISIONS.md](../DECISIONS.md); planned in the contributor guide plan (final pass)
- **Area**: the language conventions across the pages and the doc comments (`website/AGENTS.md`, *Rules*: American
  spelling)
- **Severity**: Low (a style rule the guide states, kept "by review", broken in five places; no reader is misled)
- **Semver of the fix**: none (docs and a doc comment only)
- **Pass**: 1
- **First review**: H-6: fixed incompletely. All five were present at 54cdada (`git grep -n misspelt 54cdada`); H-6's
  word list and its "wider search over every word ending in -ise, -ising, -isation, -our, -lled" did not reach the
  irregular `-t` past participle, so decision 52 and 3e37c74 left them (pass 1 had this as new; corrected in pass 2)
- **Reviewed**: `d850405`, 2026-10-28T19:10:42+01:00, Opus 5.5, second review, segment 2H

## Contract

- `website/AGENTS.md`, *Rules*, page shapes: "Plain sentences, one idea each, no marketing, no "simply" or "just",
  American spelling."
- `website/AGENTS.md`, *The site's scripts*: "Considered and not planned: … a spelling check (the American spelling rule
  above is kept by review)."
- 3e37c74's message: "The pages, the README, AGENTS.md, the doc comments, the changesets and the package description use
  American spelling".

## Reproduction

```sh
cd /home/magdys/workspace/dyhex/POMWright-second-review
grep -rn 'misspelt' README.md website/src/content/docs src --include='*.md' --include='*.ts' | grep -v '\.test\.ts'
grep -c 'misspelt' dist/index.d.ts
```

Exit 0. Output:

```text
website/src/content/docs/docs/verifying-registries.md:10:or a misspelt `has` reference. The rest can be found without a browser, and POMWright finds them all at once:
website/src/content/docs/docs/typescript.md:73:A subclass calls `this.clickOn("main.button@save")`, and a misspelt path is a compile error at that call.
website/src/content/docs/docs/principles.md:46:checked like a literal. TypeScript adds what it can check for free: paths that are not in the union, misspelt `has`
website/src/content/docs/docs/filters-and-indices.md:67:not from the top of the page. A misspelt path is a compile error. The path may be registered after the filter that
src/locators/locatorRegistry.ts:52: * in its paths takes its path parameter with it, so a misspelt path is a compile error where the helper is called. On a
1
```

The last line: the doc comment of `LocatorSchemaPathArgument` reaches the published declarations, so the editor's hover
shows it.

A wider search (every `-ise`, `-our`, `-lled`, `-yse`, `-ogue` and `-t` past-tense form, over the README, every page,
`website/snippets/` and the non-test sources) found no other British form in prose. The README's `"Cancelled"` (lines 29
and 102) is a status string of the example app, not prose; it sits beside "Canceling `ORD-1042`" (line 106), which
follows the rule.

## Observed / expected

Observed: "misspelt" in five places. Expected: "misspelled", as everywhere else the rule reached.

## Cause

3e37c74 replaced the British forms it searched for (`organis-`, `-our` and the like) and did not include the irregular
past participle `-spelt`.

## Fix plan

- Replace "misspelt" with "misspelled" in `docs/verifying-registries.md`, `docs/typescript.md`, `docs/principles.md`,
  `docs/filters-and-indices.md` and the doc comment of `LocatorSchemaPathArgument` in `src/locators/locatorRegistry.ts`.
- Optional, the maintainer's call: the example app's status `"Cancelled"` in the README could be `"Canceled"`; it is
  data, not prose, and both spellings appear in real apps, so the rule does not require it. If changed, the README's
  two lines and `docsChains.spec.ts` (if it reads the status) change together.
- Tests: none. No changeset (docs and a doc comment; `docs/versioning.md` needs none for a docs-only change, though the
  doc comment ships in the declarations; a patch release carries it anyway).
