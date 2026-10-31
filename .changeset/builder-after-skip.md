---
"pomwright": patch
---

An `update()` or `replace()` builder taken before `skip()` now throws when it applies its change to the skipped segment,
as `update()` and `replace()` on a skipped segment already did. A skipped segment is never changed until `unskip()`:

```ts
const query = getLocatorSchema("main.list.item");
const pending = query.update("main.list");
query.skip("main.list");
pending.locator("ol"); // update() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
```

Before, the change went through silently and appeared after `unskip()`.
