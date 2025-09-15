# LocatorSchemaPath

A `LocatorSchemaPath` is a string used as the unique key for a `LocatorSchema`.  Paths describe the hierarchy of elements on a page and are expressed using dot notation.

## Format and rules

1. Words are separated by `.` (dot).  Each segment becomes a valid sub‑path.
2. A path must start and end with an alphanumeric word.
3. `@` can be used inside a segment to provide a qualifier when multiple elements share the same name.
4. Paths must be unique within the scope of a Page Object Class.

Examples:

- `"topMenu.notifications.button"`
- `"body.section@playground.button@reset"`
- `"common.navMenu.link@login"`

The portion before `@` usually describes the element type (`section`, `button`), while the part after `@` is a friendly identifier (`playground`, `reset`).  This makes long chains readable while still conveying intent.

## Sub paths

Every dot‑delimited segment forms a sub path.  POMWright uses these to scope updates and filters or to select specific `nth` occurrences.

```ts
await profile
  .getLocatorSchema("body.section@playground.button@reset")
  .addFilter("body.section@playground", { hasText: /Primary Colors/i })
  .getNestedLocator();
```

The TypeScript union of all `LocatorSchemaPath` strings gives you auto‑complete and prevents typos during compilation.
