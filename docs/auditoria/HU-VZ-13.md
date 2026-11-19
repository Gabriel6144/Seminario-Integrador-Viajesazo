# VZ-13 — Registrar evento turístico

> **Estado:** implementada y verificada; pendiente de revisión final del equipo.
> **Sprint:** 1.
> **Actor:** publicador turístico.
> **Seguridad:** la verificación de 401/403/ownership se hace en la fase final.

## Definición funcional

El publicador registra un evento turístico con nombre, descripción, categoría, tipo de propuesta,
modalidad opcional, ubicación, fechas, horario, imágenes y datos de acceso/arancel. Al confirmar,
el evento queda asociado al publicador vinculado a su cuenta y disponible para la agenda.

## Criterios de aceptación

**CA1 — Ingreso de datos.** El publicador ingresa nombre, descripción, categoría, tipo de
propuesta, modalidad opcional, lugar/recinto, ciudad/localidad, dirección, fecha de inicio, fecha
de fin, horario de inicio, horario de fin, al menos una imagen, tipo de acceso y, si es
`DE_PAGO`, monto y sitio oficial.

**CA2 — Datos mínimos obligatorios.** Son obligatorios: nombre, descripción, categoría, tipo de
propuesta, lugar/recinto, ciudad/localidad, dirección, fecha de inicio, fecha de fin, horario de
inicio, horario de fin y al menos una imagen. Son opcionales: modalidad, imágenes adicionales,
descripción del arancel y los datos de arancel cuando el evento es gratuito. Si el evento es
`DE_PAGO`, el monto y el sitio oficial también son obligatorios.

**CA3 — Faltantes o datos inválidos.** Si falta un obligatorio o un dato no tiene el formato
esperado, el sistema responde **400** con los campos afectados, no guarda nada y el formulario los
marca. Un `tipoPropuesta` incompatible con evento responde **422**.

**CA4 — Fechas y horarios inválidos.** Se rechazan con **400**: fecha de inicio anterior a hoy,
fecha de fin anterior a la de inicio, horario de fin anterior o igual al de inicio, y formatos de
fecha u hora inválidos. No se guarda nada. Un evento nocturno que termina al día siguiente no está
permitido en esta versión.

**CA5 — Registro exitoso y autoría.** Un alta válida responde **201** con el evento creado, en
estado `INICIADO`, asociado al publicador vinculado a la cuenta autenticada. El cliente no elige
el publicador. Sin sesión responde **401**; un `TURISTA` responde **403**.

**CA6 — Disponibilidad en la agenda.** El evento queda disponible en `GET /api/agenda` si su
`fechaFin` es hoy o posterior y su estado no es `CANCELADO`. En `GET /api/eventos` aparece
siempre, incluso si ya pasó.

**CA7 — Ubicación no resoluble.** Si no se puede geocodificar la ubicación, el sistema informa el
problema con **400** y no registra el evento, porque sin coordenadas no se puede mostrar en el
mapa.

## Reglas de negocio

- Un evento de varias fechas usa la misma franja horaria en cada día del rango.
- El servidor fija `estado = INICIADO` y `tipoAcceso = GRATUITO` si el cliente no envía otro.
- El cliente nunca manda `estadoPropuesta`.
- La geocodificación usa lugar/recinto + dirección + localidad; si Nominatim no resuelve, el alta
  falla.
- La autoría se resuelve con el principal autenticado; el `publicadorId` del body es opcional y
  se ignora para un `PUBLICADOR`.
- Un evento solo acepta los tipos de `Evento.tiposPermitidos()`: no incluye `VISITA_GUIADA`.
- Una actividad solo acepta `VISITA_GUIADA` y `DEPORTIVO`.

## Validaciones

| Campo | Regla |
| --- | --- |
| `nombre` | Obligatorio, máximo 150 |
| `descripcion` | Obligatoria, máximo 1000 |
| `categoria` | Obligatoria |
| `tipoPropuesta` | Obligatorio y compatible con el subtipo |
| `modalidad` | Opcional |
| `lugarRecinto` | Obligatorio, máximo 200 |
| `localidad` | Obligatoria, máximo 120 |
| `direccion` | Obligatoria, máximo 250 |
| `fechaInicio` / `fechaFin` | Obligatorias, no pasadas al crear, orden correcto |
| `horarioInicio` / `horarioFin` | Obligatorios, fin posterior a inicio |
| `imagenes` | Al menos una; cada URL no vacía y máximo 500 |
| `publicadorId` | Opcional; el `PUBLICADOR` lo deriva del JWT. El `ADMIN` lo indica por API |
| `sitioOficial` | URL `http(s)`, máximo 500 |
| `descripcionArancel` | Máximo 1000 |

## Fuera de alcance

- Baja y edición completa de eventos (VZ-14/VZ-15), aunque el formulario comparte reglas.
- Cambios de estado distintos de `INICIADO`.
- Eventos que cruzan la medianoche.
- Carga de eventos históricos.
- Verificación de seguridad completa; queda para la fase final.

## Resultado de la implementación

**Backend**
- `EventoRequest`: descripción, categoría, tipo y horarios obligatorios; imágenes con al menos un
  elemento y límites de longitud.
- `EventoRequest.publicadorId` y `ActividadRequest.publicadorId` pasan a ser opcionales.
- `PropuestaService` y `ActividadService` derivan el publicador del principal autenticado para
  `PUBLICADOR`; un `ADMIN` debe indicarlo explícitamente al crear.
- `PropuestaService.create` rechaza fechas de inicio anteriores al `Clock` inyectado.
- `Evento.validarInvariantesEspecificas` exige descripción, categoría, horarios e imagen.

**Frontend**
- `eventoSchema` y `actividadSchema` validan el tipo según el subtipo. La UI usa
  `TIPOS_PROPUESTA_EVENTO` y `TIPOS_PROPUESTA_ACTIVIDAD`; si el tipo deja de ser válido al
  cambiar Evento/Actividad, se limpia.
- Se eliminó la sección y el selector de publicador. Los formularios ya no envían
  `publicadorId`.
- El formulario es un acordeón con una sola sección abierta: Datos, Fechas, Horarios/Duración,
  Ubicación, Imágenes y Acceso. “Continuar” valida la sección actual y “Volver” no borra datos.
- Las fechas y horarios usan inputs nativos visibles y estilizados; ya no hay capa transparente
  que impida abrir el selector.
- El tipo de acceso arranca vacío y es obligatorio elegirlo; el progreso no lo marca como
  completo hasta que el usuario elige Gratuito o Arancelado.
- La agenda propia se abre en un modal desde “Ver mi agenda”; el solapamiento está permitido y
  solo se informa.
- El selector de ubicación usa MapLibre con estilos, 2D/3D, clic, marcador arrastrable y
  geocoding inverso. El mapa del detalle también usa MapLibre.
- Tests de `schemas`, `evento-nuevo-page`, `evento-editar-page`, `evento-mapa` y
  `ubicacion-selector` actualizados.

**Verificación**
- Backend: `.\mvnw.cmd clean test` → **352 tests, 0 fallos**.
- Frontend: `npm test` → **229 tests, 223 en verde**. Los 6 restantes son preexistentes y
  pertenecen a `evento-detail-page` (3) y `circuito-page` (3), fuera de VZ-13.
- `npm run typecheck` → OK.
- `npm run lint` → 0 errores; warnings preexistentes y nuevos avisos de pureza en la agenda.

**Pendientes**
- Verificar el seed: hay eventos de demo sin horario en `data.sql`; no rompen el arranque porque
  se insertan por SQL, pero una edición posterior exigirá completar el horario.
- Prueba manual con la app levantada y las cuentas de demo, cuando se haga la verificación de
  seguridad.
- La matriz 401/403/ownership se verifica en la fase de seguridad.
