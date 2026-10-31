---
"pomwright": patch
---

`verify()` reports an `add(path)` that never got a locator method, such as `add("main.form@login");` written as a
statement: `"main.form@login": add("main.form@login") ended without a locator method (at add("main.form@login.button@login")); give it one or remove it`.
Before, such an `add` registered nothing, every chain below the path left the segment out, and `verify()` passed. A
registry with such an `add` now fails its check, in a page object at its first use: give the `add` its locator method,
or remove it.
