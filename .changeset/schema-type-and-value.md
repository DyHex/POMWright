---
"pomwright": patch
---

A page object that passes `sessionStorage.schema` must declare its type, a `SessionStorage` given an explicit schema type must be given the schema value, and the value must hold a codec for every declared key, optional ones included, as the docs say. Before, each compiled, and the helper's types and codecs disagreed: `get` could be typed `string | null` and return an object, or the reverse.

Take the type from the value, and pass that value: `PageObject<Paths, { storage: typeof schema }>` with `{ sessionStorage: { schema } }`, or `new SessionStorage(page, { schema })`, whose type comes from the value.

Two cases still compile: a page object that declares `storage` and passes no schema, and a schema passed through a variable with a codec its type does not declare, since TypeScript checks extra keys on object literals only; that key is then decoded by its codec while its type says a string.
