---
editUrl: false
next: false
prev: false
title: "LocatorQueryBuilder"
---

> **LocatorQueryBuilder**\<`LocatorSchemaPathType`, `Path`\> = `LocatorQueryBuilderInternal`\<`LocatorSchemaPathType`, `Path`\>

Defined in: locators/locatorQueryBuilder.ts:40

What `getLocatorSchema(path)` returns, and every step of its chain: a clone of the path's chain whose
`filter`, `nth`, `clearSteps`, `skip`, `unskip`, `describe`, `update` and `replace` calls change only the clone.

## Type Parameters

### LocatorSchemaPathType

`LocatorSchemaPathType` *extends* `string`

### Path

`Path` *extends* `RegistryPath`\<`LocatorSchemaPathType`\>

## Example

```ts
export const lastRow = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.item"> =>
  registry.getLocatorSchema("list.item").nth("last");
```
