---
"pomwright": patch
---

A `@step` method called without its object, for example passed as a callback (`items.map(cart.addItem)`), runs as an
undecorated method does: titled with its own title, or `Anonymous.<method>` without one. Before, it threw
`TypeError: Cannot read properties of undefined (reading 'constructor')` before the method ran, even with a title of
its own.
