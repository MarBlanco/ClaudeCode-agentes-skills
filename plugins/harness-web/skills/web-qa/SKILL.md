---
name: web-qa
description: Configurar y ejecutar los gates web del harness en un proyecto (G3 E2E, G4 regresión visual y responsive, G5 accesibilidad, G7 performance) con Playwright Test, @axe-core/playwright y Lighthouse CI. Usar al preparar un proyecto web para verificación, al agregar tests de una pantalla nueva o cuando qa-verifier reporta NOT_CONFIGURED en esos gates.
---

# Web QA

Plantillas y procedimiento para los gates web. El catálogo y los criterios PASS están en la referencia de gates de la skill `harness-core:harness-review`. La ejecución la hace `qa-verifier`; esta skill prepara el proyecto para que esos gates existan.

## Herramientas (verificadas 31-10-2026)

| Gate | Herramienta | Licencia | Versión |
|---|---|---|---|
| G3, G4 | `@playwright/test` (`toHaveScreenshot`) | Apache-2.0 | 1.64.1 |
| G5 | `@axe-core/playwright` | MPL-2.0 | 4.14.0 |
| G7 | `@lhci/cli` | Apache-2.0 | 0.15.1 |

Se instalan como devDependencies del proyecto con su gestor (`npm i -D ...`). No usar servicios externos de regresión visual: tienen costo y `toHaveScreenshot` cubre la necesidad.

## Procedimiento

1. Detectar lo existente: `playwright.config.*`, carpeta de tests E2E, scripts de `package.json`, `lighthouserc.*`. Reutilizar antes de crear.
2. Si falta Playwright: instalar `@playwright/test`, `npx playwright install chromium` y copiar `templates/playwright.config.ts` adaptando `baseURL` y `webServer.command` al script de dev/preview del proyecto.
3. Visual + responsive (G4): copiar `templates/visual.spec.ts`, listar las rutas públicas afectadas. Primera ejecución con `--update-snapshots` para crear la línea base y commitear las imágenes. Los diffs posteriores se revisan, no se aceptan a ciegas.
4. Accesibilidad (G5): copiar `templates/a11y.spec.ts`. Falla con violaciones `serious` o `critical`.
5. Performance (G7): copiar `templates/lighthouserc.json`, ajustar URLs y presupuestos al perfil. Ejecutar contra un build de producción local (`build` + `preview/start`), nunca contra producción.
6. Registrar los comandos en `.claude/harness.manifest.json` → `gateCommands` vía SyncProject (perfil), no a mano.

## Reglas

- Las líneas base visuales dependen del sistema operativo y las fuentes: generar y comparar en el mismo entorno (local Windows o CI Linux, no mezclar). En CI, usar el contenedor oficial de Playwright.
- Datos de prueba deterministas: congelar fechas, mockear red externa con `page.route`, ocultar contenido dinámico con la opción `mask`.
- Sin credenciales reales en tests. Usuarios de prueba locales o mocks.
- Revisión en Chrome real (consola, red, captura) con la skill `chrome-devtools` complementa G4; no la reemplaza.
- Specs generados por `qa-explore` en `.harness/qa/<run>/regression/`: revisarlos y moverlos al directorio E2E del proyecto solo con aprobación del usuario; desde ahí cuentan para G3.
