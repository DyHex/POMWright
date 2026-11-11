# Upgrading from 2.x

The procedure is the site's [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/) page: every
change a 2.x project meets in 3.x, each with what changed, how to find the affected code (a compile error, or a search
it gives), and what to write instead. Read it whole; do not upgrade from memory. The 2.x documentation is at the
`v2.1.0` tag of the repository.

## Contents

- [How to run it](#how-to-run-it)
- [The items that compile, and their searches](#the-items-that-compile-and-their-searches)

## How to run it

1. Upgrade `@playwright/test` to 1.64 or later and `pomwright` to the latest 3.x, on Node 20 or later
   ([How to upgrade](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#how-to-upgrade)).
2. **Map how the project uses POMWright** before searching it: where its page objects, base classes, locator modules,
   registries and session storage schemas are; whether it wraps `PageObject` or the registry in classes of its own, or
   re-exports POMWright from a module of its own; its folders and packages (a monorepo has several). Say what you found.
3. **Read the page whole**, as Markdown, at the version you upgrade to (`node_modules/pomwright/package.json`), with a
   tool that returns the file as it is, such as
   `curl -sL https://raw.githubusercontent.com/DyHex/POMWright/v<version>/website/src/content/docs/docs/upgrading-from-2x.md`.
   A fetch tool that hands back a summary of a page leaves items out.
4. Run `npx tsc --noEmit`. Each compile error is an item of the page marked **compile error**: find it on the page and
   write what it says.
5. Run the search of each item that compiles ([below](#the-items-that-compile-and-their-searches)), adapted to the map
   of step 2: another class or method name where the project wraps POMWright's, another folder or file type where its
   code lives elsewhere. Say which searches you adapted, and how. An item whose adapted search finds nothing does not
   apply.
6. Run the suite. What is left fails with a message that names the fix: the items marked **fails at run time**.
7. Then review the project against this skill (`guides/reviewing.md`): an upgrade that compiles and passes is the
   point to adopt what 3.x makes possible, such as queries in place of extra registrations, and `seed` in place of a
   reload after writing session storage.

Commit each item, or each group of the page's items, on its own, so a regression points at its change.

## The items that compile, and their searches

These change what code does without a compile error, so only a search finds them. Each is the page's item, with the
search it gives, run from the project's root; what each change means and what to write instead is on the page.

- [`getById` matches the id as written](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#getbyid-matches-the-id-as-written)

  ```sh
  grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts --exclude-dir=node_modules .
  ```

- [`getById(RegExp)` is a regular expression](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#getbyidregexp-is-a-regular-expression)

  ```sh
  grep -rnE 'getById\(\s*/' --include=*.ts --exclude-dir=node_modules .
  ```

- [Steps on a frame segment apply](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#steps-on-a-frame-segment-apply)

  ```sh
  grep -rn 'frameLocator(' --include=*.ts --exclude-dir=node_modules .
  ```

- [`update` deletes with `null`](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#update-deletes-with-null)

  ```sh
  grep -rn 'update(' --include=*.ts --exclude-dir=node_modules . | grep undefined
  ```

- [Seeds never change](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#seeds-never-change)

  ```sh
  grep -rn 'createReusable' --include=*.ts --exclude-dir=node_modules .
  ```

- [From JavaScript: `describe` and `nth`](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#from-javascript-describe-and-nth)

  ```sh
  grep -rnE '\.(nth|describe)\(' --include=*.js --include=*.mjs --include=*.cjs --exclude-dir=node_modules .
  ```

- [`defineLocators()` runs after the constructor](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#definelocators-runs-after-the-constructor)

  ```sh
  grep -rn "expect(() => new" --include=*.ts --exclude-dir=node_modules .
  ```

- [`pageActionsToPerformAfterNavigation()` is optional](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#pageactionstoperformafternavigation-is-optional)

  ```sh
  grep -rn "pageActionsToPerformAfterNavigation" --include=*.ts --exclude-dir=node_modules .
  ```

- [Waits end at the navigation timeout](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#waits-end-at-the-navigation-timeout): needs no change.

- [Values are stored as written](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#values-are-stored-as-written)

  ```sh
  grep -rnE '\.(get|set|seed)<' --include=*.ts --exclude-dir=node_modules .
  ```

- [`get` returns `null` for a missing key](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#get-returns-null-for-a-missing-key)

  ```sh
  grep -rn "sessionStorage.get(" --include=*.ts --exclude-dir=node_modules .
  ```

- [Log attachments keep what was logged](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#log-attachments-keep-what-was-logged)

  ```sh
  grep -rn 'locale:' --include=*.ts --exclude-dir=node_modules .
  ```

  ```sh
  grep -rn 'attachLogsToTest(' --include=*.ts --exclude-dir=node_modules .
  ```
