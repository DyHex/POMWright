<!-- TypeDoc 0.28.20 with typedoc-plugin-markdown 4.14.0, LocatorUpdateBuilder given an @interface tag in a scratchpad clone so that TypeDoc lists its members; the getByRole entry only. -->

### getByRole()

> **getByRole**(...`args`): [`LocatorQueryBuilder`](LocatorQueryBuilder.md)\<`LocatorSchemaPathType`, `Path`\>

Patches (`update`) or replaces (`replace`) a `getByRole` definition for the target sub-path. In
`update` mode the registered strategy must be `role`, the role is optional and the options
follow JSON Merge Patch: `{ name: null }` deletes one option, a `null` options argument deletes
them all, and `undefined` leaves them alone. In `replace` mode the arguments are those of
`page.getByRole`: the role is required and the options are Playwright's own, without `null`.

#### Parameters

##### args

...`ArgsFor`\<`Mode`, \[`role`: `"log"` \| `"search"` \| `"link"` \| `"none"` \| `"document"` \| `"status"` \| `"dialog"` \| `"alert"` \| `"alertdialog"` \| `"application"` \| `"article"` \| `"banner"` \| `"blockquote"` \| `"button"` \| `"caption"` \| `"cell"` \| `"checkbox"` \| `"code"` \| `"columnheader"` \| `"combobox"` \| `"complementary"` \| `"contentinfo"` \| `"definition"` \| `"deletion"` \| `"directory"` \| `"emphasis"` \| `"feed"` \| `"figure"` \| `"form"` \| `"generic"` \| `"grid"` \| `"gridcell"` \| `"group"` \| `"heading"` \| `"img"` \| `"insertion"` \| `"list"` \| `"listbox"` \| `"listitem"` \| `"main"` \| `"marquee"` \| `"math"` \| `"meter"` \| `"menu"` \| `"menubar"` \| `"menuitem"` \| `"menuitemcheckbox"` \| `"menuitemradio"` \| `"navigation"` \| `"note"` \| `"option"` \| `"paragraph"` \| `"presentation"` \| `"progressbar"` \| `"radio"` \| `"radiogroup"` \| `"region"` \| `"row"` \| `"rowgroup"` \| `"rowheader"` \| `"scrollbar"` \| `"searchbox"` \| `"separator"` \| `"slider"` \| `"spinbutton"` \| `"strong"` \| `"subscript"` \| `"superscript"` \| `"switch"` \| `"tab"` \| `"table"` \| `"tablist"` \| `"tabpanel"` \| `"term"` \| `"textbox"` \| `"time"` \| `"timer"` \| `"toolbar"` \| `"tooltip"` \| `"tree"` \| `"treegrid"` \| `"treeitem"`, `options?`: `object`\], `UpdateArgsWithOptions`\<`"log"` \| `"search"` \| `"link"` \| `"none"` \| `"document"` \| `"status"` \| `"dialog"` \| `"alert"` \| `"alertdialog"` \| `"application"` \| `"article"` \| `"banner"` \| `"blockquote"` \| `"button"` \| `"caption"` \| `"cell"` \| `"checkbox"` \| `"code"` \| `"columnheader"` \| `"combobox"` \| `"complementary"` \| `"contentinfo"` \| `"definition"` \| `"deletion"` \| `"directory"` \| `"emphasis"` \| `"feed"` \| `"figure"` \| `"form"` \| `"generic"` \| `"grid"` \| `"gridcell"` \| `"group"` \| `"heading"` \| `"img"` \| `"insertion"` \| `"list"` \| `"listbox"` \| `"listitem"` \| `"main"` \| `"marquee"` \| `"math"` \| `"meter"` \| `"menu"` \| `"menubar"` \| `"menuitem"` \| `"menuitemcheckbox"` \| `"menuitemradio"` \| `"navigation"` \| `"note"` \| `"option"` \| `"paragraph"` \| `"presentation"` \| `"progressbar"` \| `"radio"` \| `"radiogroup"` \| `"region"` \| `"row"` \| `"rowgroup"` \| `"rowheader"` \| `"scrollbar"` \| `"searchbox"` \| `"separator"` \| `"slider"` \| `"spinbutton"` \| `"strong"` \| `"subscript"` \| `"superscript"` \| `"switch"` \| `"tab"` \| `"table"` \| `"tablist"` \| `"tabpanel"` \| `"term"` \| `"textbox"` \| `"time"` \| `"timer"` \| `"toolbar"` \| `"tooltip"` \| `"tree"` \| `"treegrid"` \| `"treeitem"`, \{ `checked?`: `boolean`; `description?`: `string` \| `RegExp`; `disabled?`: `boolean`; `exact?`: `boolean`; `expanded?`: `boolean`; `includeHidden?`: `boolean`; `level?`: `number`; `name?`: `string` \| `RegExp`; `pressed?`: `boolean`; `selected?`: `boolean`; \} \| `undefined`\>\>

#### Returns

[`LocatorQueryBuilder`](LocatorQueryBuilder.md)\<`LocatorSchemaPathType`, `Path`\>

#### Example

```ts
getLocatorSchema("form.button").update().getByRole({ name: "Save" }).getNestedLocator();
getLocatorSchema("form.button").update().getByRole("button", null).getNestedLocator();
```

***
