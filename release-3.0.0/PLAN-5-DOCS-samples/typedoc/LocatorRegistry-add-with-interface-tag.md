<!-- TypeDoc 0.28.20 with typedoc-plugin-markdown 4.14.0, LocatorRegistry given an @interface tag in a scratchpad clone; the add() entry only. -->

### add()

> **add**\<`Path`, `Reuse`\>(`path`, ...`args`): `Reuse` *extends* `undefined` ? `LocatorRegistrationPreDefinitionBuilder`\<`LocatorSchemaPathType`, `RegistryPath`\<`LocatorSchemaPathType`\>\> : `Reuse` *extends* `LocatorSchemaPathType` ? `LocatorRegistrationPostDefinitionBuilder`\<`LocatorSchemaPathType`, `RegistryPath`\<`LocatorSchemaPathType`\>\> : `LocatorRegistrationSeededBuilderForType`\<`LocatorSchemaPathType`, `RegistryPath`\<`LocatorSchemaPathType`\>, `Extract`\<`Reuse`, [`ReusableLocator`](../type-aliases/ReusableLocator.md)\<`LocatorSchemaPathType`\>\>\[`"type"`\]\>

Registers a locator schema at the provided dot-delimited path.
Accepts exactly one locator strategy (`getByRole`, `locator`, etc.) and any number of
`filter`/`nth` steps chained in call order; calling a second strategy throws.

With `{ reuse: "other.path" }` the path is registered at once as a copy of that registered
path (its strategy, its steps and an explicit description), and `filter`, `nth` and
`describe` narrow the copy after the copied steps; there is no strategy override, the source
never changes, and a copy of an any-frame `frameLocator()` takes no steps.

With `{ reuse: seed }` (from `createReusable`) the seed is registered at once, and one
override of the seed's strategy may come first as a PATCH, as `update()` patches, followed
by `filter`, `nth` and `describe`. Any other reuse value throws.

#### Type Parameters

##### Path

`Path` *extends* `string`

##### Reuse

`Reuse` *extends* `string` \| [`ReusableLocator`](../type-aliases/ReusableLocator.md)\<`LocatorSchemaPathType`\> \| `undefined` = `undefined`

#### Parameters

##### path

[`LocatorSchemaPathArgument`](../type-aliases/LocatorSchemaPathArgument.md)\<`Path`\>

##### args

...`Reuse` *extends* `undefined` ? \[\] : \[`options`: `object`\]

#### Returns

`Reuse` *extends* `undefined` ? `LocatorRegistrationPreDefinitionBuilder`\<`LocatorSchemaPathType`, `RegistryPath`\<`LocatorSchemaPathType`\>\> : `Reuse` *extends* `LocatorSchemaPathType` ? `LocatorRegistrationPostDefinitionBuilder`\<`LocatorSchemaPathType`, `RegistryPath`\<`LocatorSchemaPathType`\>\> : `LocatorRegistrationSeededBuilderForType`\<`LocatorSchemaPathType`, `RegistryPath`\<`LocatorSchemaPathType`\>, `Extract`\<`Reuse`, [`ReusableLocator`](../type-aliases/ReusableLocator.md)\<`LocatorSchemaPathType`\>\>\[`"type"`\]\>

#### Example

```ts
registry
  .add("list.item")
  .getByRole("listitem", { name: /Row/ })
  .filter({ hasText: "Row" })
  .nth("last");
registry.add("list.lastItem", { reuse: "list.item" }).describe("Last row");
```

***
