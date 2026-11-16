---
name: on-screen-text-writer
description: >
  Escribe los textos breves en pantalla, estilo subtítulo, que mantienen mirando hasta el final a
  quien ve el video sin sonido.
  Usar cuando la persona dice "escribí el texto en pantalla", "subtítulos para este reel", "textos superpuestos", "qué tiene que aparecer en pantalla".
user-invokable: true
argument-hint: "[el guion]"
license: MIT
---

# Texto en pantalla: para el 80 % que mira sin sonido

Escribe los textos breves en pantalla, estilo subtítulo, que mantienen mirando hasta el final a
quien ve el video sin sonido.

## Cuándo usarla
La mayoría mira sin sonido. El texto tiene que sostener el reel solo.

## Qué hace falta
El guion, con los momentos marcados si los tenés.

## Instrucciones
Pasale el guion a Claude y ejecutá esto.

```
Sos mi redactor de texto en pantalla. Guion: [pegar].

1. UNA LÍNEA POR MOMENTO: el titular de ese momento, no una transcripción. Tan corta que se lea antes del corte.
2. ÉNFASIS: marcá la única palabra de cada línea que hay que resaltar (negrita o color), para que la edición lo sepa.
3. TIEMPOS: atá cada línea a la palabra hablada en la que tiene que aparecer.
4. PRUEBA SIN SONIDO: listá solo las líneas, en orden. Leélas de corrido: si el reel no se entiende solo con el texto,
   reescribí las que fallan y decime cuáles.
5. LARGO: señalá toda línea de más de ~7 palabras.
```

**Criterio:** no es el guion escrito de nuevo. El texto en pantalla es el titular de cada momento: si repite la voz en off
palabra por palabra, no aporta nada.
