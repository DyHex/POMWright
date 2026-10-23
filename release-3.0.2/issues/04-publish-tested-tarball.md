**Title:** Publish the tarball CI tested instead of rebuilding it

**Labels:** backlog

---

`publish.yaml` rebuilds the package (`pnpm run release`) instead of publishing the tarball that the `package` job built and the harness tested. Two builds of one commit are byte-identical today, but the published bytes are not the tested bytes.

Closing the gap changes how changesets publishes: the run's artifact has to be retrieved, checked against the commit and its digest, and published in place of the rebuild.
