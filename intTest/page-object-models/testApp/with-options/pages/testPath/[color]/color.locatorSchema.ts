import { GetByMethod, GetLocatorBase } from "pomwright";

/**
 * The following locatorSchema implementation is total overkill for the Color POC, but serves as one possible
 * solution of how you can define a lot of similar locators in a locatorSchema file.
 *
 * In a real-world scenario, if a page has a lot of similar elements, but with different contexts or variations,
 * generating locators this way can save us a lot of time, reduce the chance of mistakes, and make the code easier to
 * maintain. Though renaming generated locatorSchemaPaths such as these across all files referencing them might require
 * some manual work, depending on how you implement it.
 *
 * In this example, we define locators for a table with two variations: one generic table, and one context specific
 * table. Thus we can use "body.table", "body.table.row.cell" etc. for resolving any table or cell on the page,
 * or any page for that matter, and "body.table@hexCode", "body.table@hexCode.row.cell" etc. for resolving the specific
 * table/cells that displays hex code information, saving us from having to define/update the generic table locators in
 * our test code.
 *
 * Alternatively, we could just define the generic table locators and create helper methods in the page object class to
 * update a generic table locator to a specific table locator, but depending on the POC you could end up with a lot of
 * such methods.
 *
 * Note: This is a contrived example and may not be the ideal solution for every situation. Use your best judgement.
 */

// Define constant table locator paths for reusability
const tableVariants = ["body.table", "body.table@hexCode"] as const;

type TableVariants = (typeof tableVariants)[number];
type TableChildren = "row" | "row.rowheader" | "row.cell";

// Define allowed roles based on ARIA roles
type AllowedRoles = "table" | "row" | "rowheader" | "cell";

export type LocatorSchemaPath = "body" | "body.heading" | TableVariants | `${TableVariants}.${TableChildren}`;

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	// Add body and heading locators
	locators.addSchema("body", {
		locator: "body",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("body.heading", {
		role: "heading",
		roleOptions: {
			name: "Your Random Color is:",
		},
		locatorMethod: GetByMethod.role,
	});

	// Add table locators using a map to streamline variations
	const tableLocatorMap = new Map<LocatorSchemaPath, { role: AllowedRoles; roleOptions?: { name: string } }>([
		["body.table", { role: "table" }],
		["body.table@hexCode", { role: "table", roleOptions: { name: "Hex Code Information" } }],
	]);

	for (const [locatorPath, schema] of tableLocatorMap) {
		locators.addSchema(locatorPath, {
			role: schema.role,
			locatorMethod: GetByMethod.role,
			...{ roleOptions: schema.roleOptions },
		});
	}

	// Add row and cell locators for each table variant using for...of
	for (const tableVariant of tableVariants) {
		locators.addSchema(`${tableVariant}.row`, {
			role: "row",
			locatorMethod: GetByMethod.role,
		});

		locators.addSchema(`${tableVariant}.row.rowheader`, {
			role: "rowheader",
			locatorMethod: GetByMethod.role,
		});

		locators.addSchema(`${tableVariant}.row.cell`, {
			role: "cell",
			locatorMethod: GetByMethod.role,
		});
	}
}
