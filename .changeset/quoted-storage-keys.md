---
"pomwright": patch
---

Session storage messages quote the keys they name, as `get`'s messages always did: `(keys: "orderId")` instead of
`(keys: orderId)`, so an empty key, or one holding `, `, reads as itself. Of the released messages, those of a seed whose
write the browser refused and of a seed that was never applied change.
