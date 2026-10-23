---
"pomwright": patch
---

A page object's `urlPath` must stay on its base's origin, and a `baseUrl` may not end in a bare `?` or `#`.

The constructor rejected a `urlPath` that starts with `//`, which names another host, but accepted others that do the
same once the URL standard has read them: a backslash after the first `/` (`"/\\other.example/x"`), or a tab or line
break followed by `/` or a backslash. With such a path, `fullUrl` and `goto()` went to the other host, and
`expectThisPage()` then failed there with a message that named the same URL as expected and found. The constructor now
resolves the path and throws when it leaves the base's origin:

```text
LoginPage: urlPath must be a path on the page object's origin; received "/\\login.example/account", which names the host "login.example" instead. A "/" followed by another "/" or a "\", also with a tab or line break between them, starts a host.
```

A `baseUrl` such as `"https://shop.example?"` passed the origin check, and every `fullUrl` built on it carried the `?`.
It is now rejected with the existing `baseUrl must be an origin …` message. A base with credentials
(`https://user:secret@shop.example`) is accepted as before.
