# Procedencia de componentes de terceros

Todas las skills de este plugin son de terceros y se incorporaron **sin modificar**: cada archivo es idéntico (por hash de Git) al del commit fijado.

| Skills | Origen | Commit | Licencia |
|---|---|---|---|
| `ig-audit`, `ig-caption`, `ig-carousel`, `ig-comment`, `ig-dm`, `ig-human`, `ig-plan`, `ig-profile`, `ig-reel`, `ig-reply`, `ig-repurpose`, `ig-story`, `ig-viral` | [Jakeschincariol/instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill), carpeta `skills/` | `d03c56bb598be770c60b201f94237e5d1a4268a6` | MIT (`LICENSE-instagram-agent-skill-mit.txt`) |
| `ab-hook-tester`, `b-roll-shot-list`, `content-pillar-builder`, `cover-thumbnail-brief`, `on-screen-text-writer`, `utm-campaign-plan` | [Ootto-AI/claude-content-skills](https://github.com/Ootto-AI/claude-content-skills), carpeta `skills/` | `691875ac3eafaf84ec0bdb0283728c85d2cb3413` | MIT (`LICENSE-ootto-content-skills-mit.txt`) |
| `hyperframes`, `hyperframes-cli`, `hyperframes-registry` | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes), carpeta `skills/` | `064c4365578e8e019b0180c74d0b3da49e9362d9` (v0.9.54) | Apache-2.0 (`LICENSE-hyperframes-apache-2.0.txt`) |

`templates/voice.md` es la plantilla de voz de marca del paquete de Instagram (misma licencia, copiada tal cual).

No se incorporaron de Ootto: `content-factory` y `comment-responder` (publican y responden solos por Composio, contra la regla de publicación manual), `reel-builder` (render con Runway/Seedance, gasto fuera de `credit-guard`), `agent-reach` (CLIs y cookies de varias plataformas) y el resto de sus 54 skills (se solapan con `ig-*` o con `harness-research`). Las 6 incorporadas son plantillas de texto sin código ni red; su pie publicitario y sus enlaces a skills no instaladas se dejaron tal cual (sin modificar).

No se incorporaron de otros paquetes: las 6 skills internas de HyperFrames (`changelog-video`, `motion-doctrine`, etc.: son de su propio repositorio), `media-use` (usa servicios en la nube con cuenta y créditos), `reverse-any-video` y `style-sampling` (HyperFrames Pro, de pago), ni `figma`, `slideshow` y `remotion-to-hyperframes` (a pedido).

## Revisión previa (2026-11-15)

- **Instagram:** los 6 scripts de Python usan solo la biblioteca estándar, sin red ni procesos; leen texto por entrada estándar o archivos. Las skills prohíben publicar, automatizar comentarios o mensajes, iniciar sesión por el usuario y scrapear a volumen.
- **HyperFrames:** `scripts/plugin-cli.mjs` solo invoca el CLI `hyperframes`; `bake-basemap.mjs` baja teselas de mapas públicos; `locate.mjs` llama a la API de Gemini con una clave y **no se usa**.
- **Telemetría de HyperFrames:** su CLI y sus skills envían métricas de uso (vinculadas a la cuenta si hay sesión). Antes de usarlo: `npx hyperframes telemetry disable`. No usar `hyperframes auth login` ni `hyperframes share` (suben contenido a su nube).

## Límites a tener presentes

- Las skills de Instagram están en **inglés**, y sus fórmulas de ganchos, lista de frases de IA y expresiones regulares no contemplan tildes ni la ñ. Para una app en español hay que adaptar la lógica (por ejemplo, portarla a TypeScript con vocabulario propio), no reutilizarla tal cual.
- Guardan la voz de marca en `~/.claude/instagram/`; en un proyecto con carpeta de marca conviene apuntar a esa carpeta.
- HyperFrames necesita Node 22+ y FFmpeg, y descarga un Chromium para renderizar: definir `PUPPETEER_CACHE_DIR` en un disco con espacio. Sus skills están pensadas para coincidir con la versión del CLI (`hyperframes@0.9.54`).
- Estas herramientas componen video con fotos, texto y transiciones; no generan imágenes realistas. La música necesita licencia propia.

## Actualizar

Copiar de nuevo desde el commit elegido, revisar el diff completo, verificar por hash y actualizar `harness.lock.json`.
