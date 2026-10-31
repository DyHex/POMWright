---
"pomwright": patch
---

`expectThisPage()` and `expectAnotherPage()` say when they time out on the load state of the right URL:
`OrdersPage: reached "https://shop.example/orders", but its "load" state did not come in time (…)`, and
`OrdersPage: left "https://shop.example/orders" for "https://shop.example/login", but its "load" state did not come in time (…)`.
Before, the message named the URL it found as the one it did not expect: `expected URL "…/orders"; found "…/orders"`.
