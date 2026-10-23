import type { Page } from "@playwright/test";
import { beforeEach, describe, expect, it, vi } from "vitest";

// test.step is replaced by a recorder. The helpers' steps are boxed, so the report shows them at the test's line, as
// `@step` rows are; a runner probe reads the reported locations, which only the runner computes.
const recorded: { title: string; options: unknown }[] = [];
vi.mock("@playwright/test", () => ({
	test: {
		step: async (title: string, body: () => unknown, options?: unknown) => {
			recorded.push({ title, options });
			return body();
		},
	},
}));
const { createNavigation } = await import("./navigation");
const { SessionStorage } = await import("./sessionStorage");

const store = new Map<string, string>();
const fakePage = (url: string) =>
	({
		goto: async () => null,
		waitForURL: async () => {},
		url: () => url,
		// a seed on the origin passes through the seed registry, which watches the main frame while it waits its turn
		mainFrame: () => ({ url: () => url }),
		on: () => undefined,
		off: () => undefined,
		sessionStorage: {
			setItem: async (key: string, value: string) => {
				store.set(key, value);
			},
			getItem: async (key: string) => store.get(key) ?? null,
			items: async () => [...store].map(([name, value]) => ({ name, value })),
			removeItem: async (key: string) => {
				store.delete(key);
			},
			clear: async () => store.clear(),
		},
	}) as unknown as Page;

beforeEach(() => {
	recorded.length = 0;
	store.clear();
});

describe("the helpers' steps are boxed", () => {
	it("boxes every navigation step", async () => {
		const page = fakePage("https://other.example/");
		const navigation = createNavigation(
			page,
			"https://shop.example",
			"/login",
			"https://shop.example/login",
			"LoginPage",
			() => null,
		);
		await navigation.goto();
		await navigation.goto("/account");
		await navigation.expectThisPage();
		await navigation.expectAnotherPage();
		expect(recorded).toEqual([
			{ title: "LoginPage: Navigate to this Page", options: { box: true } },
			{ title: "LoginPage: Navigate to https://shop.example/account", options: { box: true } },
			{ title: "LoginPage: Expect this Page", options: { box: true } },
			{ title: "LoginPage: Expect any other Page", options: { box: true } },
		]);
	});

	it("boxes every session storage step", async () => {
		const storage = new SessionStorage(fakePage("https://shop.example/login"), {
			label: "Auth",
			origin: "https://shop.example",
		});
		await storage.set("token", "abc");
		await storage.get("token");
		await storage.clear("token");
		await storage.seed("token", "abc");
		expect(recorded).toEqual([
			{ title: "Auth.SessionStorage.set:", options: { box: true } },
			{ title: "Auth.SessionStorage.get:", options: { box: true } },
			{ title: "Auth.SessionStorage.clear:", options: { box: true } },
			{ title: "Auth.SessionStorage.seed:", options: { box: true } },
		]);
	});

	it("opens the session storage steps from a helper that is not async", () => {
		// Called through an async wrapper, a boxed step reports no location at all (runner probe).
		const helper = (SessionStorage.prototype as unknown as Record<string, unknown>).step as () => unknown;
		expect(helper.constructor.name).toBe("Function");
	});
});
