---
"pomwright": patch
---

An app that declares its own global `navigation` (`var navigation = …`) no longer makes `seed` fail with
"seed() needs the Navigation API … and this browser has none". The check now tests the `NavigationActivation`
interface, which such a declaration does not hide.
