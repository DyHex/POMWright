---
"pomwright": patch
---

`set` and `seed` store an entry whose key is `__proto__`. Before, the entry was dropped without an error: `set` and
`seed` resolved, and nothing was stored.

```ts
await storage.set("__proto__", "x");          // now stored, as page.sessionStorage.setItem stores it
await storage.set(JSON.parse(savedSnapshot)); // a snapshot with that key keeps it
await storage.seed("__proto__", "x");         // written on arrival
```
