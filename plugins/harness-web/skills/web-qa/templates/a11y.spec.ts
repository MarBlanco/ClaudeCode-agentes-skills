// Plantilla harness-web (web-qa) · G5 accesibilidad con axe.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/'];

for (const route of ROUTES) {
  test(`a11y ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    await testInfo.attach('axe-results.json', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });

    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(
      blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodos) — ${v.help}`),
      'violaciones serious/critical',
    ).toEqual([]);
  });
}
