---
title: URL matching
description: "How baseUrl and urlPath are checked, how fullUrl is composed, and how UrlMatcher tests the origin and the rest of a URL apart."
---

A page object knows its own URL, so its navigation helper can go there and wait for it. This page explains how the URL
parts are checked, how `fullUrl` is made, and how a page whose URL varies is matched. How to set a page object's URL is
on [URLs and navigation](/POMWright/docs/urls-and-navigation/).

## The checks

A page object's `baseUrl` and `urlPath` are each a string or a RegExp. The constructor checks the strings with the
helpers in `src/helpers/url.ts`:

- `baseUrl`: an origin, which `new URL` parses with a host and nothing after it but an optional `/`. Playwright resolves
  a path that starts with `/` against the origin of its `baseURL`, dropping any path the base had, and a scheme-less
  `localhost:9000` parses as a URL with the scheme `localhost:`; both are rejected so that no page object is built on a
  base that resolves differently than it reads.
- `urlPath`: `""` or a string that starts with exactly one `/` and, resolved against the base, keeps its origin;
  `//shop.example/x` would name another host, and so would a backslash after the first `/`, which the URL standard
  reads as `/`. The check resolves the path rather than listing characters, so it follows the standard.
- neither a string nor a RegExp, usually an unset environment variable: rejected, because it would build a page
  object that matches nothing.

## `fullUrl`

`composeFullUrl` makes the page's identity:

- **Two strings**: `new URL(urlPath, baseUrl).href`, the resolution Playwright applies to `page.goto(path)` against
  `baseURL`, and the form the browser reports: `https://shop.example/` for an empty path, `/s%C3%B8k` for `/søk`. A `^`
  in the path part is written `%5E`, as every browser reports it, since Node 20 and 22's `new URL` keeps it; a `|` is
  kept, as Firefox and WebKit report it and Chromium does not. Making a string page's `fullUrl` a `UrlMatcher` would
  match both forms, but code using it as a string would stop compiling; a page object cannot tell which browser it runs
  in, so a `fullUrl` per browser is not possible either.
- **A RegExp in either part**: a `UrlMatcher`.

## `UrlMatcher`

A `UrlMatcher` is a function from a `URL` to a boolean, with `base`, `path`, `test()` and `toString()`. It tests the two
parts of a URL apart:

- the base against `url.origin`: a RegExp as written, a string by equality with its own origin;
- the path against the rest of the URL as `href` writes it, path, query and fragment: a RegExp as written, a string by
  equality with the form `new URL` gives it. `pathname + search + hash` would not do: the URL API reports an empty query
  or fragment as `""`, so `/orders?` would pass for `/orders`, where Playwright's `toHaveURL` tells them apart.

Each RegExp is used with its own flags, and its `lastIndex` is reset before each test, so a `g` or `y` flag cannot make
a second test start where the first stopped. No anchors are added or removed.

In 2.x, the two parts were joined into one RegExp, which made a base RegExp match up to the exact character where the
path began, dropped the flags, and broke a `^` on the path. Testing the parts apart uses the seam the URL parser already
provides, and a base such as `/identity-provider/` matches any host that contains it.

Playwright's `waitForURL`, `toHaveURL` and `route` accept a URL predicate, so the matcher is passed to them as it is.
The navigation helper builds a matcher for every page object, a string `fullUrl` included, and waits with it: a page
is matched in the form the browser reports, so `/søk` matches the percent-encoded URL the browser shows.

The browsers agree with `new URL` on every printable ASCII character in the path, the query and the fragment, except in
the path:
Chromium reports a `|` in the path as `%7C`, and every browser reports a `^` in the path as `%5E`, which `new URL` writes
too on Node 24 (its URL parser, ada 4, follows the current URL standard) but keeps on Node 20 and 22. Before comparing a
string path, the matcher writes `|` as `%7C` and `^` as `%5E` in the path part of both sides (`comparable` in
`src/helpers/url.ts`); a RegExp path sees the URL as the browser reports it.
`test/tests/testApp/urlForms.spec.ts` repeats the sweep on every browser, so a new difference fails the harness and
gets its own entry. Decoding both sides with `decodeURI` was rejected: it would also equate `/a%41` with `/aA` and every
other encoded unreserved character, far more than the browsers differ on, and Playwright compares raw strings.

## Alternatives weighed

- **One composed RegExp** with a filler between the parts. The base would have to match up to the exact character
  where the path begins, so a base such as `/identity-provider/` would never match.
- **A `RegExp` subclass** as `fullUrl`. Its own matching would run in only one of the calls `fullUrl` is documented
  for: `page.waitForURL()` matches in the test's process and calls the subclass's `test()`, while `page.route()` and
  `expect(page).toHaveURL()` match by the RegExp's source and flags, so a subclass whose source differs from its
  `test()` would route nothing and fail the assertion (probed on three browsers).
- **An option to ignore the query.** One rule, identical to Playwright's `toHaveURL`, keeps `expectThisPage` and
  `expectAnotherPage` exact opposites; a page whose query varies has a RegExp path instead.
- **Literal types for the URL parts.** They catch only a malformed literal, which the constructor check catches at the
  same moment, and they make every value from the environment need a cast.
