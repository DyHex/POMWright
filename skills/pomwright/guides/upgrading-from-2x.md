# Upgrading from 2.x

The procedure is the site's [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/) page: every
change a 2.x project meets in 3.x, each with what changed, how to find the affected code (a compile error, or a search
it gives), and what to write instead. Read it; do not upgrade from memory. The 2.x documentation is at the
`v2.1.0` tag of the repository.

## How to run it

1. Upgrade `@playwright/test` to 1.64 or later and `pomwright` to the latest 3.x, on Node 20 or later
   ([How to upgrade](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/#how-to-upgrade)).
2. Run `npx tsc --noEmit`. Each compile error is an item of the page marked **compile error**: find it on the page and
   write what it says.
3. Run each search the page gives for the items marked **compiles**, from the project's root; an item whose search
   finds nothing does not apply.
4. Run the suite. What is left fails with a message that names the fix: the items marked **fails at run time**.
5. Then review the project against this skill (`guides/reviewing.md`): an upgrade that compiles and passes is the
   point to adopt what 3.x makes possible, such as queries in place of extra registrations, and `seed` in place of a
   reload after writing session storage.

Commit each item, or each group of the page's items, on its own, so a regression points at its change.
