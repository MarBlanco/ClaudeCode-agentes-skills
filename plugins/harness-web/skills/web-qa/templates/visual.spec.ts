// Plantilla harness-web (web-qa) · G4 regresión visual y responsive.
import { expect, test } from '@playwright/test';

// Rutas públicas a cubrir. Mantener la lista corta y estable.
const ROUTES = ['/'];
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`visual ${route} @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Sin overflow horizontal
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, 'overflow horizontal en px').toBeLessThanOrEqual(0);

      const slug = route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, '');
      await expect(page).toHaveScreenshot(`${slug}-${vp.name}.png`, {
        fullPage: true,
        // Ocultar contenido dinámico (fechas, contadores, carruseles):
        // mask: [page.locator('[data-dynamic]')],
      });
    });
  }
}
