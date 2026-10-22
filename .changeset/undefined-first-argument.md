---
"pomwright": patch
---

`update()` and a seeded registration (`add(path, { reuse: seed })`) accept `undefined` as the first argument in their
types, as they already did at runtime: it keeps the registered value, as an omitted argument does. A value that may be
undefined can now be passed through:

```ts
declare const role: "button" | "link" | undefined;
getLocatorSchema("main.button@save").update().getByRole(role, { name: "Cancel" }); // compiles; undefined keeps the role
```

A registration and `replace()` still require the first argument, as Playwright's methods do.
