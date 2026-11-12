// Probe: getByRole's options other than name, registered in a POMWright chain, and the text methods' exact.
// Real pages where they have the case: the practice shop (headings at two levels; the cookie dialog, hidden once consent
// is in session storage) and the test server's /iframe/a (an aria-pressed toggle).
// STAND-IN, disclosed: checked, selected, expanded, disabled and description run on a page built with page.setContent,
// because no page of the practice shop or the test server has a checked box, a selected tab, an expanded disclosure, a
// disabled control or an accessible description. It holds for native HTML and plain ARIA attributes; it could hide how a
// framework's own widgets set (or fail to set) those attributes.
import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

test("level picks a heading by its level", async ({ page }) => {
	await page.goto("http://localhost:4176/products");
	const { add, getNestedLocator } = createRegistryWithAccessors<"main" | "main.heading" | "main.headings@cards">(page);
	add("main").getByRole("main");
	add("main.heading").getByRole("heading", { level: 1 });
	add("main.headings@cards").getByRole("heading", { level: 2 });
	await expect(getNestedLocator("main.heading")).toHaveText("Products");
	await expect(getNestedLocator("main.headings@cards")).toHaveText(["Lamp", "Desk lamp", "Chair"]);
});

test("pressed picks a toggle by its state, and follows it", async ({ page }) => {
	await page.goto("http://localhost:9000/iframe/a");
	const { add, getNestedLocator } = createRegistryWithAccessors<"button@toggleOn" | "button@toggleOff">(page);
	add("button@toggleOff").getByRole("button", { pressed: false });
	add("button@toggleOn").getByRole("button", { pressed: true });
	await expect(getNestedLocator("button@toggleOff")).toHaveText("Toggle A: Off");
	await expect(getNestedLocator("button@toggleOn")).toHaveCount(0);
	await getNestedLocator("button@toggleOff").click();
	await expect(getNestedLocator("button@toggleOn")).toHaveText("Toggle A: On");
	await expect(getNestedLocator("button@toggleOff")).toHaveCount(0);
});

test("includeHidden finds an element hidden from the accessibility tree", async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem("consent", "given"));
	await page.goto("http://localhost:4176/products");
	const { add, getNestedLocator } = createRegistryWithAccessors<"dialog@consent" | "dialog@consentHidden">(page);
	add("dialog@consent").getByRole("dialog", { name: "Cookies" });
	add("dialog@consentHidden").getByRole("dialog", { name: "Cookies", includeHidden: true });
	await expect(getNestedLocator("dialog@consent")).toHaveCount(0);
	await expect(getNestedLocator("dialog@consentHidden")).toHaveCount(1);
	await expect(getNestedLocator("dialog@consentHidden")).toBeHidden();
});

test("checked, selected, expanded, disabled and description (stand-in page)", async ({ page }) => {
	await page.setContent(`
		<main>
			<label><input type="checkbox" checked> Gift wrap</label>
			<label><input type="checkbox"> Express</label>
			<div role="tablist" aria-label="Details">
				<button role="tab" aria-selected="false">Specs</button>
				<button role="tab" aria-selected="true">Reviews</button>
			</div>
			<button aria-expanded="true">Filters</button>
			<button aria-expanded="false">Sort</button>
			<fieldset disabled><legend>Address</legend><button>Save address</button></fieldset>
			<div aria-disabled="true"><button>Inside aria-disabled</button></div>
			<button>Save</button>
			<button aria-describedby="d1">Delete</button><span id="d1">Removes the lamp</span>
			<button aria-describedby="d2">Delete</button><span id="d2">Removes the chair</span>
		</main>`);
	type P =
		| "main"
		| "main.checkbox@checked"
		| "main.tab@selected"
		| "main.button@expanded"
		| "main.buttons@disabled"
		| "main.button@deleteChair";
	const { add, getNestedLocator } = createRegistryWithAccessors<P>(page);
	add("main").getByRole("main");
	add("main.checkbox@checked").getByRole("checkbox", { checked: true });
	add("main.tab@selected").getByRole("tab", { selected: true });
	add("main.button@expanded").getByRole("button", { expanded: true });
	add("main.buttons@disabled").getByRole("button", { disabled: true });
	add("main.button@deleteChair").getByRole("button", { name: "Delete", description: "chair" });

	await expect(getNestedLocator("main.checkbox@checked")).toHaveAccessibleName("Gift wrap");
	await expect(getNestedLocator("main.tab@selected")).toHaveText("Reviews");
	await expect(getNestedLocator("main.button@expanded")).toHaveText("Filters");
	const disabled = await getNestedLocator("main.buttons@disabled").allTextContents();
	console.log(test.info().project.name, "disabled", JSON.stringify(disabled));
	await expect(getNestedLocator("main.buttons@disabled")).toHaveText(["Save address", "Inside aria-disabled"]);
	await expect(getNestedLocator("main.button@deleteChair")).toHaveCount(1);
	await expect(getNestedLocator("main.button@deleteChair")).toHaveAccessibleDescription("Removes the chair");
	await expect(page.getByRole("checkbox", { name: "Express" })).not.toBeChecked();
	await expect(page.getByRole("button", { name: "Save address" })).toBeDisabled();
});
