---
"pomwright": patch
---

When seeds for several origins are never applied, the failure says "were never applied" and lists each seed with its helper and the line that called it, such as `Pay.SessionStorage.seed at tests/checkout.spec.ts:12:5, for https://pay.example (keys: orderId)`; before, it named and pointed at the first seed only.
