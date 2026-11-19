# Matriz de trazabilidad HU → API → UI → tests

> **Fecha:** 2026-11-19
> **Uso:** ubicar rápido qué código y qué tests cubren cada HU antes de auditarla.
> **Nota:** la verificación de acceso (401/403/ownership) se completa en la auditoría de
> seguridad, al final de la iteración.

## Sprint 1

| HU | Backend | Frontend | Tests backend | Tests frontend |
| --- | --- | --- | --- | --- |
| VZ-13 Registrar evento | `EventoController.create`, `PropuestaService.create`, `EventoRequest` | `evento-nuevo-page.tsx`, `evento-form.tsx`, `components/evento-form/*` (fechas, horas, agenda, mapa), `schemas.ts` | `EventoControllerTest`, `PropuestaServiceTest` | `evento-nuevo-page.test.tsx`, `schemas.test.ts`, `evento-mapa.test.tsx`, `ubicacion-selector.test.tsx` |
| VZ-14 Modificar evento | `EventoController.update`, `PropuestaService.update`, `EventoMapper.updateEntity` | `evento-editar-page.tsx`, `evento-form.tsx`, `schemas.ts` | `EventoControllerTest`, `PropuestaServiceTest` | `evento-editar-page.test.tsx`, `schemas.test.ts` |
| VZ-15 Baja de evento | `EventoController.delete`, `PropuestaService.delete` | `evento-actions.tsx`, `evento-detail-page.tsx` | `EventoControllerTest`, `PropuestaServiceTest` | `evento-detail-page.test.tsx` |
| VZ-16 Consultar evento | `EventoController.findById`, `PropuestaService.findById` | `evento-detail-page.tsx` | `EventoControllerTest`, `PropuestaServiceTest` | `evento-detail-page.test.tsx` |
| VZ-17 Listar eventos | `EventoController.findAll`, `PropuestaService.findAll`, `PropuestaController`, `PublicadorController` | `eventos-page.tsx`, `publicador-detail-page.tsx`, `api/propuestas.ts`, `api/eventos.ts` | `EventoControllerTest`, `EventoRepositoryTest`, `PropuestaControllerTest` | `eventos-page.test.tsx`, `publicadores-page.test.tsx` |
| VZ-18 Agenda turística | `AgendaController.searchAgenda`, `PropuestaQueryService.searchAgenda`, `PropuestaSpecifications` | `agenda-page.tsx`, `api/agenda.ts` | `AgendaControllerTest`, `PropuestaRepositoryTest` | `agenda-page.test.tsx` |

## Sprint 2

| HU | Backend | Frontend | Tests backend | Tests frontend |
| --- | --- | --- | --- | --- |
| VZ-19 Registrar viaje | `ViajeController.create`, `ViajeService.create` | `planificador-page.tsx`, `api/viajes.ts` | `ViajeControllerTest`, `ViajeServiceTest` | `planificador-page.test.tsx` |
| VZ-21 Modificar viaje | `ViajeController.update`, `ViajeService.update` | `planificador-page.tsx`, `borradores-page.tsx` | `ViajeControllerTest`, `ViajeServiceTest` | `planificador-page.test.tsx`, `borradores-page.test.tsx` |
| VZ-22 Consultar viajes activos | `ViajeController.findAll`, `ViajeService.findAll` | `borradores-page.tsx`, `api/viajes.ts` | `ViajeControllerTest`, `ViajeRepositoryTest` | `borradores-page.test.tsx` |
| VZ-23 Baja de viaje | `ViajeController.delete`, `ViajeService.delete` | `borradores-page.tsx`, `viaje-borrador-card.tsx` | `ViajeControllerTest`, `ViajeServiceTest` | `borradores-page.test.tsx` |
| VZ-24 Guardar borrador | `ViajeController` de borradores, `ViajeService` | `planificador-page.tsx` | `ViajeControllerTest`, `ViajeServiceTest` | `planificador-page.test.tsx` |

## Sprint 3

| HU | Backend | Frontend | Tests backend | Tests frontend |
| --- | --- | --- | --- | --- |
| VZ-25 Generar circuito | `CircuitoController`, `CircuitoService`, `circuit/CircuitGenerator` | `planificador-page.tsx`, `api/circuitos.ts` | `CircuitoControllerTest`, `CircuitoServiceTest`, `CircuitGeneratorTest` | `planificador-page.test.tsx` |
| VZ-26 Consultar circuito | `CircuitoController.selectedDetail`, `CircuitoService.selectedDetail` | `circuito-page.tsx`, `circuito-view-model.ts` | `CircuitoControllerTest`, `CircuitoServiceTest` | `circuito-page.test.tsx`, `circuito-view-model.test.ts` |
| VZ-28 Reemplazar parada | `CircuitoController.replacementOptions`, `reemplazarItem` | `circuito-page.tsx`, `api/circuitos.ts` | `CircuitoControllerTest`, `CircuitoServiceTest` | `circuito-page.test.tsx` |
| VZ-29 Eliminar parada | `CircuitoController.eliminarItem` | `circuito-page.tsx`, `api/circuitos.ts` | `CircuitoControllerTest`, `CircuitoServiceTest` | `circuito-page.test.tsx` |
| VZ-30 Mapa del circuito | `CircuitoService.selectedDetail` | `circuito-page.tsx`, componentes de mapa | `CircuitoControllerTest`, `CircuitoServiceTest` | `circuito-page.test.tsx` |

## Sprint 4

| HU | Backend | Frontend | Tests backend | Tests frontend |
| --- | --- | --- | --- | --- |
| VZ-31 Registrar usuario | `UsuarioController.create`, `UsuarioService.create`, `AuthController` | `registro-page.tsx`, `api/auth.ts` | `UsuarioControllerTest`, `UsuarioServiceTest`, `AuthControllerTest` | `login-page.test.tsx` |
| VZ-34 Baja de usuario | `UsuarioController.baja`, `UsuarioService.darDeBaja` | `usuarios-page.tsx`, `usuario-baja-dialog.tsx` | `UsuarioControllerTest`, `UsuarioServiceTest` | — |
| VZ-131 Listar usuarios | `UsuarioController.findAll` | `usuarios-page.tsx`, `api/usuarios.ts` | `UsuarioControllerTest` | — |

## Riesgos de trazabilidad detectados

1. **VZ-17:** `eventos-page.tsx` consume `/api/propuestas` (eventos + actividades) y filtra en el
   cliente solo la página actual. Los 8 tests de `eventos-page.test.tsx` mockean `/api/eventos`.
2. **VZ-18:** el contrato de seguridad declara la agenda pública, pero el router la pone dentro
   de `RequireAuth`.
3. **Tests de controllers:** varios usan `addFilters = false`, así que no verifican 401/403 ni
   ownership. La verificación de seguridad queda para la fase final.
4. **Fallos frontend restantes:** `evento-detail-page` (3) y `circuito-page` (3) siguen en rojo y
   se abordan en VZ-15/VZ-16 y VZ-26/VZ-28/VZ-29 respectivamente.
