---
"pomwright": patch
---

`AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` are exported from `pomwright`, so a consumer can name
what `get` returns and the options of `seed` and of `new SessionStorage()`, as every other public signature already
allows. They were used in the public signatures but not exported. Each has a section on the `SessionStorage` API page.
