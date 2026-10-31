---
"pomwright": patch
---

A query kept while an ancestor of its path is registered says that the ancestor was registered after the query was
taken, and how to see it, instead of that it has no locator schema:

```text
"shell.list" is not a valid sub-path of "shell.list.item". It is a segment of that path, and it was registered after this query was taken; take a new query with getLocatorSchema("shell.list.item") to use it.
```

The query's behavior is unchanged: it reads its own copy of the chain, taken at `getLocatorSchema`.
