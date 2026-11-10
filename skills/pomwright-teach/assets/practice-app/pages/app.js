// What every page of the practice shop shares: the cart in session storage, and the cookie dialog.
const practiceShop = {
	cart() {
		return JSON.parse(sessionStorage.getItem("cart") ?? '{"items":[]}');
	},
	addToCart(name) {
		const cart = practiceShop.cart();
		const item = cart.items.find((entry) => entry.name === name);
		if (item) item.quantity += 1;
		else cart.items.push({ name, quantity: 1 });
		sessionStorage.setItem("cart", JSON.stringify(cart));
	},
	removeFromCart(name) {
		const cart = practiceShop.cart();
		cart.items = cart.items.filter((entry) => entry.name !== name);
		sessionStorage.setItem("cart", JSON.stringify(cart));
	},
};

// the pages' own scripts use the cart helper
globalThis.practiceShop = practiceShop;

const consent = document.querySelector('[role="dialog"][aria-label="Cookies"]');
if (sessionStorage.getItem("consent") === null) consent.hidden = false;
for (const button of consent.querySelectorAll("button")) {
	button.addEventListener("click", () => {
		sessionStorage.setItem("consent", button.textContent === "Accept all" ? "given" : "refused");
		consent.hidden = true;
	});
}
