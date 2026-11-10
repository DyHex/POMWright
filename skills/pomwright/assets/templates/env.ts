// The origins the tests run against, read once from the environment, so one suite runs against every environment. The
// base classes read them, and so does the Playwright config's baseURL.
// A page object checks its origin when it is constructed, so a malformed value fails naming the page object.

const origin = (name: string, fallback: string): string => process.env[name] ?? fallback;

export const env = {
	/** The shop's origin, such as https://shop.example or http://localhost:3000. */
	shopUrl: origin("SHOP_URL", "https://shop.example"),
};
