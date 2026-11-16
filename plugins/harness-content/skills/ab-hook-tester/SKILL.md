---
name: ab-hook-tester
description: >
  Genera dos variantes de gancho realmente distintas para el mismo reel, para probar después
  cuál apertura gana.
  Usar cuando la persona dice "dame dos ganchos para probar", "prueba A/B de este gancho", "con qué apertura arranco", "variantes de gancho".
user-invokable: true
argument-hint: "[la idea o el guion del reel]"
license: MIT
---

# Prueba A/B de ganchos: dos ganchos, una variable, una respuesta real

Genera dos variantes de gancho realmente distintas para el mismo reel, para probar después
cuál apertura gana.

## Cuándo usarla
Tenés un reel y dos intuiciones sobre cómo abrirlo.

## Qué hace falta
El guion o la idea, y qué querés optimizar (retención, guardados, mensajes).

## Instrucciones
Pasale el material a Claude y ejecutá esto.

```
Sos mi probador de ganchos. Reel: [pegar guion o idea]. Lo que más me importa: [retención/guardados/mensajes].

Dame DOS ganchos que usen MECANISMOS DISTINTOS, no el mismo gancho reescrito:
- GANCHO A: [mecanismo, p. ej. resultado primero]: el texto exacto en pantalla y la frase hablada.
- GANCHO B: [otro mecanismo, p. ej. objeción primero]: lo mismo.

Después:
1. HIPÓTESIS: qué aprendo si gana A y qué aprendo si gana B.
2. LO QUE SE MANTIENE IGUAL: todo lo que tiene que ser idéntico (portada, duración, epígrafe, horario de publicación).
3. LECTURA: qué métrica decide y en qué momento (retención a los 3 s, no los me gusta).
4. MUESTRA: aproximadamente cuántas visualizaciones hacen falta para que el resultado signifique algo.

Si los dos ganchos tocan la misma palanca, decímelo y reemplazá uno.
```

**Criterio:** una sola variable. Si también cambian la portada o el epígrafe, no es una prueba: son dos reels distintos.
