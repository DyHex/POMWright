**Title:** A browser-context-wide option for `SessionStorage.seed`

**Labels:** backlog

---

`seed` adds an init script to one page, so a hop that opens a new tab or popup does not get the entries. The docs show `browserContext.addInitScript` as the workaround today.

A context-wide option would cover pages the context opens later. It is a new option, so a minor and not breaking.
