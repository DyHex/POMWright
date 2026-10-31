// Run by Playwright's runner in a CommonJS and a "type": "module" consumer project (scripts/consumer-check.sh). It needs
// no browser: it proves the package loads in the runner, its test fixture works, and @step runs under the runner's own
// TypeScript transform.
import { expect } from "@playwright/test";
import { createRegistryWithAccessors, PageObject, step, test } from "pomwright";

class Cart {
	items: string[] = [];

	@step()
	async add(item: string): Promise<number> {
		this.items.push(item);
		return this.items.length;
	}
}

test("the package loads in the runner, with its log fixture and @step", async ({ log }) => {
	expect(typeof PageObject).toBe("function");
	expect(typeof createRegistryWithAccessors).toBe("function");
	log.info("logged from a consumer project");
	expect(await new Cart().add("socks")).toBe(1);
});
