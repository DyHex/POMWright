---
"pomwright": patch
---

With Playwright's step overlay (`video: { show: { test } }`), a `seed` raced by a navigation to its origin (not awaited,
or called while a `goto` is under way) fails at the call, as it does without the overlay, instead of resolving while the
app started without the entries. `seed` now reads the page and watches for a commit from the moment it is called; the
overlay's update ran before `seed`'s step and hid such a commit.
