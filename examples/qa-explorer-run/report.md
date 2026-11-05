# QA exploratoria — Tienda QA · 20261031-2312-full-audit

**Resultado:** 10 hallazgos (0 blocker / 4 major / 4 minor / 2 cosmetic) · 12 escenarios: 5 PASS / 6 FAIL / 0 BLOCKED / 1 NOT_EXECUTED
**URL:** http://127.0.0.1:4317 · **Entorno:** local · **Commit:** n/d (repo sin commits; no contiene el código de la app) · **Navegador/viewports:** chromium (playwright-cli) 1280x800, 375x812
**Duración / límites alcanzados:** ~20 min · ninguno

Escala pedida por el caller: blocker = crítico · major = alto · minor = medio · cosmetic = bajo.

## Resumen ejecutivo
Tienda de 3 productos con carrito en localStorage, contacto, newsletter y pago. Funcionan: navegación, ficha de producto, producto inexistente, carrito (agregar, persistir, vaciar) y back/forward. Defectos principales: el total del carrito ignora la cantidad (importe incorrecto), contacto muestra éxito aunque el servidor responda 500, la cantidad acepta 0/negativos/>10/decimales y la newsletter no hace nada. Corregir primero H1 (importe) y H2 (pérdida silenciosa de mensajes). El pago no se ejecutó (prohibido).

## Cobertura
| Recorrido | Prioridad | Escenarios | Estado |
|---|---|---|---|
| Compra: home > producto > carrito > checkout | Alta | S3, S4, S5, S6, S9, S10 | FAIL (H1, H3, H9) |
| Pago (Pagar ahora / POST /api/pay) | Alta | S12 | NOT_EXECUTED (prohibido por el caller) |
| Contacto | Media | S8 | FAIL (H2, H6) |
| Newsletter | Media | S2 | FAIL (H5) |
| Navegación, back/forward, 404 | Media | S1, S7 | FAIL parcial (H4, H7, H10) |
| Móvil 375 | Media | S11 | FAIL (H8) |

Páginas/estados descubiertos: 8 rutas, ~20 estados (ver map.md). No cubierto: envío del pago; a11y/performance formales; navegadores distintos de Chromium; robots/sitemap (no existen, 404).

## Hallazgos

### H1 · Total del carrito ignora la cantidad — major · product-defect
- **Esperado:** Total = suma de precio x cantidad (3 x $ 1.200 + 2 x $ 850 = $ 5.300).
- **Observado:** Total $ 1.200 con 3 tazas; $ 2.050 con 3 tazas + 2 cuadernos. El cliente además pierde el envío gratis (> $ 5.000) anunciado en la home.
- **Evidencia:** screenshots/06-cart-qty3-total-wrong.png, screenshots/07-cart-two-lines-total-wrong.png
- **Reproducción:** 1. /product.html?id=1, Cantidad 3, Agregar. 2. /product.html?id=2, Cantidad 2, Agregar. 3. /cart.html · spec: regression/defects.spec.ts H1
- **Causa probable (hipótesis):** cartTotal en /app.js suma l.price sin multiplicar por l.qty.
- **Próxima acción:** corregir el cálculo; recalcular el importe en servidor antes de cobrar.

### H2 · Contacto muestra éxito aunque el envío falla (HTTP 500) — major · product-defect
- **Esperado:** si POST /api/contact falla, mostrar error y conservar lo escrito.
- **Observado:** POST /api/contact responde 500 con error "mailer unavailable" en las 3 pruebas; la UI muestra "¡Gracias! Te responderemos pronto." y vacía el formulario. El mensaje se pierde sin aviso.
- **Evidencia:** screenshots/15-contact-valid-500-but-success.png, logs/requests-contact.txt, logs/console-contact.txt
- **Reproducción:** 1. /contact.html. 2. Nombre QA Test, Email qa+test@example.invalid, Mensaje. 3. Enviar · spec: H2
- **Causa probable (hipótesis):** el handler no revisa res.ok y descarta errores con catch vacío. El mailer del servidor no está disponible (puede ser environment; el defecto de UI existe igual).
- **Próxima acción:** manejar el estado HTTP en la UI; revisar la configuración del mailer.

### H3 · Cantidad acepta 0, negativos, más de 10 y decimales — major · product-defect
- **Esperado:** respetar min=1, max=10 y enteros; rechazar con mensaje.
- **Observado:** 0, -2, 50, vacío y 1.5 muestran "Agregado al carrito" y se guardan (qty -2, 1.5, 0); el contador del menú muestra -2 o 1.5; el carrito lista cantidad -2.
- **Evidencia:** screenshots/08-product3-qty-negative-accepted.png, screenshots/09-cart-negative-qty.png
- **Reproducción:** /product.html?id=3, Cantidad -2, Agregar, abrir carrito · spec: H3 (4 casos)
- **Causa probable (hipótesis):** Number(input.value) sin validación; min/max del input no se aplican porque no hay submit de formulario.
- **Próxima acción:** validar en cliente y servidor.

### H5 · Newsletter Suscribirme no hace nada — major · product-defect
- **Esperado:** suscribir o mostrar error de validación.
- **Observado:** con email válido o inválido (noesemail): sin request, sin mensaje, sin cambio.
- **Evidencia:** screenshots/02-newsletter-after-click.png, screenshots/03-newsletter-invalid-no-feedback.png, logs/requests-home-newsletter.txt
- **Reproducción:** home, Email qa+test@example.invalid, Suscribirme · spec: H5
- **Causa probable (hipótesis):** botón type=button, form con onsubmit que retorna false, sin handler.
- **Próxima acción:** implementar o retirar la función (confirmar con producto si estaba prevista).

### H4 · Enlace Nosotros del menú principal lleva a 404 — minor · product-defect
- **Esperado:** página Nosotros.
- **Observado:** /about.html responde 404; el enlace está en el menú de todas las páginas.
- **Evidencia:** screenshots/11-nosotros-404.png, logs/requests-about.txt, logs/console-about.txt
- **Reproducción:** home, clic en Nosotros · spec: H4
- **Próxima acción:** crear la página o quitar el enlace.

### H6 · Contacto sin validación (vacío y email inválido se envían) — minor · product-defect
- **Esperado:** Nombre y Mensaje requeridos (tienen required) y email con formato válido.
- **Observado:** formulario vacío y email esto-no-es-un-email envían POST y muestran éxito.
- **Evidencia:** screenshots/13-contact-empty-submit-success.png, screenshots/14-contact-invalid-email-success.png
- **Causa probable (hipótesis):** atributo novalidate en el form y email con type=text.
- **Reproducción:** /contact.html, Enviar sin datos · spec: H6

### H7 · Error JS no capturado en la home (analytics undefined) — minor · product-defect
- **Observado:** TypeError "Cannot read properties of undefined (reading track)" en cada carga de la home (llamada window.analytics.track con home_view); sin efecto visible, pero el evento de analítica se pierde.
- **Evidencia:** logs/console-home.txt · spec: H7
- **Próxima acción:** cargar el SDK de analítica o proteger la llamada.

### H8 · Banner promocional de ancho fijo provoca scroll horizontal — minor · product-defect
- **Observado:** en 375 px la home mide 1140 px de ancho y el texto del envío gratis queda cortado. En 1280 px hay 4 px de overflow (1284).
- **Evidencia:** screenshots/19-mobile-home.png, screenshots/24-mobile-home-fullpage.png · spec: H8
- **Causa probable (hipótesis):** .promo con width 1100px en /style.css.

### H9 · Checkout sin resumen ni total, accesible con carrito vacío — cosmetic · needs-confirmation
- **Observado:** /checkout.html pide titular y tarjeta sin mostrar productos ni importe, y carga igual con carrito vacío. El texto "Se debita al confirmar" no tiene paso de confirmación visible. El número de tarjeta es texto libre (sin pattern ni maxlength).
- **Evidencia:** screenshots/16-checkout-no-order-summary.png, screenshots/17-checkout-empty-cart-reachable.png
- **Nota:** needs-confirmation porque el pago no se ejecutó; el riesgo real (cobrar con carrito vacío o con el importe erróneo de H1) no se pudo observar. Puede subir a blocker si se confirma.

### H10 · Página 404 sin navegación y favicon inexistente — cosmetic · product-defect
- **Observado:** la 404 solo muestra el título, sin menú ni enlace al inicio; /favicon.ico responde 404 en cada página (error de consola).
- **Evidencia:** screenshots/12-generic-404.png, logs/console-home.txt

## Matriz de escenarios
| # | Recorrido | Escenario | Estado | Hallazgo | Evidencia |
|---|---|---|---|---|---|
| S1 | Navegación | Home carga productos y precios | PASS (con error de consola H7) | H7 | 01-home-desktop.png |
| S2 | Newsletter | Válido / inválido | FAIL | H5 | 02, 03 |
| S3 | Compra | Ficha de producto y agregar | PASS | — | 04, 05 |
| S4 | Compra | Total del carrito | FAIL | H1 | 06, 07 |
| S5 | Compra | Cantidades inválidas (0, -2, 50, vacío, 1.5) | FAIL | H3 | 08, 09 |
| S6 | Compra | Producto inexistente (999, abc, vacío, sin id) | PASS | — | 10 |
| S7 | Navegación | Nosotros, 404 genérica, back/forward | FAIL (back/forward PASS) | H4, H10 | 11, 12 |
| S8 | Contacto | Vacío, email inválido, válido | FAIL | H2, H6 | 13, 14, 15 |
| S9 | Compra | Ir a pagar (sin enviar) | PASS con observaciones | H9 | 16, 17 |
| S10 | Compra | Persistencia tras reload y Vaciar carrito | PASS | — | 18 |
| S11 | Responsive | 375x812 en home, producto, carrito, contacto, checkout | FAIL (solo home) | H8 | 19-24 |
| S12 | Pago | Pulsar Pagar ahora | NOT_EXECUTED | — | prohibido por el caller; sin gateNotes |

## Consola y red
| Página | Errores de consola | Requests 4xx/5xx o fallidas |
|---|---|---|
| / | TypeError track; favicon 404 | GET /favicon.ico 404 |
| /product.html?id=1..3 | ninguno | ninguna |
| /product.html?id=999 o sin id | 404 de recurso | GET /api/products/999 404, /api/products/null 404 (esperable) |
| /cart.html | ninguno | ninguna |
| /checkout.html | ninguno | ninguna |
| /contact.html | 3x 500 | POST /api/contact 500 (x3) |
| /about.html | 404 | GET /about.html 404 |

Tiempos: todas las respuestas medidas con curl < 10 ms; sin requests lentas.

## Regresión
| Spec | Tipo | Corrida 1 | Corrida 2 |
|---|---|---|---|
| regression/journeys.spec.ts (7 tests) | recorridos verdes | 7/7 pass | 7/7 pass |
| regression/defects.spec.ts H1 | repro defecto | fail (esperado) | fail (esperado) |
| defects H2 | repro defecto | fail | fail |
| defects H3 x4 (0, -2, 50, 1.5) | repro defecto | 4 fail | 4 fail |
| defects H4 | repro defecto | fail | fail |
| defects H5 | repro defecto | fail | fail |
| defects H6 | repro defecto | fail | fail |
| defects H7 | repro defecto | fail | fail |
| defects H8 | repro defecto | fail | fail |

Todos los fallos ocurren en la aserción del comportamiento esperado (logs/regression-run1.txt, logs/regression-run2.txt). Sin flaky. logs/regression-run0-draft.txt es una corrida previa con H3/H6 menos estrictos (descartada).
Runner: compartido del harness (el proyecto no tiene @playwright/test).
Comando: NODE_PATH=<runner>/node_modules <runner>/node_modules/.bin/playwright test -c (ruta absoluta)/.harness/qa/20261031-2312-full-audit/regression/playwright.config.mjs
H2 y H6 envían POST /api/contact con datos ficticios en cada corrida (hoy el servidor responde 500).
Promover al suite del proyecto: pendiente de aprobación (ver skill web-qa).

## Lo que no funcionó / limitaciones de la corrida
- El primer clic en Ver producto no navegó (sin error visible); el segundo sí. No se volvió a reproducir (regresión 2x verde): tratado como artefacto de automatización, no como defecto.
- Pago no ejecutado: no se sabe qué hace POST /api/pay, ni si cobra el total erróneo de H1 o con carrito vacío.
- Las hipótesis de causa se basan en el HTML/JS servido; el directorio del proyecto no contiene el código fuente.
- Redacción: grep -riE con authorization, cookie, set-cookie, bearer, password y token sobre toda la carpeta de la corrida (incluye .playwright-cli/ y regression/test-results/): 0 coincidencias. Único dato tipo personal: el email ficticio qa+test@example.invalid. No se guardó storage state.
