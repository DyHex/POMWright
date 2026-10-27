---
"pomwright": patch
---

A query's sub-path arguments accept template-literal members of the path union (the query's own path and template
ancestors), compile on a registry typed `<string>`, where the runtime checks them, and compile again in a generic base
class on the paths it adds: this worked in 1.x and broke in 2.0.0, and is now restored.

```ts
type Paths = "main" | "main.orders" | `main.orders.row@${string}`;
registry.getLocatorSchema("main.orders.row@1042").filter("main.orders.row@1042", { hasText: "Open" }); // compiles now

abstract class SitePage<PagePaths extends string> extends PageObject<PagePaths | CommonPaths> {
  acceptCookiesFor(vendor: string) {
    // a sub-path on the common paths compiles in the base class again
    return this.getLocatorSchema("dialog@consent.button@accept").filter("dialog@consent", { hasText: vendor });
  }
}
```

A path written out stays a sub-path only where it is a segment of the chain, and a namespace that is not a declared path
is still a compile error.
