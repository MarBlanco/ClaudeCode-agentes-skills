// Repro de defectos de la corrida 20261031-2312-full-audit.
// Cada test afirma el comportamiento ESPERADO: hoy deben FALLAR; pasaran cuando se corrija el defecto.
import { test, expect } from '@playwright/test';

test('H1 total del carrito multiplica precio por cantidad', async ({ page }) => {
  await page.goto('/product.html?id=1');
  await page.getByRole('spinbutton', { name: 'Cantidad' }).fill('3');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/product.html?id=2');
  await page.getByRole('spinbutton', { name: 'Cantidad' }).fill('2');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/cart.html');
  // 3 x 1.200 + 2 x 850 = 5.300
  await expect(page.locator('[data-total]')).toHaveText('$ 5.300');
});

test('H2 contacto no muestra exito cuando la API responde error', async ({ page }) => {
  await page.goto('/contact.html');
  await page.getByRole('textbox', { name: 'Nombre' }).fill('QA Test');
  await page.getByRole('textbox', { name: 'Email' }).fill('qa+test@example.invalid');
  await page.getByRole('textbox', { name: 'Mensaje' }).fill('Mensaje de prueba QA');
  const respPromise = page.waitForResponse('**/api/contact');
  await page.getByRole('button', { name: 'Enviar' }).click();
  const resp = await respPromise;
  const status = page.getByRole('status');
  if (resp.ok()) {
    await expect(status).toHaveText('¡Gracias! Te responderemos pronto.');
  } else {
    await expect(status).not.toHaveText('¡Gracias! Te responderemos pronto.');
  }
});

const invalidQuantities = ['0', '-2', '50', '1.5'];
for (const qty of invalidQuantities) {
  test(`H3 cantidad invalida ${qty} no se agrega al carrito`, async ({ page }) => {
    await page.goto('/product.html?id=3');
    await page.getByRole('spinbutton', { name: 'Cantidad' }).fill(qty);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await expect(page.getByRole('link', { name: 'Carrito (0)' })).toBeVisible();
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('qa-app-cart') ?? '[]'));
    expect(cart).toEqual([]);
  });
}

test('H4 enlace Nosotros del menu no lleva a 404', async ({ page }) => {
  await page.goto('/');
  const responsePromise = page.waitForResponse('**/about.html');
  await page.getByRole('link', { name: 'Nosotros' }).click();
  const resp = await responsePromise;
  expect(resp.status()).toBe(200);
});

test('H5 newsletter da feedback al suscribirse', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email' }).fill('qa+test@example.invalid');
  await page.getByRole('button', { name: 'Suscribirme' }).click();
  await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 });
});

test('H6 contacto vacio no se envia', async ({ page }) => {
  await page.goto('/contact.html');
  let posted = false;
  page.on('request', (r) => { if (r.url().endsWith('/api/contact')) posted = true; });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('status')).toBeHidden();
  expect(posted).toBe(false);
});

test('H7 home sin errores JS no capturados', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Ver producto' })).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('H8 home sin scroll horizontal en movil 375', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Ver producto' })).toHaveCount(3);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(375);
});
