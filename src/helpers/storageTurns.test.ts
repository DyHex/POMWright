import type { Page } from "@playwright/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_WIDE, takeTurn } from "./storageTurns";

// test.step runs its body, a tick later when `steps.defer` is set, as Playwright's step overlay delays it, and records
// the steps an error came out of; outside the runner test.info() throws, as the helper expects
const steps = vi.hoisted(() => ({ defer: false, failed: [] as string[] }));
vi.mock("@playwright/test", () => ({
	test: {
		step: async (title: string, body: () => unknown) => {
			if (steps.defer) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
			try {
				return await body();
			} catch (error) {
				steps.failed.push(title);
				throw error;
			}
		},
		info: () => {
			throw new Error("outside a test");
		},
	},
}));
const { json, SessionStorage } = await import("./sessionStorage");

const A = "https://shop.example";
const B = "https://help.example";

/** A page whose storage answers each call a tick later, so overlapping calls would interleave without their turns. */
const fakePage = (url: string) => {
	const state = {
		url,
		writes: [] as string[],
		store: new Map<string, string>(),
		failNextSet: false,
		/** What the document says its origin is: an about:blank popup inherits its opener's. */
		documentOrigin: "null",
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
		evaluate: async () => state.documentOrigin,
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

	describe("a page-wide turn, for a page whose URL has no origin", () => {
		/** A task that logs its start, waits for `gate`, then logs its end. */
		const gated =
			(log: string[], name: string, gate: Promise<void> = Promise.resolve()) =>
			async () => {
				log.push(`${name} start`);
				await gate;
				log.push(`${name} end`);
			};
		const opened = () => {
			let open = () => {};
			const gate = new Promise<void>((resolve) => {
				open = resolve;
			});
			return { gate, open };
		};

		it("comes after every earlier call on the page, whatever their origin", async () => {
			const page = {};
			const log: string[] = [];
			const a = opened();
			const b = opened();
			const calls = [
				takeTurn(page, A, gated(log, "A", a.gate)),
				takeTurn(page, B, gated(log, "B", b.gate)),
				takeTurn(page, PAGE_WIDE, gated(log, "page-wide")),
			];
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(log).toEqual(["A start", "B start"]);
			b.open();
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(log).toEqual(["A start", "B start", "B end"]);
			a.open();
			await Promise.all(calls);
			expect(log).toEqual(["A start", "B start", "B end", "A end", "page-wide start", "page-wide end"]);
		});

		it("holds back every later call on the page, on a chain there was and on a new one", async () => {
			const page = {};
			const log: string[] = [];
			const held = opened();
			takeTurn(page, A, gated(log, "A first"));
			const calls = [
				takeTurn(page, PAGE_WIDE, gated(log, "page-wide", held.gate)),
				takeTurn(page, A, gated(log, "A after")),
				takeTurn(page, B, gated(log, "B after")),
			];
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(log).toEqual(["A first start", "A first end", "page-wide start"]);
			held.open();
			await Promise.all(calls);
			// both start once it has ended; the two origins then run side by side
			expect(log[3]).toBe("page-wide end");
			expect(log.slice(4).sort()).toEqual(["A after end", "A after start", "B after end", "B after start"]);
		});

		it("leaves per-origin calls without one side by side", async () => {
			const page = {};
			const log: string[] = [];
			const held = opened();
			const blocked = takeTurn(page, A, gated(log, "A", held.gate));
			await takeTurn(page, B, gated(log, "B"));
			expect(log).toEqual(["A start", "B start", "B end"]);
			held.open();
			await blocked;
		});
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

	it("a seed on an about:blank popup that inherited the origin writes at once, in order with a set after it", async () => {
		const popup = fakePage("about:blank");
		popup.state.documentOrigin = A;
		const storage = new SessionStorage(popup.page, { label: "Popup", origin: A });
		await Promise.all([storage.seed({ token: "seeded" }), storage.set("token", "set")]);
		expect(popup.state.writes).toEqual(["token=seeded", "token=set"]);
		expect(popup.state.store.get("token")).toBe("set");
	});

	it("a call whose turn comes after the page left the helper's origin fails with the origin message", async () => {
		const storage = new SessionStorage(fake.page, { label: "Account", origin: A });
		fake.state.afterNextWrite = () => {
			fake.state.url = `${B}/faq`;
		};
		const first = storage.set("a", "1");
		const second = storage.set("b", "2");
		// the page left while the first call was in flight: it fails too, saying so
		await expect(first).rejects.toThrow(
			`Account.SessionStorage.set: the page navigated to ${B}/faq while set() was writing to ${A}; 0 of 1 key was written; "a" was being written and may have reached the new document`,
		);
		await expect(second).rejects.toThrow(
			`Account.SessionStorage.set: the page is on ${B}, not on this page object's origin ${A}`,
		);
		expect(fake.state.writes).toEqual(["a=1"]);
	});

	describe("a call that waited for its turn", () => {
		const waited = (method: string, from: string, to: string) =>
			`Any.SessionStorage.${method}: the page left ${from} for ${to} while ${method}() waited for its turn; the call did nothing`;

		it("of a helper without an origin, whose page moved to another origin meanwhile, fails and does nothing", async () => {
			const storage = new SessionStorage(fake.page, { label: "Any" });
			fake.state.afterNextWrite = () => {
				fake.state.url = `${B}/faq`;
			};
			const results = await Promise.allSettled([
				storage.set("a", "1"),
				storage.set("b", "2"),
				storage.get("a"),
				storage.clear(),
			]);
			const messages = results.map((result) => (result.status === "rejected" ? (result.reason as Error).message : ""));
			// the first call was in flight when the page left; the others waited
			expect(messages[0]).toMatch(
				/^Any\.SessionStorage\.set: the page navigated to https:\/\/help\.example\/faq while/,
			);
			expect(messages.slice(1)).toEqual([waited("set", A, B), waited("get", A, B), waited("clear", A, B)]);
			expect(fake.state.writes).toEqual(["a=1"]);
			expect([...fake.state.store.keys()]).toEqual(["a"]);
		});

		it("on a page-wide turn, whose page's URL changed meanwhile, fails and does nothing", async () => {
			const popup = fakePage("about:blank");
			const storage = new SessionStorage(popup.page, { label: "Any" });
			popup.state.afterNextWrite = () => {
				popup.state.url = `${A}/account`;
			};
			const [first, second] = await Promise.allSettled([storage.set("a", "1"), storage.set("b", "2")]);
			expect(first.status).toBe("rejected");
			expect(second.status === "rejected" && (second.reason as Error).message).toBe(waited("set", "about:blank", A));
			expect(popup.state.writes).toEqual(["a=1"]);
		});

		it("of a helper without an origin follows the page between awaited calls", async () => {
			const storage = new SessionStorage(fake.page, { label: "Any" });
			await storage.set("a", "1");
			fake.state.url = `${B}/faq`;
			await storage.set("b", "2");
			expect(await storage.get("b")).toBe("2");
			expect(fake.state.writes).toEqual(["a=1", "b=2"]);
		});
	});

	describe("arguments, taken at the call", () => {
		beforeEach(() => {
			steps.defer = true;
			steps.failed = [];
			return () => {
				steps.defer = false;
			};
		});

		it("set stores the values as passed, a codec's object and the entries record changed after the call", async () => {
			const storage = new SessionStorage(fake.page, { origin: A, schema: { user: json<{ name: string }>() } });
			const user = { name: "Ada" };
			const entries: Record<string, string> = { token: "abc" };
			const setting = Promise.all([storage.set("user", user), storage.set(entries)]);
			user.name = "Changed";
			entries.token = "changed";
			entries.extra = "added";
			await setting;
			expect(fake.state.writes).toEqual(['user={"name":"Ada"}', "token=abc"]);
		});

		it("get and clear act on the keys as passed, the lists changed after the call", async () => {
			const storage = new SessionStorage(fake.page, { origin: A });
			fake.state.store.set("k", "1");
			fake.state.store.set("later", "2");
			const read = ["k"];
			const removed = ["k"];
			const calls = Promise.all([storage.get(read), storage.clear(removed)]);
			read.push("later");
			removed.push("later");
			const [value] = await calls;
			expect(value).toEqual({ k: "1" });
			expect([...fake.state.store.keys()]).toEqual(["later"]);
		});

		it("seed stores the entries as passed, on the origin passed, both changed after the call", async () => {
			const storage = new SessionStorage(fake.page);
			const entries: Record<string, string> = { token: "abc" };
			const options = { origin: A };
			const seeding = storage.seed(entries, options);
			entries.token = "changed";
			options.origin = B;
			await seeding;
			expect(fake.state.writes).toEqual(["token=abc"]);
		});

		it("a value that cannot be encoded still fails inside the step, after the origin check", async () => {
			const storage = new SessionStorage(fake.page, { label: "Account", origin: A });
			await expect(storage.set("user", { name: "Ada" } as never)).rejects.toThrow(
				`Account.SessionStorage.set: value for "user" is not a string and no codec is declared for it`,
			);
			await expect(storage.seed({ user: { name: "Ada" } } as never)).rejects.toThrow(
				`Account.SessionStorage.seed: value for "user" is not a string and no codec is declared for it`,
			);
			expect(steps.failed).toEqual(["Account.SessionStorage.set:", "Account.SessionStorage.seed:"]);
			fake.state.url = `${B}/faq`;
			await expect(storage.set("user", { name: "Ada" } as never)).rejects.toThrow(
				`Account.SessionStorage.set: the page is on ${B}, not on this page object's origin ${A}`,
			);
			expect(fake.state.writes).toEqual([]);
		});
	});
});
