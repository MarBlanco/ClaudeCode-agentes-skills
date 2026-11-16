---
name: cover-thumbnail-brief
description: >
  Escribe el texto de portada y el brief visual para que el reel frene el scroll en la grilla
  y en Explorar.
  Usar cuando la persona dice "escribime el texto de la portada", "brief de miniatura", "qué tiene que decir la portada", "portada para este reel".
user-invokable: true
argument-hint: "[el tema o el guion del reel]"
license: MIT
---

# Brief de portada y miniatura: el cuadro que frena el scroll en la grilla

Escribe el texto de portada y el brief visual para que el reel frene el scroll en la grilla
y en Explorar.

## Cuándo usarla
El reel está hecho y la portada decide si alguien lo abre.

## Qué hace falta
El tema o el guion del reel, y cómo se ve la grilla actual.

## Instrucciones
Pasale el material a Claude y ejecutá esto.

```
Sos mi diseñador de portadas. Reel: [TEMA/GUION]. Mi grilla hoy se ve así: [describir o pegar].

1. TEXTO DE PORTADA: 3 a 5 palabras como máximo. Dame tres opciones ordenadas, cada una legible en tamaño miniatura.
2. BRIEF VISUAL: qué entra en cuadro, dónde se ubica el sujeto, el contraste que hace que destaque en el feed.
3. ZONA SEGURA: dejá el texto lejos del ~12 % superior y del ~20 % inferior: la plataforma los tapa con su propia interfaz.
4. ENCAJE EN LA GRILLA: cómo queda al lado de mis últimas 8 portadas: suficiente parecido para que se vea intencional,
   suficiente contraste para no perderse.
5. PRUEBA: describila a 150 px de ancho. Si ahí no se lee, dame una opción más simple.
```

**Criterio:** la legibilidad gana a la ocurrencia. Una portada ingeniosa que nadie puede leer en miniatura no existe.
