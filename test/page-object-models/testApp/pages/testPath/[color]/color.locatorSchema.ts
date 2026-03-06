import type { LocatorRegistry } from "pomwright";

const tableVariants = ["body.table", "body.table@hexCode"] as const;

type TableVariants = (typeof tableVariants)[number];
type TableChildren = "row" | "row.rowheader" | "row.cell";

export type Paths = "body" | "body.heading" | TableVariants | `${TableVariants}.${TableChildren}`;

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("body").locator("body");

	registry.add("body.heading").getByRole("heading", { name: "Your Random Color is:" });

	const tableLocatorMap: Array<[Paths, { name?: string }]> = [
		["body.table", {}],
		["body.table@hexCode", { name: "Hex Code Information" }],
	];

	for (const [path, { name }] of tableLocatorMap) {
		registry.add(path).getByRole("table", name ? { name } : undefined);
	}

	for (const tableVariant of tableVariants) {
		registry.add(`${tableVariant}.row`).getByRole("row");
		registry.add(`${tableVariant}.row.rowheader`).getByRole("rowheader");
		registry.add(`${tableVariant}.row.cell`).getByRole("cell");
	}
}
