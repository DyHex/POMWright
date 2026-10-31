---
"pomwright": patch
---

On a page object whose `baseUrl` is a RegExp, `goto(target)` no longer compiles for a relative target that holds a
colon (`"/orders?at=12:00"`, `"?at=12:00"`, `"1:2"`), which it always rejected at run time: the target's type now
requires a scheme that starts with a letter. A `string` that holds a URL narrows with a cast,
``goto(url as `https://${string}`)``.
