---
"pomwright": patch
---

A session storage key whose type is not a literal is now typed by what it can be, as the docs say ("a declared key as its codec's type"): a key typed `string` or a branded string (`string & { … }`) as `string` or any declared codec's type, and a pattern such as `` `user:${string}` `` as `string` or the codecs' types of the declared keys it matches. `get(key)` and `get([key])` return that, and `set` and `seed` accept it; a union is typed member by member. Before, such a key was typed as a plain string, although a declared key returned its decoded value at run time. Literal keys, unions of literals, `get()` and a schema without codecs keep their types.

Code that used such a value as a string, with a schema that has codecs, stops compiling only where the key can match a declared key: pass the literal key, type the variable as the schema's keys (`keyof typeof schema`), or narrow the value (`typeof value === "string"`).
