---
"pomwright": patch
---

A page object's failed locator check points the report at the line that created the page object, also when it extends a base class of your own; before, it pointed at the first `super(…)` of the class chain, with a shared base class the same line for every page object.
