---
"pomwright": patch
---

A RegExp page object's `navigation` is no longer accepted as `NavigationFor<string, string>`, so `goto()` without a target is a compile error there too, as the docs say; before, a function typed for a string page's helper took it, and `goto()` threw at run time. `NavigationFor` checks `goto` strictly now. A function that takes any page object's helper types its parameter `NavigationFor<RegExp, UrlMatcher>`, which every page object's helper fits.
