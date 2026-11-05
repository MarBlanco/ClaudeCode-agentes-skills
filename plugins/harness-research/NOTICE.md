# Procedencia de componentes de terceros

Las siguientes Skills se copiaron de [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins),
commit `2574e29377c7173d0cecffef29a6ecbd7f8ccb5d` (2026-10-27), bajo licencia Apache-2.0
(texto completo en `LICENSE-anthropic-apache-2.0.txt`):

| Skill | Origen en el repositorio |
|---|---|
| `competitive-brief` | `marketing/skills/competitive-brief` |
| `campaign-plan` | `marketing/skills/campaign-plan` |
| `product-brainstorming` | `product-management/skills/product-brainstorming` |
| `statistical-analysis` | `data/skills/statistical-analysis` |
| `validate-data` | `data/skills/validate-data` |

`CONNECTORS.md` proviene de `marketing/CONNECTORS.md`.

## Cambios locales

- `CONNECTORS.md`: se agregó al inicio una nota que aclara que este plugin no instala servidores MCP.
- Las Skills se distribuyen sin modificaciones. Al actualizar, copiar de nuevo desde el commit elegido y reaplicar la nota de `CONNECTORS.md`.

No se incorporaron `data-visualization` ni `build-dashboard`: la sesión ya ofrece la Skill `dataviz` de Anthropic.

Las Skills `market-research` y `web-research` y el agente `market-researcher` son propios del harness.
