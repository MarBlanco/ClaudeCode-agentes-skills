---
name: utm-campaign-plan
description: Usar cuando una campaña necesita una forma consistente y aprobada de etiquetar enlaces, para distinguir las fuentes y poder reportar después. Frases típicas "planificá los UTM", "poné nombre a los enlaces de la campaña", "armá enlaces con seguimiento", "cómo etiquetamos los enlaces de las creadoras", "configurá la atribución de este lanzamiento". No usar para afirmar que se tiene acceso a analíticas, para crear seguimiento sin consentimiento o revisión de políticas, ni para decidir la estrategia de la campaña.
license: MIT
---

# Plan de UTM de campaña

Crear una taxonomía de enlaces pequeña y consistente que responda preguntas reales de reporte, sin convertir cada URL en ruido de seguimiento sin gobierno.

## 1. Empezar por la pregunta de reporte

Preguntar qué decisión debe respaldar el dato, qué destinos están aprobados, qué canales y socios participan, qué sistema de analíticas consume los enlaces y qué convención de nombres ya existe. Si no se conoce a la persona responsable del reporte ni el sistema, dejar asentada esa limitación antes de emitir enlaces.

## 2. Definir el vocabulario controlado

Fijar valores permitidos para source, medium, campaign, content y term solo cuando cada uno sirva para una decisión. Usar nombres legibles y estables. Separar redes propias, redes pagas, creadoras, socios y experimentos, para que el reporte posterior no mezcle tráfico distinto.

## 3. Emitir un registro de enlaces

Para cada enlace, indicar el destino, la ubicación prevista, los valores UTM, la persona responsable, el contexto de inicio y fin, y el estado de aprobación. Incluir ejemplos válidos e inválidos. Reservar un proceso de cambios para que ninguna creadora ni operadora altere la taxonomía en silencio.

## 4. Validar antes de usar y revisar después

Comprobar que las URL llevan al destino aprobado, que los parámetros están bien codificados y que una misma fuente no aparece con varios nombres. Al terminar la campaña, comparar el uso de los enlaces con el registro y anotar cualquier corrección de la taxonomía para el próximo brief.

## Reglas duras

- No crear enlaces de seguimiento para destinos ni campañas sin aprobar.
- Nunca poner datos personales, información sensible, nombres de clientes ni identificadores privados en los valores UTM.
- No tomar los UTM como prueba de conversión ni de causalidad.
- Conservar las convenciones de analíticas existentes salvo que una persona autorizada apruebe un cambio.
- Mantener distinguibles el tráfico de afiliados, pago, orgánico, de creadoras y de socios.

## Modos de falla

| Falla | Qué hacer en cambio |
| --- | --- |
| Cada integrante del equipo inventa nombres | Publicar un solo vocabulario controlado y un registro compartido. |
| Los parámetros llevan datos personales o sensibles | Usar una etiqueta de campaña que no identifique a nadie y mantener los datos sensibles fuera de las URL. |
| Un enlace corto esconde un destino sin verificar | Validar la redirección final y la página de destino aprobada antes de compartirlo. |
| Los reportes mezclan tráfico de creadoras y pago | Asignar valores distintos de medium y source y conservarlos en el registro. |
