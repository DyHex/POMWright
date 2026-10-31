---
"pomwright": patch
---

`AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` are exported from `pomwright`, so a consumer can name
what `get` returns and the options of `seed` and of `new SessionStorage()`. The docs say every type is imported from
`pomwright`; these four were used in public signatures but not exported. Each has a section on the `SessionStorage` API
page, marked as added in 3.0.2.
