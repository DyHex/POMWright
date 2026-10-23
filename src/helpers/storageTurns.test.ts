import type { Page } from "@playwright/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeTurn } from "./storageTurns";

// test.step runs its body; outside the runner test.info() throws, as the helper expects
vi.mock("@playwright/test", () => ({
	test: {
		step: async (_title: string, body: () => unknown) => body(),
		info: () => {
			throw new Error("outside a test");
		},
	},
}));
const { SessionStorage } = await import("./sessionStorage");

const A = "https://shop.example";
const B = "https://help.example";

/** A page whose storage answers each call a tick later, so overlapping calls would interleave without their turns. */
const fakePage = (url: string) => {
	const state = {
		url,
		writes: [] as string[],
		store: new Map<string, string>(),
		failNextSet: false,
		/** Runs once after the next write, in the same tick: a navigation the app starts as it stores. */
		afterNextWrite: undefined as (() => void) | undefined,
	};
	const later = <T>(effect: () => T) =>
		new Promise<T>((resolve, reject) =>
			setTimeout(() => {
				try {
					resolve(effect());
				} catch (error) {
					reject(error);
				}
			}, 0),
		);
	const page = {
		url: () => state.url,
		mainFrame: () => ({ url: () => state.url }),
		on: () => undefined,
		off: () => undefined,
		sessionStorage: {
			setItem: (key: string, value: string) =>
				later(() => {
					if (state.failNextSet) {
						state.failNextSet = false;
						throw new Error("QuotaExceededError");
					}
					state.writes.push(`${key}=${value}`);
					state.store.set(key, value);
					const after = state.afterNextWrite;
					state.afterNextWrite = undefined;
					after?.();
				}),
			getItem: (key: string) => later(() => state.store.get(key) ?? null),
			items: () => later(() => [...state.store].map(([name, value]) => ({ name, value }))),
			removeItem: (key: string) => later(() => void state.store.delete(key)),
			clear: () => later(() => state.store.clear()),
		},
	} as unknown as Page;
	return { page, state };
};

describe("takeTurn", () => {
	it("runs the tasks for one origin in call order, each after the previous has settled, failed ones included", async () => {
		const page = {};
		const log: string[] = [];
		const task =
			(name: string, fail = false) =>
			async () => {
				log.push(`${name} start`);
				await new Promise((resolve) => setTimeout(resolve, 0));
				log.push(`${name} end`);
				if (fail) {
					throw new Error(`${name} failed`);
				}
				return name;
			};
		const results = await Promise.allSettled([
			takeTurn(page, A, task("first")),
			takeTurn(page, A, task("second", true)),
			takeTurn(page, A, task("third")),
		]);
		expect(log).toEqual(["first start", "first end", "second start", "second end", "third start", "third end"]);
		expect(results.map((r) => (r.status === "fulfilled" ? r.value : (r.reason as Error).message))).toEqual([
			"first",
			"second failed",
			"third",
		]);
	});

	it("keeps origins and pages apart: a call waits only for earlier calls for its own origin on its own page", async () => {
		const log: string[] = [];
		let release = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const page = {};
		const blocked = takeTurn(page, A, async () => {
			await held;
			log.push("A on page");
		});
		await takeTurn(page, B, async () => void log.push("B on page"));
		await takeTurn({}, A, async () => void log.push("A on another page"));
		release();
		await blocked;
		expect(log).toEqual(["B on page", "A on another page", "A on page"]);
	});
});

describe("SessionStorage calls for one origin take turns", () => {
	let fake: ReturnType<typeof fakePage>;
	beforeEach(() => {
		fake = fakePage(`${A}/account`);
	});

	it("overlapping seeds on the origin write in call order, the later value winning", async () => {
		const storage = new SessionStorage(fake.page, { origin: A });
		await Promise.all([storage.seed({ first: "1", shared: "earlier" }), storage.seed({ shared: "later" })]);
		expect(fake.state.writes).toEqual(["first=1", "shared=earlier", "shared=later"]);
		expect(fake.state.store.get("shared")).toBe("later");
	});

	it("overlapping set calls, and helpers of different page objects on one page, write in call order", async () => {
		const accountStorage = new SessionStorage(fake.page, { label: "Account", origin: A });
		const standalone = new SessionStorage(fake.page);
		await Promise.all([
			accountStorage.set({ first: "1", shared: "earlier" }),
			standalone.set({ shared: "later" }),
			accountStorage.seed({ shared: "last" }),
		]);
		expect(fake.state.writes).toEqual(["first=1", "shared=earlier", "shared=later", "shared=last"]);
	});

	it("a get in the same Promise.all as a set reads what the set wrote, and a clear after them removes it", async () => {
		const storage = new SessionStorage(fake.page, { origin: A });
		const [, token] = await Promise.all([storage.set({ token: "abc", other: "x" }), storage.get("token")]);
		expect(token).toBe("abc");
		const [, , after] = await Promise.all([storage.set("token", "def"), storage.clear("token"), storage.get("token")]);
		expect(after).toBeNull();
	});

	it("a call that fails does not hold up the next one", async () => {
		const storage = new SessionStorage(fake.page, { origin: A });
		fake.state.failNextSet = true;
		const [failed, next] = await Promise.allSettled([storage.set("a", "1"), storage.set("b", "2")]);
		expect(failed.status).toBe("rejected");
		expect(next.status).toBe("fulfilled");
		expect(fake.state.writes).toEqual(["b=2"]);
	});

	it("a call whose turn comes after the page left the helper's origin fails with the origin message", async () => {
		const storage = new SessionStorage(fake.page, { label: "Account", origin: A });
		fake.state.afterNextWrite = () => {
			fake.state.url = `${B}/faq`;
		};
		const first = storage.set("a", "1");
		const second = storage.set("b", "2");
		await first;
		await expect(second).rejects.toThrow(
			`Account.SessionStorage.set: the page is on ${B}, not on this page object's origin ${A}`,
		);
		expect(fake.state.writes).toEqual(["a=1"]);
	});
});
