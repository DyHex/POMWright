---
"pomwright": patch
---

A query's `describe()` on a path registered as `frameLocator()` without a selector throws at the call, as its
`filter()` and `nth()` do; replace the path first:

```text
describe() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

Before, `describe()` then `replace()` worked while `filter()` then `replace()` threw, so the query's behavior depended
on the order of its calls.
