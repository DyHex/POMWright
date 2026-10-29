---
"pomwright": patch
---

Every session storage call checks the page's origin before and after each storage call it makes: a batch (`set`, `clear` with several keys, a `seed` on the origin already), a single call, and each read of `get`. When the page has left for another origin, or the document went away during a call (a reload or a redirect within the origin), the call fails with the helper's label, says where the page went (its origin and path, without the query or fragment), and names the keys already done, which stay, and the one in flight, which may have reached the new document:
`Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document`.
A `get` fails rather than return what it may have read from the new document. Before, a navigation between two calls that both succeeded let the rest of a batch write into, or remove from, the other origin's storage, and a call the navigation interrupted failed with Playwright's raw `Execution context was destroyed`. Any other error from Playwright now gets the helper's label in front of its message, with the original as `cause`.
