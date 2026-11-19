# Viajesazo — Seminario Integrador

API REST y cliente web para centralizar la información turística de la provincia de Córdoba
(Argentina) y generar itinerarios personalizados según fechas, preferencias y disponibilidad.

Sprint 1 completo (gestión de eventos y publicadores), Sprint 2 completo (gestión de viajes:
alta, edición, listado de activos y baja lógica) y Sprint 3 completo (agenda turística y
generación automática de circuitos).

## Estructura

Un solo repositorio con dos proyectos independientes:

| Carpeta | Qué es | Stack |
| --- | --- | --- |
| [`turismo-backend/`](./turismo-backend) | API REST | Java 17 (JDK 21 OK), Spring Boot 4.1.1, Spring Security (JWT), Spring Data JPA, H2, MapStruct, Maven |
| [`turismo-frontend/`](./turismo-frontend) | Cliente web | React 19, TypeScript, Vite, TanStack Query, React Hook Form + Zod, shadcn/ui, Vitest |

Cada proyecto tiene su propio `AGENTS.md` con las decisiones técnicas y las trampas de su
código. **Lelos antes de tocar cualquier cosa**: documentan por qué el código es como es, no
solo qué hace.

## Levantar

### 1. La API (puerto 8080)

```bash
cd turismo-backend
.\mvnw.cmd spring-boot:run          # Windows
./mvnw spring-boot:run               # Unix
```

Arranca con H2 en memoria y ejecuta `data.sql`, así que ya viene con **3 publicadores, 23 eventos
(8 con imagen), 2 actividades, 30 ubicaciones y 5 viajes** de ejemplo. El bloque VZ-25 agrega 15
propuestas futuras con fechas relativas para que los circuitos se puedan generar cualquier día.
El esquema se recrea en cada arranque (`create-drop`): lo que se carga o borra no sobrevive a un
reinicio.

### 2. El frontend (puerto 5173)

```bash
cd turismo-frontend
npm install
npm run dev
```

Queda en http://localhost:5173.

**El backend tiene que estar levantado primero**: el frontend no tiene datos propios, consume
la API. `vite.config.ts` hace proxy de `/api` a `http://localhost:8080`, así que el navegador
ve todo como same-origin y **no hace falta configurar CORS** en desarrollo. En producción hay
que poner un proxy inverso delante o habilitar CORS en el backend.

## Verificación

| | Comando | Qué corre |
| --- | --- | --- |
| Backend | `.\mvnw.cmd clean test` | 229 tests: 227 en verde y 2 fallos preexistentes por fechas fijas (JUnit 5, Mockito, `@WebMvcTest`, `@DataJpaTest`) |
| Frontend | `npm test` | 182 tests: 173 en verde y 9 fallos preexistentes de `eventos-page`/`evento-editar-page` (Vitest, Testing Library, MSW) |
| Frontend | `npm run typecheck` | TypeScript sin emitir |
| Frontend | `npm run lint` | oxlint |
| Frontend | `npm run build` | typecheck + build de producción |

La suite del frontend **no necesita la API levantada**: MSW intercepta todo con
`onUnhandledRequest: 'error'`, así que una request sin handler falla el test en vez de salir a
la red.

Usar siempre `clean test` en el backend, no `test` a secas: `target/test-classes/` puede quedar
con un `application.properties` viejo que opaca el de `main` y los tests corren con los
defaults de Spring Data en vez de la configuración del proyecto.

## Documentación

- [`turismo-backend/AGENTS.md`](./turismo-backend/AGENTS.md) — arquitectura por capas, las
  trampas de Spring Boot 4 / Jackson 3 / MapStruct, la base H2 y el manejo de errores.
- [`turismo-backend/PRUEBAS-MANUALES.md`](./turismo-backend/PRUEBAS-MANUALES.md) — curls de
  cada endpoint, casos de error medidos y bordes conocidos.
- [`turismo-frontend/AGENTS.md`](./turismo-frontend/AGENTS.md) — la forma de la `Page`
  anidada, el manejo de fechas y `LocalTime`, los formularios y las convenciones de shadcn.
- [`turismo-frontend/README.md`](./turismo-frontend/README.md) — detalle del cliente web.
- [`docs/SPRINT-1.md`](./docs/SPRINT-1.md) — as-built del Sprint 1: endpoints, modelo y las
  decisiones de eventos/publicadores con su justificación.
- [`docs/OPENSTREETMAP.md`](./docs/OPENSTREETMAP.md) — cómo se resuelven las coordenadas con
  Nominatim: búsqueda, reverse, dedup de la query y el caso real del 400.
- [`docs/CIRCUITOS-AUTOMATICOS.md`](./docs/CIRCUITOS-AUTOMATICOS.md) — generación, selección
  única, ventana horaria, snapshot y la trampa de orden de los ítems.
- [`docs/PRUEBAS-MANUALES-POSTMAN.md`](./docs/PRUEBAS-MANUALES-POSTMAN.md) — flujo completo de
  viajes y circuitos para probar desde Postman.
- [`docs/seguridad/AUTENTICACION-Y-AUTORIZACION.md`](./docs/seguridad/AUTENTICACION-Y-AUTORIZACION.md)
  — JWT, roles, ownership y procedimiento de asignación de `PUBLICADOR`/`ADMINISTRADOR`.

## Estado y limitaciones conocidas

- **Hay autenticación propia** (email + password, JWT access + refresh opaco en cookie HttpOnly,
  RBAC multi-rol y ABAC por ownership). Detalle en
  [`docs/seguridad/AUTENTICACION-Y-AUTORIZACION.md`](./docs/seguridad/AUTENTICACION-Y-AUTORIZACION.md).
  Credenciales del seed **no** van en este README.
- **Lecturas del catálogo** (agenda, eventos, propuestas, publicadores) siguen públicas; las
  escrituras y los viajes requieren sesión.
- **Los viajes pertenecen al usuario autenticado** (`Viaje.usuario` → `@ManyToOne Usuario`). El
  administrador **no** tiene bypass sobre viajes ajenos.
- **Los publicadores solo se dan de alta** (solo `ADMINISTRADOR`): la API no expone `PUT` ni
  `DELETE` para ellos.
- El selector de publicadores del formulario pide `?size=100`, que es el tope configurado en el
  backend. Con más de 100 publicadores hay que agregarle búsqueda o paginación.
- El mensaje de email duplicado confirma si un email está registrado (enumeración). Mejorable a
  un 409 genérico.
- Los datos de H2 son efímeros. Para una demo con datos cargados hay que sembrar por script o
  cambiar a `jdbc:h2:file:./data/turismo` con `ddl-auto=update`.

## Sprints siguientes

`Preferencia` y la edición manual de circuitos (VZ-27). La generación y selección de circuitos ya
existe (VZ-25), con distancias estimadas por Haversine; regenerar, reordenar paradas o editar el
itinerario todavía no. La baja de eventos es física, así que cuando exista un itinerario editable
hay que decidir si el `DELETE` valida los circuitos asociados: hoy no lo hace y dejaría
referencias colgantes.
