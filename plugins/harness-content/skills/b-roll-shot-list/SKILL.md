---
name: b-roll-shot-list
description: >
  Convierte un guion en una lista de planos lista para filmar: cada toma, ángulo y recurso visual
  que hace falta, en el orden en que conviene rodar.
  Usar cuando la persona dice "qué tengo que filmar", "lista de planos para esto", "lista de b-roll", "cómo grabo este reel".
user-invokable: true
argument-hint: "[el guion]"
license: MIT
---

# Lista de planos y b-roll: todo lo que hay que filmar, en orden de rodaje

Convierte un guion en una lista de planos lista para filmar: cada toma, ángulo y recurso visual
que hace falta, en el orden en que conviene rodar.

## Cuándo usarla
El guion está terminado y hay que saber exactamente qué filmar.

## Qué hace falta
El guion final.

## Instrucciones
Pasale el guion a Claude y ejecutá esto.

```
Sos mi primer asistente de dirección. Guion: [pegar].

1. LISTA DE PLANOS en ORDEN DE FILMACIÓN (no en el orden del guion): agrupá por lugar y montaje
   para rodar todo en un sitio antes de mudarme. Numerá los planos.
2. POR PLANO: qué entra en cuadro, el ángulo, cuánto filmar y LA LÍNEA QUE CUBRE.
3. SIN HUÉRFANOS: si un plano no cubre ninguna línea, sacalo y decime que lo sacaste.
4. COBERTURA: marcá cuáles planos son esenciales y cuáles son un extra, para saber qué descartar si falta tiempo.
5. PLAN B CON BANCO DE IMÁGENES: para lo que no pueda filmar, el término exacto de búsqueda para encontrarlo.
6. EQUIPO: lo que realmente necesito, en una lista corta.
```

**Criterio:** cada plano tiene que tener una tarea. Las imágenes lindas que no cubren ninguna línea hacen que el reel se arrastre.
