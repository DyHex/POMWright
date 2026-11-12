import { randomUUID } from "node:crypto";
import products from "./products.json";

type LoginForm = { email: string; password: string };

export const shop = {
	home: {
		// a value
		newsletter: { email: "ada@shop.example" },
		// a generator: a new subscriber each call, so no two tests share one
		newSubscriber: () => ({ email: `subscriber-${randomUUID()}@shop.example` }),
	},
	// values kept in a JSON file
	products,
	login: {
		// a builder: the default form, with what a case changes
		form: (changes: Partial<LoginForm> = {}): LoginForm => ({
			email: "ada@shop.example",
			password: "correct horse",
			...changes,
		}),
	},
} as const;
