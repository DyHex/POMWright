---
"pomwright": patch
---

`set`, and `clear` with several keys, write or remove one key at a time, as Playwright's `setItem` and `removeItem` do.
When the page navigates during the batch, the call now fails with the helper's label, says so, and names the keys
already done, which stay:
`Shop.SessionStorage.set: the page navigated while set() was writing to https://shop.example; 2 of 60 keys were written (k0, k1)`.
Before, it failed with Playwright's raw `Execution context was destroyed`. Any other error from Playwright now gets the
helper's label in front of its message, with the original as `cause`.
