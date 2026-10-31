---
"pomwright": patch
---

Overlapping session storage calls on an `about:blank` page that inherited an origin, such as a popup from `window.open()`, act in the order they were made, also when one comes from a page object's helper and another from a standalone one; before, the earlier value could win.
