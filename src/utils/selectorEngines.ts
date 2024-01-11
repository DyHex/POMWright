type QuerySelectorType = typeof document.querySelector;
type QuerySelectorAllType = typeof document.querySelectorAll;

export function createCypressIdEngine() {
	return {
		query(document: { querySelector: QuerySelectorType }, selector: string) {
			const attr = `[data-cy="${selector}"]`;
			const el = document.querySelector(attr);
			return el;
		},

		queryAll(
			document: {
				querySelectorAll: QuerySelectorAllType
			},
			selector: string,
		) {
			const attr = `[data-cy="${selector}"]`;
			const els = Array.from(document.querySelectorAll(attr));
			return els;
		},
	};
}
