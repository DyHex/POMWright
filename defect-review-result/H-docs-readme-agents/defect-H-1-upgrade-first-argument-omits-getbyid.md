# H-1: *Upgrading from 2.x* lists three methods that reject an empty first argument; `getById` is the fourth, and its `update` case is a 2.x change no section states

- **Kind**: documentation
- **Area**: `docs/upgrading-from-2x.md` (one body: the primary-argument rules), inventory §8
- **Severity**: Low (an incomplete list in a migration guide; the page states `getById("")` throws at registration in
  another section, but not for `update`, where 2.x accepted it)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided (2026-10-27, [DECISIONS.md #45](../DECISIONS.md))

## Contract

- AGENTS.md §5: "an empty string is rejected only where Playwright cannot use it (`locator`, `frameLocator`,
  `getByRole`, `getById`)", on every builder.
- `api/errors.md`, *A first argument that is missing or empty* (lines 63–68), lists the same four.
- `docs/registering-locators.md`, *The first argument* (lines 90–92), names the same four.
- AGENTS.md §9: "one home per fact"; a page that restates a rule restates it as the rule is.

## Reproduction

The page, `website/src/content/docs/docs/upgrading-from-2x.md`, *Every strategy method needs its first argument*,
lines 175–178:

> Every builder, `update` and a seeded `add` included, throws when it is an empty string for `locator`, `frameLocator`
> and `getByRole`, which Playwright cannot use, […] In 2.x such a registration was stored and failed later, or
> registered without its value.

The only other mention, in *`getById` takes the id as written* (line 73): "`getById("")` throws at registration." It
says nothing of `update().getById("")`.

What 2.x did (read at the tag):

- `git show v2.1.0:src/locators/locatorRegistrationBuilder.ts`, lines 390–396: `getById("")` is falsy, so the
  registration stores `{ type: "id" }` without an id ("registered without its value"); resolution then reads
  `definition.id.source` of `undefined` (`git show v2.1.0:src/locators/utils.ts`, lines 148–155).
- `git show v2.1.0:src/locators/locatorUpdateBuilder.ts`, lines 583–592: `update().getById("")` stores `id: ""`, which
  resolves to the selector `#` and fails at use.

What 3.x does, probed against the packed build
(`/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/firstarg/zz-probe-H-firstarg.spec.ts`, copied to
`test/tests/` and run with
`pnpm -C test exec playwright test tests/zz-probe-H-firstarg.spec.ts --project=chromium --reporter=line`, exit 0):

```text
add getById(''): getById requires a non-empty id for "main.a".
update getById(''): getById requires a non-empty id for "main.b".
add getByRole(''): getByRole requires a non-empty role for "main.d".
```

## Observed / expected

Observed: the section that states the rule for 2.x users names three methods; `update().getById("")`, accepted by 2.x
and now a throw at the call, is in no section of the page.

Expected: the section names the four methods that every other statement of the rule names, so the `update` and seeded
cases of `getById` are covered by the same sentence.

## Cause

The sentence was written before `getById("")` joined the rule (or with the id case left to the `getById` section,
which covers only registration).

## Fix plan

- **Intended contract**: unchanged; the page states it fully.
- **Options**:
  - (recommended) Add `getById` to the sentence: "an empty string for `locator`, `frameLocator`, `getByRole` and
    `getById`, which Playwright cannot use" (an empty id is invalid HTML, as *Registering locators* says), and add the
    `getById` message to the example block.
  - Leave the sentence and extend line 73 to "throws at the call, on `update` and a seeded `add` too". Two homes for
    one rule; not recommended.
- **Implementation steps**: `website/src/content/docs/docs/upgrading-from-2x.md`, lines 175–184.
- **Tests**: none; the snippet check is unaffected (`text` block).
- **Docs**: that page only.
- **Changeset**: none (site only).
- **Decisions to tick**:
  - [x] name `getById` in the *Every strategy method needs its first argument* sentence ([DECISIONS.md #45](../DECISIONS.md))
- **Execution order**: independent.
