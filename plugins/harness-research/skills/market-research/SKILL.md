---
name: market-research
description: Investigar un mercado con evidencia verificable - demanda, tendencias, competencia, precios publicados y oportunidades - clasificando cada dato como venta verificada, indicador de popularidad o hipótesis, sin inventar cifras. Usar al evaluar si conviene crear un producto, elegir un nicho, dimensionar interés o comparar alternativas; también al diseñar funcionalidades que muestren datos de mercado a usuarios. Combinar con competitive-brief (competencia en detalle) y web-research (búsqueda y verificación de fuentes).
---

# Investigación de mercado con evidencia

Una recomendación de mercado vale lo que valen sus fuentes. El trabajo es separar lo que se sabe de lo que se supone.

## 1. Encuadrar la pregunta

- Escribir la decisión que la investigación debe informar («¿crear un curso de X para Y?»), no un tema abierto.
- Definir mercado, público, región, idioma y período. Un dato sin región ni fecha no es comparable.
- Listar hipótesis explícitas antes de buscar: qué resultado cambiaría la decisión.

## 2. Inventario de fuentes antes de prometer datos

Comprobar qué fuentes están realmente disponibles en el entorno (API pública, credencial, cuota, términos de uso) y
registrarlo. Nunca reemplazar una fuente faltante por números estimados.

| Tipo | Ejemplos | Qué permite afirmar |
|---|---|---|
| Ventas verificadas | Datos propios del vendedor (API del marketplace con sus credenciales), reportes auditados | Ventas reales de ese vendedor |
| Indicadores de popularidad | Vistas de páginas (Wikimedia), volumen relativo de búsqueda, vistas/suscriptores públicos, cantidad de preguntas | Interés o actividad, **no** ventas ni ingresos |
| Oferta y competencia | Catálogos públicos, páginas de producto, precios publicados | Qué existe y a qué precio se ofrece |
| Hipótesis | Razonamiento del analista o de un modelo | Nada, hasta validarse; se rotula como hipótesis |

Respetar términos de servicio: no hacer scraping de sitios que lo prohíben ni usar endpoints internos no documentados.

## 3. Niveles de evidencia (obligatorio en cada afirmación)

- `verified_sales`: cifra de ventas con fuente y período verificables.
- `popularity`: métrica pública con fuente, fecha de consulta, período y unidad (p. ej. «12.430 vistas/mes en
  es.wikipedia, ene–oct 2026, consultado 2026-11-03»).
- `hypothesis`: inferencia; explicar el razonamiento y qué dato la confirmaría.

Reglas: no convertir popularidad en ventas, no extrapolar tamaños de mercado sin fuente, no promediar fuentes con
unidades distintas, mostrar rangos y fechas, y decir «sin datos» cuando no los hay.

## 4. Análisis

1. **Demanda**: tendencia (sube/estable/baja) con la serie que la respalda; estacionalidad si aplica.
2. **Competencia**: quién ofrece algo equivalente, formato, precio publicado, diferenciación (ver `competitive-brief`).
3. **Huecos**: necesidades sin cubrir, públicos desatendidos, especialidades que la oferta mezcla.
4. **Riesgos**: saturación, dependencia de una plataforma, regulación, datos insuficientes.
5. **Triangulación**: una conclusión fuerte necesita al menos dos fuentes independientes; si hay una sola, bajar la confianza.

## 5. Entregable

```
Pregunta y decisión
Fuentes consultadas (disponible / no disponible / motivo)
Hallazgos — cada uno con nivel de evidencia, fuente, fecha
Oportunidades (máximo 3) y recomendación principal con su porqué
Confianza (alta/media/baja) y qué dato la subiría
Limitaciones
```

## Al construir productos que muestran inteligencia de mercado

- Guardar con cada dato: fuente, URL, fecha de consulta, período, unidad y nivel de evidencia.
- Cachear consultas externas con vencimiento y limitar la cantidad por usuario/día para controlar costos y cuotas.
- Si una fuente no está configurada o falla, mostrarlo como «no disponible», nunca con datos de ejemplo presentados como reales.
