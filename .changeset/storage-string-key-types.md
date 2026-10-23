---
"pomwright": patch
---

A session storage key typed `string`, rather than a literal, is now typed as `string` or any declared codec's type, as
the docs say ("a declared key as its codec's type"): `get(key)` and `get([key])` return that, and `set` and `seed`
accept it. Before, such a key was typed as a plain string, although a declared key returned its decoded value at run
time. Literal keys, unions of literals, `get()` and a schema without codecs keep their types.

Code that used such a value as a string, with a schema that has codecs, stops compiling: pass the literal key, type the
variable as the schema's keys (`keyof typeof schema`), or narrow the value (`typeof value === "string"`).
