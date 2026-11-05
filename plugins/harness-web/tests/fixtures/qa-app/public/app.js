// Carrito en localStorage: [{ id, name, price, qty }]
const CART_KEY = 'qa-app-cart';

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function addToCart(product, qty) {
  const cart = getCart();
  const line = cart.find((l) => l.id === product.id);
  if (line) line.qty += qty;
  else cart.push({ ...product, qty });
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartCount();
}

export function cartTotal(cart) {
  return cart.reduce((sum, l) => sum + l.price, 0);
}

export function money(n) {
  return `$ ${n.toLocaleString('es-AR')}`;
}

export function renderCartCount() {
  const el = document.querySelector('[data-cart-count]');
  if (el) el.textContent = String(getCart().reduce((n, l) => n + l.qty, 0));
}

renderCartCount();
