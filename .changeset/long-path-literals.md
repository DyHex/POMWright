---
"pomwright": patch
---

A path literal of any length compiles; one of 999 characters or more failed with TS2589. A path that breaks several
rules now names all of them, in the same order at compile time and at run time, and checking path types is faster.
`add(path)` throws for a path that breaks a rule, where its locator method threw before:

```text
LocatorSchemaPath string cannot contain whitespace chars and cannot start with a dot: .main list
```

A path that breaks one rule keeps its message.
