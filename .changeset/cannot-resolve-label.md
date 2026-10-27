---
"pomwright": patch
---

`goto(target)` names the page object when the target cannot be resolved against its `baseUrl`, as every other navigation message does: `LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"`, with the URL parser's error as `cause`. Before, the message had no label.
