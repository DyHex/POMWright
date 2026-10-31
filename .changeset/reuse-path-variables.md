---
"pomwright": patch
---

`add(path, { reuse })` compiles when the paths are variables: of the path union, of a template union in a loop, or wide
strings. A literal path that reuses itself is still a compile error, and any self-reuse still throws at the call:

```ts
for (const action of actions) {
  registry.add(`dialog.button@${action}`, { reuse: `main.toolbar.button@${action}` }); // compiles now
}
```

Before, a reuse was refused as "the same as registration path" whenever the registration path's type covered the reuse
path's, whatever the values, and a union-typed `reuse` matched none of the options.
