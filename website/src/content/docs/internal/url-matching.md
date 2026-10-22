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
  `baseURL`, and the form the browser reports: `https://shop.example/` for an empty path, `/s%C3%B8k` for `/søk`.
- **A RegExp in either part**: a `UrlMatcher`.

## `UrlMatcher`

A `UrlMatcher` is a function from a `URL` to a boolean, with `base`, `path`, `test()` and `toString()`. It tests the two
parts of a URL apart:

- the base against `url.origin`: a RegExp as written, a string by equality with its own origin;
- the path against `pathname + search + hash`: a RegExp as written, a string by equality with the form `new URL` gives
  it.

Each RegExp is used with its own flags, and its `lastIndex` is reset before each test, so a `g` or `y` flag cannot make
a second test start where the first stopped. No anchors are added or removed.

In 2.x, the two parts were joined into one RegExp, which made a base RegExp match up to the exact character where the
path began, dropped the flags, and broke a `^` on the path. Testing the parts apart uses the seam the URL parser already
provides, and a base such as `/identity-provider/` matches any host that contains it.

Playwright's `waitForURL`, `toHaveURL` and `route` accept a URL predicate, so the matcher is passed to them as it is.
The navigation helper builds a matcher for every page object, a string `fullUrl` included, and waits with it: a page
is matched in the form the browser reports, so `/søk` matches the percent-encoded URL the browser shows.

## Alternatives weighed

- **One composed RegExp** with a filler between the parts. The base would have to match up to the exact character
  where the path begins, so a base such as `/identity-provider/` would never match.
- **A `RegExp` subclass** as `fullUrl`. Playwright sends a RegExp to the browser as its source and flags, so the
  subclass's own matching would never run.
- **An option to ignore the query.** One rule, identical to Playwright's `toHaveURL`, keeps `expectThisPage` and
  `expectAnotherPage` exact opposites; a page whose query varies has a RegExp path instead.
- **Literal types for the URL parts.** They catch only a malformed literal, which the constructor check catches at the
  same moment, and they make every value from the environment need a cast.
