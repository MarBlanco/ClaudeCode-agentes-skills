// Recorridos verdes observados en la corrida 20261031-2312-full-audit. Deben PASAR.
// Nunca pulsa "Pagar ahora" (POST /api/pay prohibido).
import { test, expect } from '@playwright/test';

test('home lista los 3 productos con precio', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Regalos hechos a mano');
  await expect(page.getByRole('link', { name: 'Ver producto' })).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Taza de cerámica' })).toBeVisible();
});

test('producto -> agregar -> carrito muestra linea, contador y vaciar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('listitem').filter({ hasText: 'Taza de cerámica' }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Taza de cerámica');
  await page.getByRole('spinbutton', { name: 'Cantidad' }).fill('3');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await expect(page.getByRole('status')).toHaveText('Agregado al carrito');
  await expect(page.getByRole('link', { name: 'Carrito (3)' })).toBeVisible();
  await page.getByRole('link', { name: /Carrito/ }).click();
  await expect(page.getByRole('cell', { name: 'Taza de cerámica' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Taza de cerámica' })).toBeVisible();
  await page.getByRole('button', { name: 'Vaciar carrito' }).click();
  await expect(page.getByText('Tu carrito está vacío.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Carrito (0)' })).toBeVisible();
});

test('carrito -> Ir a pagar muestra formulario de pago (sin pagar)', async ({ page }) => {
  await page.goto('/product.html?id=2');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('/cart.html');
  await page.getByRole('link', { name: 'Ir a pagar' }).click();
  await expect(page).toHaveURL(/checkout\.html$/);
  await expect(page.getByRole('textbox', { name: 'Titular' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Número de tarjeta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pagar ahora' })).toBeVisible();
});

const missingIds = ['999', 'abc', ''];
for (const id of missingIds) {
  test(`producto inexistente id=${id} muestra mensaje y vuelta al inicio`, async ({ page }) => {
    await page.goto(`/product.html?id=${id}`);
    await expect(page.getByRole('heading', { name: 'Producto no encontrado' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
}

test('back/forward entre inicio y contacto', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Contacto' }).click();
  await expect(page).toHaveURL(/contact\.html$/);
  await page.goBack();
  await expect(page).toHaveURL('http://127.0.0.1:4317/');
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Contacto' })).toBeVisible();
});
