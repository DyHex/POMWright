# Draft: the issue "Test coverage beyond 3.0.2"

Decision 112's draft, for the maintainer to file before the cleanup, with the label `backlog`; the issue names no plan,
finding or decision, since the folders are deleted. Every item was re-checked against the branch on 2026-10-30: none
is covered yet.

Title: `Test coverage beyond 3.0.2`

Label: `backlog`

---

Gaps the second defect review of 3.0.2 found with no defect behind them, left for later.

- [ ] CI on Windows and macOS: call sites, step locations and packaging never meet their paths.
- [ ] TypeScript 5.2 to 5.8 in the consumer check, between the floor (5.0, 5.1) and the latest 5.x.
- [ ] The `log` fixture's level on a retry through the real runner (`initialLogLevel` is unit-tested; the harness's
  `failOnFlakyTests` keeps a retry from happening there).
- [ ] TypeScript's rename groups across registrations.
- [ ] Queries: a query kept across later registrations, a `has` path resolved from the registry, copies through a
  query's `filter` and `replace` on a DOM.
- [ ] Logging: entries from `afterEach`, `beforeAll` and after a timeout; a second `attachLogsToTest`; `tsc`'s
  standard-decorator output at run time.
