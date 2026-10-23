**Title:** Move to TypeScript 7 once it has a compiler API

**Labels:** backlog

---

tsup's declaration build, `scripts/check-doc-snippets.mjs` and `scripts/check-api-coverage.mjs` use the TypeScript compiler API, which TypeScript 7 does not ship yet. Move from TypeScript 6 once it does.
