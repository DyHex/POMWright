---
title: The strategy table
description: "STRATEGIES: one row per locator strategy, read by every check, copy, patch and resolution, and how a strategy is added."
---

Every builder offers the same ten locator methods, and every one of them must check, copy, patch and resolve a
definition the same way for a given strategy. The strategy table is where those per-strategy facts live, so that one
rule is written once. Which methods exist and what they take is on
[Registering locators](/POMWright/docs/registering-locators/#the-ten-methods).

## One row per strategy

POMWright's ten locator methods differ in a few facts: the Playwright method, the name of the first argument, whether
there are options, whether an empty string is a value Playwright matches. Those facts live in one table, `STRATEGIES`
in `src/locators/utils.ts`, one row per strategy. The row of `getByRole`:

```js
role: {
  method: "getByRole",
  primary: "role",
  options: true,
  allowEmpty: false,
  create: (target, definition) => target.getByRole(definition.role, definition.options),
},
```

The fields:

| row field | what it says | example, `role` |
| --- | --- | --- |
| `method` | the method name on every builder and in messages | `getByRole` |
| `primary` | the definition field of the first argument | `role` |
| `options` | whether the strategy takes Playwright's options object | `true` |
| `allowEmpty` | whether `""` is a value Playwright matches, so it is stored | `false` |
| `optionalPrimary` | whether the first argument may be absent: only `frameLocator`, whose absence is the any-frame form | |
| `create` | builds the element locator on a page, a locator or a frame | `target.getByRole(role, options)` |

## Who reads it

Every per-strategy rule reads the table; there is no `switch` on the strategy elsewhere:

- `assertStrategyPrimary` checks a first argument at every builder: present, a string (or a RegExp where Playwright
  takes one), and not empty unless `allowEmpty`. A value Playwright cannot take, `null`, a number or an object, gets the
  missing-value message, so the message is the same on every builder.
- `createLocator` resolves a segment with the row's `create`.
- `cloneLocatorStrategyDefinition` and `assembleDefinition` copy and build definitions field by field.
- `applyDefinitionPatch` (a seeded override), `mergeLocatorDefinition` (`update`) and `buildReplacementDefinition`
  (`replace`) read which field is the first argument and whether options merge.
- Messages name the method: `use replace("…").getByText(…)`, the list of locator methods in the step-before-strategy
  message.

## Why a table

Before the table there were five `switch` statements over the strategies, in `utils.ts` and `locatorUpdateBuilder.ts`,
and a rule, such as which strategies keep an empty string, had to be kept in agreement across all of them. In the table
it is one cell. The types follow it: `satisfies` makes the compiler require a row for every definition type, and
`StrategyMethod`, the union of the `method` column, is the type the builders' method sets are checked against.

## Adding a strategy

1. A definition type in `src/locators/types.ts`, added to `LocatorStrategyDefinition` and `LocatorDefinitionByType`.
2. Its row in `STRATEGIES`.
3. Its method on each builder: the registration, the update builder and `createReusable`.

The type tests of the registration builder, the update builder and `createReusable` compare each builder's methods
with `StrategyMethod`, so they fail until the method exists on every builder, and the unit tests of the table pin every
row.
