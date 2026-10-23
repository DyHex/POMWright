# PLAN-D2 — a `__proto__` key is dropped

## Intended contract

A key is stored as given, as `page.sessionStorage.setItem` stores it. The browser accepts `__proto__` as a key
(`sessionStorage.setItem("__proto__", "x")` stores it; probe below).

## Usage, and what happens today

```ts
await storage.set("__proto__", "x");          // resolves; nothing is stored
await storage.set(JSON.parse(savedSession));  // a saved snapshot with a "__proto__" key: every other key is
                                              // stored, that one silently is not
await storage.seed("__proto__", "x");         // resolves; after goto(), nothing is stored
await storage.get("__proto__");               // works: reads the key, if the app or Playwright wrote it
```

Who meets it: a test that copies an app's storage snapshot back in, keys from test data, or fuzzing. It is rare. The
problem is that it fails silently: the call succeeds and the value is not there.

## Why it happens: two places

JavaScript objects have a special `__proto__` property (inherited from `Object.prototype`). Assigning to it with
`obj["__proto__"] = "x"` calls a setter that sets the object's prototype, and ignores a string, instead of creating a
property. Only some ways of building an object create a real `__proto__` key: a computed key (`{ ["__proto__"]: "x" }`),
`JSON.parse`, `Object.fromEntries`, and the spread operator copying one.

1. **`encodeEntries`** ([../src/helpers/sessionStorage.ts#L135-L156](../src/helpers/sessionStorage.ts#L135-L156))
   collects the entries with `encoded[key] = value` into a plain `{}`. The key is lost here, in Node, for `set` and
   `seed` alike.
2. **Playwright's argument transport.** A deferred `seed` sends its entries to the browser as the argument of
   `page.addInitScript`. Playwright serializes that argument and rebuilds the object in the browser, and the own
   `__proto__` key does not survive. Probe, 2026-10-22, chromium: an argument whose own keys in Node are
   `["__proto__", "other"]` arrives in the init script, and in `page.evaluate`, with keys `["other"]`.

So fixing place 1 alone fixes `set` and a `seed` on the origin (each key goes to `page.sessionStorage.setItem` as a
string), but a deferred `seed` still loses the key in place 2.

Both reviews reproduced the loss on chromium, firefox and webkit (opus-D4, codex-D5).

## Is this POMWright's to fix?

Yes. Playwright's own storage API stores the key: `page.sessionStorage.setItem("__proto__", "x")` works, and
`page.sessionStorage.getItem("__proto__")` reads it back (codex-D5 probe). What drops the key is how Playwright carries
a *function argument* into the page (`addInitScript(fn, arg)`, `evaluate(fn, arg)`). That is the vehicle POMWright
chose for its seed entries, not something a user of `seed` sees or chooses. Playwright's equivalent call works, so
POMWright's should too.

**If Playwright changes its serialization later**, A+ keeps working and nothing has to be reverted. Pairs never use a
key as a property name: `[["__proto__", "x"]]` is an array of arrays, so it arrives the same whether Playwright keeps
an own `__proto__` key in objects or not. The fix does not depend on the quirk; it avoids it.

The drop itself could be reported to Playwright (an `evaluate` argument with an own `__proto__` key arrives without
it). That is outside this release and the user's call.

## Options

- **A. A null-prototype object in `encodeEntries` only** (`Object.create(null)`, which has no `__proto__` setter):
  fixes place 1, not place 2. Insufficient, as the probe shows.
- **A+. A, and pairs for the trip to the browser.** The seed registry sends `Object.entries(entries)`, a list of
  `[key, value]` pairs, as the init script's argument, and the seed script writes the pairs. Keys are then array
  elements, never property names, so nothing can drop them. The merge of pending seeds in Node
  (`{ ...previous, ...entries }`) keeps the key, since a spread creates real properties; a unit test confirms it.
- **B. Pairs everywhere**: `encodeEntries` returns pairs, and the write loop, the merge and the transport use them (the
  merge as a `Map`). The same result as A+, with more code changed.

Cost: all three are the same in practice. A call writes a handful of entries, and each write is a round trip to the
browser, which dwarfs building an object or an array. The difference is how much code changes, and where the guarantee
lives.

**Recommendation: A+.** It fixes both places where the key is lost, each with the smallest change that is correct
there.

## Implementation steps

1. `encodeEntries` builds a null-prototype object.
2. The seed registry passes the merged entries to `addInitScript` as pairs; the seed script iterates the pairs.
3. A unit test for the merge with a `__proto__` key.

## Tests

- Unit: `encodeEntries` keeps `__proto__`, `constructor` and `toString`; the registry's merge keeps `__proto__`; the
  seed script's argument is pairs.
- Harness (`test/tests/testApp/sessionStorage.spec.ts`): `set("__proto__", …)`, `set` with a parsed snapshot, and a
  deferred `seed("__proto__", …)` read back in the page, on all three browsers.

## Docs

None. The docs already say keys are stored as given.

## Changeset

`patch`: "`set` and `seed` store an entry whose key is `__proto__`; it was dropped without an error."

## Decisions

- [x] A+ (2026-10-22)
