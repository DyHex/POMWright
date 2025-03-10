# Folder Structure

How you structure your project is ultimately up to you and what makes sense often differ between projects, but I've found the following structure works quite well in most cases.

```text
./playwright
  /fixtures
    /app1
      app1.fixtures.ts
    /app2
    /automatic
    /custom-expects
    all.fixtures.ts
  /pom
    /app1
      /common
        /basePage
          app1.basePage.ts
        /helpers
      /pages
        homepage.locatorSchema.ts
        homepage.page.ts
        /profile
          profile.locatorSchema.ts
          profile.page.ts
    /app2
  /tests
    /app1
      /byFeature
        login.spec.ts
      /byResourcePath
        homepage.spec.ts
        /profile
          profile.spec.ts
    /app2
    /e2e
```
