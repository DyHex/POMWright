---
"pomwright": patch
---

Writing a value that is not a string to a key without a codec now says where codecs are declared:

```text
Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)
```

A page object declares its storage schema twice: the type under `storage` in its type options, and the value in the
constructor's `sessionStorage.schema` option. Nothing checks that both are there. Without the value, the declared keys
are stored and read as raw strings, and this message is the one place where that fails loudly. The *Session storage*
page now says so.
