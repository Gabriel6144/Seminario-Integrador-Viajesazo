# Inventario de historias de usuario — auditoría y refinamiento

> **Fecha:** 2026-11-19
> **Rama:** `feature/seguridad-jwt-rbac-abac`
> **Fuente de HU:** lista canónica de Jira provista por el equipo (IDs y sprints).
> **Alcance:** análisis y refinamiento funcional de todas las HU, por sprints y por partes.
> **Fuera de alcance:** módulos nuevos sin HU de Jira (dashboard admin, panel/agenda del
> publicador, me gusta, notificaciones, inscriptos) y la auditoría de seguridad, que se hace al
> final.

## Cómo leer este documento

| Estado | Significado |
| --- | --- |
| Implementada | La funcionalidad existe en backend y frontend y tiene tests. |
| Parcial | Existe, pero hay CAs sin cubrir, contratos desalineados o tests en rojo. |
| Pendiente | Definida en Jira, sin implementación verificable. |
| Por verificar | Existe código, pero todavía no se auditó contra la HU. |

La seguridad ya está implementada en la rama (`JWT + RBAC/ABAC`), pero **no se audita en esta
fase**. Cada ficha de HU deja anotadas sus restricciones de acceso para verificarlas al final.

## Baseline de la Fase 0

| Suite | Resultado | Detalle |
| --- | --- | --- |
| Backend | 352 tests, 0 fallos | Verificado después del rediseño de VZ-13. |
| Frontend | 229 tests, 223 en verde | 6 fallos preexistentes: `evento-detail-page` 3 y `circuito-page` 3. |
| Compilación backend | Correcta al reintentar | El primer `clean test` falló en `testCompile` por un problema de incremental/OneDrive; el segundo compiló bien. |

Los fallos se van resolviendo dentro de la HU que corresponda, no como un bloque aparte.

## Sprint 1

| HU | Título | Estado | Observación inicial |
| --- | --- | --- | --- |
| VZ-13 | Registrar evento turístico | Implementada | Cerrada con acordeón de una sección, inputs visibles de fecha/hora, agenda en modal, acceso explícito y MapLibre completo. Ficha en `HU-VZ-13.md`. |
| VZ-14 | Modificar datos de un evento | Por verificar | Tests de `evento-editar-page` en rojo. |
| VZ-15 | Registrar baja de evento | Por verificar | Baja física con confirmación en UI. |
| VZ-16 | Consultar evento turístico | Parcial | Tests de detalle en rojo; contrato de 404 a verificar. |
| VZ-17 | Consultar eventos registrados | Parcial | La pantalla principal usa `/api/propuestas` y filtra solo la página actual; 8 tests rotos por endpoint. |
| VZ-18 | Consultar agenda turística | Por verificar | Contrato dice agenda pública, pero el router la exige autenticada. |

## Sprint 2

| HU | Título | Estado | Observación inicial |
| --- | --- | --- | --- |
| VZ-19 | Registrar viaje | Por verificar | Implementada; falta auditar CAs y ownership. |
| VZ-21 | Modificar viaje | Por verificar | Implementada. |
| VZ-22 | Consultar viajes activos | Por verificar | Implementada; el listado usa `?usuario=`. |
| VZ-23 | Registrar baja de viaje | Por verificar | Baja lógica con confirmación en UI. |
| VZ-24 | Guardar plantilla como borrador | Por verificar | Implementada en el planificador y los borradores. |

## Sprint 3

| HU | Título | Estado | Observación inicial |
| --- | --- | --- | --- |
| VZ-25 | Generar circuito turístico | Por verificar | Implementada con tres alternativas. |
| VZ-26 | Consultar circuito turístico | Por verificar | Implementada; access CAs a verificar al final. |
| VZ-28 | Reemplazar propuesta del circuito | Por verificar | Implementada. |
| VZ-29 | Eliminar propuesta del circuito | Por verificar | Implementada. |
| VZ-30 | Visualizar circuito en un mapa | Por verificar | Hay mapas en la UI; falta auditar los CAs completos. |

## Sprint 4

| HU | Título | Estado | Observación inicial |
| --- | --- | --- | --- |
| VZ-31 | Registrar usuario | Por verificar | Implementada con roles y BCrypt. |
| VZ-34 | Registrar baja del usuario | Por verificar | Implementada con baja lógica. |
| VZ-131 | Consultar listado de usuarios | Por verificar | Implementada para `ADMINISTRADOR`. |

## Módulos sin HU en la lista canónica

Dashboard del administrador, panel y agenda del publicador, me gusta, notificaciones e inscriptos
quedan **fuera de esta iteración** hasta que se incorporen como HU de Jira.

## Orden de trabajo

1. Sprint 1: VZ-13 → VZ-14 → VZ-15 → VZ-16 → VZ-17 → VZ-18.
2. Sprint 2: VZ-19 → VZ-21 → VZ-22 → VZ-23 → VZ-24.
3. Sprint 3: VZ-25 → VZ-26 → VZ-28 → VZ-29 → VZ-30.
4. Sprint 4: VZ-31 → VZ-34 → VZ-131.
5. Auditoría de seguridad y checklist P0/P1, al final.
