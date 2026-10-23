---
"pomwright": patch
---

A stored value that its codec cannot decode makes `get` fail with the codec's reason in the message, then the value's
length and the whole value, quoted, so an empty or whitespace value shows:
`Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: …); stored value, 9 characters: "{not json"`.
Before, the reason was only in the error's `cause`, and the value followed unquoted.
