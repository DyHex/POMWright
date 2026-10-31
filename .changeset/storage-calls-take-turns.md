---
"pomwright": patch
---

Session storage calls for one origin act in the order they were made, also when they overlap: on the origin the page is
on as well as before a hop, and for `set`, `get` and `clear` as well as `seed`.

3.0.1 made overlapping `seed` calls for an origin the page is not on merge in call order. On the origin the page is
already on, `seed` still wrote key by key, and two overlapping calls interleaved, so an earlier value could win:

```ts
await page.goto("https://shop.example/account");
await Promise.all([storage.seed({ first: "1", shared: "earlier" }), storage.seed({ shared: "later" })]);
// shared was "earlier"; it is now "later"
```

`set`, `get` and `clear` interleaved the same way. Every call now takes its turn per page and origin, across every
helper on the page (a page object's and a standalone one), so overlapping calls end exactly as awaited ones do. A call
that waited checks the origin again when its turn comes. A helper with an origin throws the usual origin message if the
page has left it; a helper without one fails, and does nothing, if the page has left the origin the call was made on,
rather than act on an origin it was not called on:
`Shop.SessionStorage.set: the page left https://shop.example for https://login.example while set() waited for its turn; the call did nothing`.
A call takes its arguments when it is made, as Playwright's calls do: before, `set` and `seed` encoded their values in
their step, and `get` and `clear` read their key lists in their turn, so a value or a list changed after the call, while
it waited, changed what it did. Awaited calls behave as before.
