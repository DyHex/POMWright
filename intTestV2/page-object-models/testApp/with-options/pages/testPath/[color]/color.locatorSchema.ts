import type { LocatorRegistry } from "pomwright";

const tableVariants = ["body.table", "body.table@hexCode"] as const;

type TableVariants = (typeof tableVariants)[number];
type TableChildren = "row" | "row.rowheader" | "row.cell";

export type ColorLocatorSchemaPath = "body" | "body.heading" | TableVariants | `${TableVariants}.${TableChildren}`;

export function initLocatorSchemas(locators: LocatorRegistry<ColorLocatorSchemaPath>) {
	locators.add("body").locator("body");

	locators.add("body.heading").getByRole("heading", { name: "Your Random Color is:" });

	const tableLocatorMap: Array<[ColorLocatorSchemaPath, { name?: string }]> = [
		["body.table", {}],
		["body.table@hexCode", { name: "Hex Code Information" }],
	];

	for (const [path, { name }] of tableLocatorMap) {
		locators.add(path).getByRole("table", name ? { name } : undefined);
	}

	for (const tableVariant of tableVariants) {
		locators.add(`${tableVariant}.row`).getByRole("row");
		locators.add(`${tableVariant}.row.rowheader`).getByRole("rowheader");
		locators.add(`${tableVariant}.row.cell`).getByRole("cell");
	}
}
