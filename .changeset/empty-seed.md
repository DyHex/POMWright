---
"pomwright": patch
---

`seed({})`, for example from entries that turn out to be empty at run time, does nothing, as `get([])` and `clear([])`
with an empty list already did. Before, it registered a seed without keys, and a test that never went to that origin
failed at close with "the seed for … (keys: ) was never applied".
