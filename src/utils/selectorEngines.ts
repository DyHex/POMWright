// Type definitions for DOM query selector methods.
type QuerySelectorType = typeof document.querySelector;
type QuerySelectorAllType = typeof document.querySelectorAll;

/**
 * Creates a custom selector engine for Cypress that focuses on selecting elements by the 'data-cy' attribute.
 * This engine provides methods to query single or multiple elements based on the provided 'data-cy' value.
 */
export function createCypressIdEngine() {
	return {
		/**
		 * Uses the document's querySelector method to find the first element with a specific 'data-cy' attribute.
		 * Constructs a selector string for the 'data-cy' attribute and searches the DOM for the first match.
		 *
		 * Parameters:
		 * - document: An object that mimics the global document, having a querySelector method.
		 * - selector: A string representing the value of the 'data-cy' attribute to search for.
		 *
		 * Returns the first HTML element matching the 'data-cy' attribute, or null if no match is found.
		 */
		query(document: { querySelector: QuerySelectorType }, selector: string) {
			const attr = `[data-cy="${selector}"]`;
			const el = document.querySelector(attr);
			return el;
		},

		/**
		 * Uses the document's querySelectorAll method to find all elements with a specific 'data-cy' attribute.
		 * Constructs a selector string for the 'data-cy' attribute and retrieves all matching elements in the DOM.
		 * Converts the NodeList from querySelectorAll into an array for easier handling and manipulation.
		 *
		 * Parameters:
		 * - document: An object that mimics the global document, having a querySelectorAll method.
		 * - selector: A string representing the value of the 'data-cy' attribute to search for.
		 *
		 * Returns an array of HTML elements matching the 'data-cy' attribute. Returns an empty array if no matches are found.
		 */
		queryAll(
			document: {
				querySelectorAll: QuerySelectorAllType;
			},
			selector: string,
		) {
			const attr = `[data-cy="${selector}"]`;
			const els = Array.from(document.querySelectorAll(attr));
			return els;
		},
	};
}
