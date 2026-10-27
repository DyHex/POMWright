---
"pomwright": patch
---

`createRegistryWithAccessors` requires its paths as a type argument. Without one, the first path is a compile error that
says so:

```text
Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
```

Before, the paths were inferred as `string`, so no path was checked and no sub-path compiled. Pass the path union,
`createRegistryWithAccessors<Paths>(page)`, or `<string>` to keep paths unchecked at compile time.
