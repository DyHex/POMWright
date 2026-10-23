# PLAN-D4 — a retained update builder after `skip`

## Intended contract

`update`, `replace`, `filter`, `nth` and `clearSteps` on a segment skipped in the query throw
(`update() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.`). `AGENTS.md`
section 5 and [../src/locators/locatorQueryBuilder.ts#L98-L99](../src/locators/locatorQueryBuilder.ts#L98-L99).

## Verified current behaviour

- `update(subPath)` and `replace(subPath)` check the skip when they are called
  ([../src/locators/locatorQueryBuilder.ts#L120](../src/locators/locatorQueryBuilder.ts#L120),
  [#L324](../src/locators/locatorQueryBuilder.ts#L324)), and return a builder whose strategy method applies the change
  later (`applyUpdate`, [#L283-L290](../src/locators/locatorQueryBuilder.ts#L283-L290); `applyReplacement`,
  [#L332](../src/locators/locatorQueryBuilder.ts#L332)). Nothing checks again at that point.
- `filter`, `nth` and `clearSteps` act at the call, so they have no gap.

Probe, 2026-10-22, chromium, the packed 3.0.1 build: `const pending = query.update("main.list"); query.skip("main.list");
pending.locator("ol")` does not throw. While the segment is skipped the chain is `locator('main').locator('li')`. After
`unskip` it is `locator('main').locator('ol').locator('li')`.

## Assessment

`update(subPath)` and `replace(subPath)` work in two steps: the call picks the segment and checks the skip, and the
builder's strategy method applies the change. A `skip` between the two steps lets the change through with no error.
`filter`, `nth` and `clearSteps` act in one step and have no gap.

The rule the user stated (2026-10-22): while a segment is skipped, none of `update`, `replace`, `filter`, `nth` and
`clearSteps` may change it until `unskip`. Changing a skipped segment is almost always a mistake (the wrong segment, or a
forgotten `unskip`), and "skip, change, unskip" has no use that "change" alone does not cover. So the check belongs at
the moment the change happens, which for `update` and `replace` is the strategy method.

## Options

- **A. Check again when the change is applied**, in `applyUpdate` and `applyReplacement`, with the same message. One
  line each. The five methods then behave the same way: a skipped segment is never changed. It matches the registration
  builders, where a builder kept past a later registry call throws.
- **B. Leave the behaviour, and document** that the check runs at `update()`/`replace()`: rejected, it keeps the gap.
- **C. Reject the finding**: rejected, for the same reason.

**Decided: A** (2026-10-22).

## Tests (A)

Unit (`src/locators/locatorQueryBuilder.test.ts`): a builder from `update` and one from `replace`, the segment skipped
before the strategy method, throws. The query is unchanged afterwards.

## Docs (A)

None beyond the doc comments, whose `@throws` already state the message.

## Changeset (A)

`patch`: "An `update()` or `replace()` builder kept while its segment is skipped throws when it is applied, as calling
`update()` or `replace()` on a skipped segment does."

## Decisions

- [x] Option A (2026-10-22)
