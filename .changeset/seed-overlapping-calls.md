---
"pomwright": patch
---

Overlapping `seed` calls for one origin now merge as if each had been awaited in turn, in the order they were made,
later values winning per key.

In 3.0.0, two `seed` calls for the same origin that overlapped (in a `Promise.all`, or a call that was not awaited)
could:

- lose one call's entries, so the "was never applied" message listed only some of the keys;
- fail with `disposableObject.dispose: disposable@… is disposed more than once`;
- leave an init script behind that wrote the seeded values again after every return from another origin, overwriting
  what the app had stored there, with no error.

Each call keeps its own checks. A commit on the origin is now noticed from the moment `seed` is called, so a call made
while the page was arriving there fails at the call ("the page committed a document on … while seed() was
registering"). Before, it could resolve while the app loaded without the entries, and the test failed later as never
applied: on Chromium, a `seed` that was not awaited before a `goto` on a fresh page did. Awaited calls behave as before.

Await `seed` before the action that starts the hop. A `Promise.all` of seeds is fine; the seeding page's new
[Several seeds](https://dyhex.github.io/POMWright/docs/seeding-session-storage/#several-seeds) section explains when
it helps.
